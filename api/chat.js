export default async function handler(req, res) {
  // 1. CONFIGURAZIONE SERVER E HEADERS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Funzione di risposta sicura (Fallback)
  const sendSafeResponse = (msg, mode="mixed", options=[]) => res.status(200).json({
      step_id: "response", message: msg, mode, options: options.length > 0 ? options : [{ key: "continue", label: "Continue" }]
  });

  try {
    const { choice, history = [], attachment = null, contextData = null } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!geminiKey) return sendSafeResponse("Error: Missing Gemini API Key.");

    let systemContextInjection = "";
    
    // =================================================================================
    // FASE 0: SNAPSHOT AUTOMATICO (Step 2 del PDF)
    // "Before meaningful interaction, the agent silently builds context"
    // =================================================================================
    if (choice === "SNAPSHOT_INIT" && contextData && tavilyKey) {
        console.log("Generating Snapshot for:", contextData.website);
        const query = `Analyze ${contextData.website} and ${contextData.linkedin || ''}. 
        EXTRACT STRICTLY: 
        1. Exact Value Proposition
        2. Target Audience (ICP)
        3. Pricing Model (SaaS/Service/Marketplace)
        4. Est. Headcount & Stage`;
        
        try {
            const searchResp = await fetch("https://api.tavily.com/search", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: tavilyKey, query: query, search_depth: "basic", max_results: 2 })
            });
            const searchData = await searchResp.json();
            if (searchData.results) {
                const rawSnapshot = searchData.results.map(r => r.content).join('\n');
                // Iniettiamo questo contesto "segreto" nel prompt di sistema
                systemContextInjection = `\n[SYSTEM - DIGITAL SNAPSHOT ACQUIRED: ${rawSnapshot}. 
                INSTRUCTION: Use this to PRE-FILL the KYC checklist. 
                Do NOT ask for info you already found. Demonstrate authority by citing their business model.]\n`;
            }
        } catch(e) { console.error("Snapshot failed", e); }
    }

    // =================================================================================
    // IL CERVELLO: PROTOCOLLO OPERATIVO COMPLETO (Steps 3, 4, 5)
    // =================================================================================
    const SYSTEM_PROMPT = `
    ROLE: You are the "Revenue Diagnostic Agent" (Senior RevOps Architect).
    GOAL: Surface 1-2 real revenue constraints. Force trade-offs. Guide to paid session.
    
    YOU ARE A STRICT STATE MACHINE. FOLLOW THIS LOGIC SEQUENCE:

    --- PHASE 1: ANCHOR & AUTHORITY (Turn 0) ---
    - Action: Acknowledge the user's business model from the Snapshot.
    - Output: "I see you are a [Segment] company targeting [ICP]. Let's audit your revenue engine."

    --- PHASE 2: STRUCTURED KYC CHECKPOINT (Turns 1-5) ---
    - REFERENCE: Step 3 of Operating Instructions.
    - TASK: Fill your Mental Checklist. Ask ONE missing item at a time.
      [ ] Stage (Pre-seed, Seed, Series A, Scale-up)
      [ ] ARR Range (<$1M, $1-5M, $5-20M, $20M+)
      [ ] Sales Motion (Founder-led, Sales-led, PLG)
      [ ] Team Structure (Solo, Pods, Siloed Depts)
      [ ] Primary Constraint Area (Leads, Conversion, Retention)
    - RULE: Use BUTTONS for all standard inputs.

    --- PHASE 3: NARROW INTENT (Turns 6-10) ---
    - REFERENCE: Step 4 of Operating Instructions.
    - TASK: Use "Binary Search Logic" to find the Root Cause.
      - If Leads -> Volume vs Quality? -> Channel vs Messaging?
      - If Conversion -> Process vs Execution? -> Tech vs Skill?
    - RULE: Force Trade-offs. (e.g. "Do you want speed or quality? You can't have both.")

    --- PHASE 4: SUFFICIENCY CHECK (Step 5 - CRITICAL) ---
    - TRIGGER: You have identified the Bottleneck.
    - CHECK: Do you have enough signal to estimate IMPACT?
      - YES -> Move to PHASE 5.
      - NO -> Ask ONE FINAL CLARIFYING QUESTION (e.g., "To estimate the loss, what is your avg deal size?").
    - FAILSAFE: If user doesn't know, use Benchmarks.

    --- PHASE 5: REPORT GENERATION (Turn 12+) ---
    - Action: Close session.
    - Output JSON: step_id: "FINISH".

    --- CRITICAL OUTPUT SCHEMA ---
    1. Respond ONLY with valid JSON.
    2. STRUCTURE: 
       {
         "step_id": "string", 
         "message": "string (Professional, Surgical, <30 words)", 
         "mode": "mixed", 
         "options": [{"key": "short_id", "label": "Punchy Label (<5 words)"}]
       }
    3. OPTIONS RULE: Always provide 3-5 distinct options (unless Asking Final Question).
    4. NO CHIT-CHAT. Be a rigorous consultant.
    `;

    // ------------------------------------------------------------------
    // COSTRUZIONE DEL CONTESTO (Storia Chat)
    // ------------------------------------------------------------------
    const historyParts = history.slice(-14).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // Costruzione messaggio utente con istruzioni di stato
    const userText = choice === "SNAPSHOT_INIT" 
        ? `[SYSTEM START: User Context -> Website: ${contextData.website}. LinkedIn: ${contextData.linkedin}. 
           ACTION: Analyze Snapshot. Welcome user. Start KYC Checklist.]`
        : `User input: "${choice}". 
           ACTION: Update state. If KYC done, Narrow Intent. If Narrowing done, Check Signal Sufficiency. If Signal Sufficient, FINISH. Respond in JSON.`;

    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT + systemContextInjection }] },
        ...historyParts,
        { role: 'user', parts: [{ text: userText }] }
    ];
    
    // Gestione Allegati (File Upload)
    if (attachment) {
        allMessages[allMessages.length-1].parts.push({ 
            inline_data: { mime_type: attachment.mime_type, data: attachment.data } 
        });
    }

    // ------------------------------------------------------------------
    // CHIAMATA A GEMINI (Temperature 0.1 per massimo rigore)
    // ------------------------------------------------------------------
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: allMessages, generationConfig: { temperature: 0.1 } })
    });

    const data = await response.json();
    if (data.error) return sendSafeResponse(`Error: ${data.error.message}`);
    
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return sendSafeResponse("AI no response.");
    
    // Pulizia Output JSON
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const jsonResponse = JSON.parse(text);
      
      // --- SAFEGUARDS (Codice Anti-Crash) ---
      
      // 1. Assicura che ci sia un messaggio
      if (!jsonResponse.message) jsonResponse.message = "Signal received. Proceeding to next step.";
      
      // 2. Assicura che ci siano opzioni (tranne alla fine)
      if ((!jsonResponse.options || jsonResponse.options.length === 0) && jsonResponse.step_id !== 'FINISH') {
          // Se l'AI chiede un input libero (es. Step 5 Final Question), diamo opzioni di default
          jsonResponse.options = [
              { key: "details", label: "I will type the details" },
              { key: "skip", label: "I don't know (Use Benchmarks)" }
          ];
      } else if (jsonResponse.options) {
          // 3. Normalizza le label (evita "undefined")
          jsonResponse.options = jsonResponse.options.map(opt => ({
              key: opt.key, 
              label: opt.label || opt.text || opt.key
          }));
      }

      // 4. Forza modalità mista per permettere input libero
      if (jsonResponse.step_id !== 'FINISH') jsonResponse.mode = 'mixed';
      
      return res.status(200).json(jsonResponse);

    } catch (e) { 
        // Fallback se il JSON è rotto
        return sendSafeResponse(text, "mixed"); 
    }

  } catch (error) { 
      return sendSafeResponse(`Server Error: ${error.message}`); 
  }
}
