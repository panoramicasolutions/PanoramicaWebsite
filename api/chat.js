export default async function handler(req, res) {
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
    
    // --- STEP 2: SNAPSHOT (Analisi Silenziosa Web/LinkedIn) ---
    // Come da PDF: "Before meaningful interaction, the agent silently builds context" 
    if (choice === "SNAPSHOT_INIT" && contextData && tavilyKey) {
        console.log("Generating Snapshot for:", contextData.website);
        const query = `Analyze ${contextData.website} and ${contextData.linkedin || ''}. Extract: Exact Value Proposition, ICP (Target Audience), Pricing Model (SaaS/Service), Est. Company Size.`;
        try {
            const searchResp = await fetch("https://api.tavily.com/search", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: tavilyKey, query: query, search_depth: "basic", max_results: 2 })
            });
            const searchData = await searchResp.json();
            if (searchData.results) {
                const rawSnapshot = searchData.results.map(r => r.content).join('\n');
                systemContextInjection = `\n[SYSTEM DATA - DIGITAL FOOTPRINT: ${rawSnapshot}. Use this to demonstrate authority. DO NOT ask questions answered here.]\n`;
            }
        } catch(e) { console.error("Snapshot failed", e); }
    }

    // --- SYSTEM PROMPT (IL CERVELLO AGGIORNATO) ---
    const SYSTEM_PROMPT = `
    ROLE: You are the "Revenue Diagnostic Agent" (Senior RevOps Architect).
    GOAL: Surface 1-2 real revenue constraints. Force trade-offs. Guide to paid session.
    
    You operate on a strict 4-Phase State Machine. Do not deviate.

    --- INTERNAL LOGIC & STATE MACHINE ---

    PHASE 1: ANCHOR & AUTHORITY (Turn 0)
    - Trigger: Start of session.
    - Action: Acknowledge the user's business model based on the Snapshot. Show you did your homework.
    - Output: "I see you are a [Segment] company targeting [ICP]. Let's audit your revenue engine."
    
    PHASE 2: STRUCTURED KYC (Turns 1-5) - "Checkpoint, not a conversation" 
    - Trigger: Missing critical metrics.
    - INSTRUCTION: You MUST fill this mental checklist. Ask ONE missing item at a time using BUTTONS.
      [ ] Stage (Pre-seed, Seed, Series A, Scale-up)
      [ ] ARR Range (<$1M, $1-5M, $5-20M, $20M+)
      [ ] Sales Motion (Founder-led, Sales-led, PLG, Partner)
      [ ] Team Structure (Solo, Pods, Specialized Depts)
      [ ] Primary Constraint (Leads, Conversion, Retention, Hiring)
    - Logic: If Snapshot says they are huge, don't ask "Are you pre-seed?". Verify instead.
    
    PHASE 3: NARROW INTENT (Turns 6-12) - "Guide, not explore" 
    - Trigger: KYC Checklist complete.
    - INSTRUCTION: Use "Binary Search" logic to find the Root Cause.
      1. Hypothesis: "Is it Volume (Leads) or Efficiency (Conversion)?"
      2. Drill Down: If Leads -> "Is it Inbound quality or Outbound volume?"
      3. Drill Down: If Conversion -> "Is it Process adherence or Rep skill?"
      4. Drill Down: If Process -> "Is it Tooling (CRM) or Enablement?"
    - Rule: ONE question at a time.
    - Rule: 90% Buttons. Free text ONLY for describing specific symptoms.
    
    PHASE 4: REPORT SIGNAL (Turn 12+)
    - Trigger: You have identified the Bottleneck and Root Cause.
    - Action: Close session.
    - Output JSON: step_id: "FINISH".
    
    --- OUTPUT RULES ---
    1. Respond ONLY with valid JSON.
    2. STRICT SCHEMA: 
       {
         "step_id": "string", 
         "message": "string (Short, professional, direct)", 
         "mode": "mixed", 
         "options": [{"key": "short_id", "label": "Punchy Label (<5 words)"}]
       }
    3. ALWAYS provide 3-5 distinct options for KYC/Narrowing.
    4. Never be generic. Be surgical.
    `;

    // Preparazione della storia
    const historyParts = history.slice(-12).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // Costruzione del messaggio utente
    // Se è SNAPSHOT_INIT, diamo istruzioni speciali nascoste per l'avvio
    const userText = choice === "SNAPSHOT_INIT" 
        ? `[SYSTEM START: User Context -> Website: ${contextData.website}. LinkedIn: ${contextData.linkedin}. 
           ACTION: Analyze Snapshot. Welcome the user by defining their business. Then ask the first MISSING item from the KYC Checklist (usually ARR or Stage).]`
        : `User input: "${choice}". 
           ACTION: Update your internal checklist. If KYC is done, move to Narrow Intent (Phase 3). Respond in JSON.`;

    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT + systemContextInjection }] },
        ...historyParts,
        { role: 'user', parts: [{ text: userText }] }
    ];
    
    if (attachment) allMessages[allMessages.length-1].parts.push({ inline_data: { mime_type: attachment.mime_type, data: attachment.data } });

    // Chiamata a Gemini 1.5 Flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: allMessages, generationConfig: { temperature: 0.1 } }) // Temperature bassa = Più rigore
    });

    const data = await response.json();
    if (data.error) return sendSafeResponse(`Error: ${data.error.message}`);
    
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return sendSafeResponse("AI no response.");
    
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const jsonResponse = JSON.parse(text);
      
      // Safety Checks
      if (!jsonResponse.message) jsonResponse.message = "Analysis update. Proceeding to next verification.";
      
      // Se l'AI dimentica i bottoni (succede raramente con temp 0.1, ma stiamo sicuri)
      if ((!jsonResponse.options || jsonResponse.options.length === 0) && jsonResponse.step_id !== 'FINISH') {
          jsonResponse.options = [{ key: "next", label: "Continue" }];
      } else if (jsonResponse.options) {
          // Normalizziamo le label per evitare "undefined"
          jsonResponse.options = jsonResponse.options.map(opt => ({
              key: opt.key,
              label: opt.label || opt.text || opt.key
          }));
      }

      if (jsonResponse.step_id !== 'FINISH') jsonResponse.mode = 'mixed';
      return res.status(200).json(jsonResponse);

    } catch (e) { return sendSafeResponse(text, "mixed"); }

  } catch (error) { return sendSafeResponse(`Server Error: ${error.message}`); }
}
