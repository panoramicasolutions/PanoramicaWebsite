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

    // --- SYSTEM PROMPT (PROTOCOL KYC RIGOROSO) ---
    const SYSTEM_PROMPT = `
    ROLE: "Revenue Diagnostic Agent". 
    GOAL: Reduce uncertainty. Surface 1-2 real revenue constraints. Guide to paid session.
    
    PROTOCOL:
    
    PHASE 1: SNAPSHOT (Turn 0)
    - If you have snapshot data, acknowledge the user's business model immediately to build trust.
    
    PHASE 2: STRUCTURED KYC (Turns 1-6)
    - This is a CHECKPOINT, not a conversation. Be chirurgical.
    - GOAL: Collect the following MISSING inputs (skip what you already know from Snapshot):
      1. Company Stage (Pre-seed, Seed, Series A, Bootstrapped)
      2. Current ARR Range (<$1M, $1-5M, $5-20M, $20M+)
      3. Primary Sales Motion (Founder-led, PLG, Sales-led, Hybrid)
      4. Team Structure (Solo, Small Team, VP of Sales + Reps, Siloed Depts)
      5. Primary Constraint (Leads, Close Rate, Retention, hiring)
    - RULE: Ask ONE key question at a time.
    - RULE: BUTTONS BY DEFAULT. Only allow free text if absolutely necessary.
    
    PHASE 3: NARROW INTENT (Turns 7-12)
    - Drill down into the specific constraint identified in KYC.
    - Ask about: Tooling maturity, ICP clarity, recent changes (last 90 days).
    
    PHASE 4: REPORT (Turn 12+)
    - Close with step_id: "FINISH".
    
    CRITICAL OUTPUT RULES:
    1. Respond ONLY with valid JSON.
    2. STRICT SCHEMA: 
       {
         "step_id": "string", 
         "message": "string", 
         "mode": "mixed", 
         "options": [{"key": "short_id", "label": "Text displayed on button"}]
       }
    3. "label" MUST be short and punchy.
    4. ALWAYS provide 3-5 options for KYC questions.
    `;

    const historyParts = history.slice(-10).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const userText = choice === "SNAPSHOT_INIT" 
        ? `[SYSTEM: User submitted Context Form. Website: ${contextData.website}. LinkedIn: ${contextData.linkedin}. Generate the FIRST welcome message. Then immediately start the KYC checklist with the most important missing metric (usually Stage or ARR).]`
        : `User input: "${choice}". Respond in JSON. Continue the KYC checklist or Narrow Intent.`;

    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT + systemContextInjection }] },
        ...historyParts,
        { role: 'user', parts: [{ text: userText }] }
    ];
    
    if (attachment) allMessages[allMessages.length-1].parts.push({ inline_data: { mime_type: attachment.mime_type, data: attachment.data } });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
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
