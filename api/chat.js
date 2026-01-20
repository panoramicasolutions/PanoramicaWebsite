export default async function handler(req, res) {
  // 1. CONFIGURAZIONE SERVER
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sendSafeResponse = (msg, mode="mixed", options=[]) => res.status(200).json({
      step_id: "response", message: msg, mode, options: options.length > 0 ? options : [{ key: "continue", label: "Continue" }]
  });

  try {
    const { choice, history = [], attachment = null, contextData = null } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!geminiKey) return sendSafeResponse("Error: Missing Gemini API Key.");

    let systemContextInjection = "";
    
    // ------------------------------------------------------------------
    // FASE 0: SNAPSHOT (Analisi Silenziosa - Step 2 del PDF)
    // ------------------------------------------------------------------
    // Se è l'inizio, usiamo Tavily per creare il "Company Snapshot"
    if (choice === "SNAPSHOT_INIT" && contextData && tavilyKey) {
        console.log("Generating Snapshot for:", contextData.website);
        const query = `Analyze ${contextData.website} and ${contextData.linkedin || ''}. 
        EXTRACT STRICTLY: 
        1. Exact Value Proposition (What do they sell?)
        2. ICP (Who buys?)
        3. Pricing Model (SaaS, Service, Marketplace?)
        4. Est. Company Size (Headcount)`;
        
        try {
            const searchResp = await fetch("https://api.tavily.com/search", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: tavilyKey, query: query, search_depth: "basic", max_results: 2 })
            });
            const searchData = await searchResp.json();
            if (searchData.results) {
                const rawSnapshot = searchData.results.map(r => r.content).join('\n');
                systemContextInjection = `\n[SYSTEM - DIGITAL SNAPSHOT ACQUIRED: ${rawSnapshot}. 
                INSTRUCTION: Use this data to PRE-FILL the KYC checklist. 
                DO NOT ask the user for info you already found (e.g., if you know they are SaaS, don't ask business model).
                START by acknowledging their specific business context to build authority.]\n`;
            }
        } catch(e) { console.error("Snapshot failed", e); }
    }

    // ------------------------------------------------------------------
    // PROTOCOLLO DI DIAGNOSI (Il "Cervello" del Consulente)
    // ------------------------------------------------------------------
    const SYSTEM_PROMPT = `
    ROLE: You are the "Revenue Diagnostic Agent" (Senior RevOps Architect).
    GOAL: Reduce uncertainty. Surface 1-2 real revenue constraints. Force trade-offs. Guide to paid session.
    
    YOU ARE A STATE MACHINE. FOLLOW THIS LOGIC STRICTLY:

    --- PHASE 1: ANCHOR & AUTHORITY (Turn 0) ---
    - Trigger: Session Start.
    - Action: Acknowledge the user's business model based on the Snapshot.
    - Output: "I see you are a [Segment] company targeting [ICP]. Let's audit your revenue engine."

    --- PHASE 2: STRUCTURED KYC CHECKPOINT (Turns 1-5) ---
    - CONCEPT: "KYC is a checkpoint, not a conversation."
    - TASK: You have a MENTAL CHECKLIST. You must fill it before moving on.
      [ ] Stage (Pre-seed, Seed, Series A, Bootstrapped)
      [ ] ARR Range (<$1M, $1-5M, $5-20M, $20M+)
      [ ] Sales Motion (Founder-led, Sales-led, PLG, Partner)
      [ ] Team Structure (Solo, Small Pod, VP+Reps, Siloed Depts)
      [ ] Primary Constraint Area (Leads, Conversion, Retention, Hiring)
    - RULE: Ask for ONE missing item at a time.
    - RULE: If Snapshot provided the answer, MARK IT AS DONE silently.
    - RULE: Use BUTTONS for all standard answers.

    --- PHASE 3: NARROW INTENT (Turns 6-12) ---
    - CONCEPT: "Guide, not explore."
    - STRATEGY: Use "Binary Search Logic" to isolate the Root Cause.
      
      IF Constraint == LEADS:
         > Ask: "Is it Volume (not enough) or Quality (bad fit)?"
         > If Quality: "Is it ICP definition or Channel targeting?"
      
      IF Constraint == CONVERSION (Sales):
         > Ask: "Is it Process (no defined steps) or Execution (reps not following it)?"
         > If Execution: "Is it Skill gap or Tech friction?"
      
      IF Constraint == RETENTION:
         > Ask: "Is it Onboarding (First 90 days) or Long-term Value?"
         
    - RULE: Force Trade-offs. (e.g., "Do you want faster growth or higher efficiency? You can't have both right now.")
    - RULE: Free text ONLY to describe specific symptoms ("Describe the bottleneck").

    --- PHASE 4: REPORT SIGNAL (Turn 12+) ---
    - Trigger: You have isolated the Root Cause and Impact.
    - Action: Close session.
    - Output JSON: step_id: "FINISH".

    --- CRITICAL OUTPUT SCHEMA ---
    1. Respond ONLY with valid JSON.
    2. STRUCTURE: 
       {
         "step_id": "string", 
         "message": "string (Professional, Surgical, Direct)", 
         "mode": "mixed", 
         "options": [{"key": "short_id", "label": "Punchy Label (<5 words)"}]
       }
    3. OPTIONS RULE: Always provide 3-5 distinct options for KYC/Narrowing.
    4. NO CHIT-CHAT. Be a rigorous consultant.
    `;

    // ------------------------------------------------------------------
    // COSTRUZIONE STORIA E CONTESTO
    // ------------------------------------------------------------------
    const historyParts = history.slice(-12).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // Gestione input iniziale speciale (Snapshot)
    const userText = choice === "SNAPSHOT_INIT" 
        ? `[SYSTEM START: User Context -> Website: ${contextData.website}. LinkedIn: ${contextData.linkedin}. 
           ACTION: Analyze Snapshot. Welcome the user by defining their business. Then check your KYC Checklist and ask the first MISSING item (usually ARR or Stage).]`
        : `User input: "${choice}". 
           ACTION: Update internal state. If KYC Checklist is incomplete, ask next missing item. If complete, run Binary Search Diagnostic (Phase 3). Respond in JSON.`;

    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT + systemContextInjection }] },
        ...historyParts,
        { role: 'user', parts: [{ text: userText }] }
    ];
    
    // Aggiunta allegato se presente
    if (attachment) allMessages[allMessages.length-1].parts.push({ inline_data: { mime_type: attachment.mime_type, data: attachment.data } });

    // ------------------------------------------------------------------
    // CHIAMATA AI (Gemini 1.5 Flash)
    // ------------------------------------------------------------------
    // Temperature 0.1 per massimo rigore e aderenza alle istruzioni
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: allMessages, generationConfig: { temperature: 0.1 } })
    });

    const data = await response.json();
    if (data.error) return sendSafeResponse(`Error: ${data.error.message}`);
    
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return sendSafeResponse("AI no response.");
    
    // Pulizia JSON
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const jsonResponse = JSON.parse(text);
      
      // --- SAFEGUARDS (Protezione Errori) ---
      
      // 1. Se manca il messaggio, mettiamo un default
      if (!jsonResponse.message) jsonResponse.message = "Analysis update. Let's proceed.";
      
      // 2. Se mancano le opzioni in fase attiva, generiamo fallback intelligenti
      if ((!jsonResponse.options || jsonResponse.options.length === 0) && jsonResponse.step_id !== 'FINISH') {
          // Fallback generico
          jsonResponse.options = [
              { key: "continue", label: "Continue" },
              { key: "explain", label: "Explain more" }
          ];
      } else if (jsonResponse.options) {
          // 3. Normalizzazione Label (Fix per "undefined" buttons)
          jsonResponse.options = jsonResponse.options.map(opt => ({
              key: opt.key,
              label: opt.label || opt.text || opt.key // Usa key se label manca
          }));
      }

      // 4. Modalità sempre mixed (tranne alla fine)
      if (jsonResponse.step_id !== 'FINISH') jsonResponse.mode = 'mixed';
      
      return res.status(200).json(jsonResponse);

    } catch (e) { return sendSafeResponse(text, "mixed"); }

  } catch (error) { return sendSafeResponse(`Server Error: ${error.message}`); }
}
