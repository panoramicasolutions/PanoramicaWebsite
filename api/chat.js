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
    
    // --- STEP 2 PDF: COMPANY SNAPSHOT ---
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
                systemContextInjection = `\n[SYSTEM: SNAPSHOT DATA: ${rawSnapshot}. I will use this to skip basic questions.]\n`;
            }
        } catch(e) { console.error("Snapshot failed", e); }
    }

    // --- SYSTEM PROMPT (PROTOCOL & SCHEMA RIGOROSO) ---
    const SYSTEM_PROMPT = `
    ROLE: "Revenue Diagnostic Agent". 
    GOAL: Reduce uncertainty. Surface 1-2 real revenue constraints. Guide to paid session.
    
    PROTOCOL:
    1. SNAPSHOT PHASE: If you have snapshot data, start by confirming the user's business model to show authority.
    2. KYC CHECKPOINT: Verify missing pieces (Buttons).
    3. NARROW INTENT: Drill down into ONE constraint.
    4. REPORT: Close with step_id: "FINISH".
    
    CRITICAL OUTPUT RULES:
    1. Respond ONLY with valid JSON.
    2. STRICT SCHEMA: 
       {
         "step_id": "string", 
         "message": "string", 
         "mode": "mixed", 
         "options": [{"key": "short_id", "label": "Text displayed on button"}]
       }
    3. "label" MUST be a short, clear string. NEVER omit "label".
    4. Always provide 3-4 options.
    `;

    const historyParts = history.slice(-10).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const userText = choice === "SNAPSHOT_INIT" 
        ? `[SYSTEM: User submitted Context Form. Website: ${contextData.website}. LinkedIn: ${contextData.linkedin}. Generate the FIRST welcome message demonstrating you know their business. Use the Schema with "label" for buttons.]`
        : `User input: "${choice}". Respond in JSON with "label" for options.`;

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
      
      if (!jsonResponse.message) {
          jsonResponse.message = "I have analyzed your input. Let's proceed to the next step.";
      }

      // Fix options mancanti
      if ((!jsonResponse.options || jsonResponse.options.length === 0) && jsonResponse.step_id !== 'FINISH') {
          jsonResponse.options = [{ key: "next", label: "Continue" }, { key: "details", label: "Add Details" }];
      } else if (jsonResponse.options) {
          // Fix label undefined: se manca label, usa key o text
          jsonResponse.options = jsonResponse.options.map(opt => ({
              key: opt.key,
              label: opt.label || opt.text || opt.value || opt.key // Fallback di sicurezza
          }));
      }

      if (jsonResponse.step_id !== 'FINISH') jsonResponse.mode = 'mixed';
      return res.status(200).json(jsonResponse);
    } catch (e) { return sendSafeResponse(text, "mixed"); }

  } catch (error) { return sendSafeResponse(`Server Error: ${error.message}`); }
}
