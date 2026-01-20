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
    
    // --- STEP 1: SNAPSHOT (Analisi Silenziosa) ---
    if (choice === "SNAPSHOT_INIT" && contextData && tavilyKey) {
        console.log("Generating Snapshot for:", contextData.website);
        const query = `Analyze ${contextData.website} and ${contextData.linkedin || ''}. Extract: Value Proposition, ICP, Pricing Model, Company Size.`;
        try {
            const searchResp = await fetch("https://api.tavily.com/search", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: tavilyKey, query: query, search_depth: "basic", max_results: 2 })
            });
            const searchData = await searchResp.json();
            if (searchData.results) {
                const rawSnapshot = searchData.results.map(r => r.content).join('\n');
                systemContextInjection = `\n[SYSTEM: DIGITAL FOOTPRINT SNAPSHOT: ${rawSnapshot}. Use this to skip obvious questions.]\n`;
            }
        } catch(e) { console.error("Snapshot failed", e); }
    }

    // --- SYSTEM PROMPT (STEP 4: NARROW INTENT) ---
    const SYSTEM_PROMPT = `
    ROLE: "Revenue Diagnostic Agent" (Senior Consultant).
    GOAL: Surface 1-2 real revenue constraints. Guide to paid session.
    
    PROTOCOL:
    
    PHASE 1: SNAPSHOT (Turn 0)
    - Acknowledge the user's business model immediately based on the digital footprint analysis.
    
    PHASE 2: STRUCTURED KYC (Turns 1-5)
    - Checkpoint. Collect MISSING Core Inputs: Stage, ARR Range, Sales Motion, Team Structure.
    - BUTTONS only. Fast.
    
    PHASE 3: NARROW INTENT (Step 4 - Turns 6-12)
    - MISSION: Guide, don't explore. Narrow down to the single biggest bottleneck.
    - STRATEGY: Use "Diagnostic Logic" (Binary Search).
      - Ask: "Is the pain in Lead Gen or Closing?" -> User picks "Leads".
      - Ask: "Is it Volume or Quality?" -> User picks "Quality".
      - Ask: "Is it ICP definition or Channel fit?" -> ...
    - RULE: One question at a time.
    - RULE: Button-led. Use Free Text ONLY for describing symptoms ("Describe the issue").
    - TONE: Professional, surgical, guiding. User must feel progress, not interrogation.
    
    PHASE 4: REPORT (Turn 12+)
    - Once you have isolated the Root Cause, close with step_id: "FINISH".
    
    CRITICAL OUTPUT RULES:
    1. Respond ONLY with valid JSON.
    2. STRICT SCHEMA: 
       {
         "step_id": "string", 
         "message": "string", 
         "mode": "mixed", 
         "options": [{"key": "short_id", "label": "Text displayed on button"}]
       }
    3. Labels must be short (< 5 words).
    4. Provide 2-4 distinct options that FORCE a choice (Trade-offs).
    `;

    const historyParts = history.slice(-12).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const userText = choice === "SNAPSHOT_INIT" 
        ? `[SYSTEM: User submitted Context Form. Website: ${contextData.website}. LinkedIn: ${contextData.linkedin}. Generate the FIRST welcome message. Then immediately start the KYC checklist.]`
        : `User input: "${choice}". Respond in JSON. If in Phase 3, narrow down the constraint.`;

    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT + systemContextInjection }] },
        ...historyParts,
        { role: 'user', parts: [{ text: userText }] }
    ];
    
    if (attachment) allMessages[allMessages.length-1].parts.push({ inline_data: { mime_type: attachment.mime_type, data: attachment.data } });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: allMessages, generationConfig: { temperature: 0.2 } })
    });

    const data = await response.json();
    if (data.error) return sendSafeResponse(`Error: ${data.error.message}`);
    
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return sendSafeResponse("AI no response.");
    
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const jsonResponse = JSON.parse(text);
      
      if (!jsonResponse.message) jsonResponse.message = "Let's proceed.";

      // Fallback opzioni se l'AI dimentica di metterle
      if ((!jsonResponse.options || jsonResponse.options.length === 0) && jsonResponse.step_id !== 'FINISH') {
          jsonResponse.options = [{ key: "continue", label: "Continue" }];
      } else if (jsonResponse.options) {
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
