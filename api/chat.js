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
    // Se siamo all'inizio (SNAPSHOT_INIT), analizziamo i dati del form
    if (choice === "SNAPSHOT_INIT" && contextData && tavilyKey) {
        console.log("Generating Snapshot for:", contextData.website);
        
        // 1. Tavily scansiona il sito e LinkedIn
        const query = `Analyze ${contextData.website} and ${contextData.linkedin || ''}. Extract: Value Proposition, ICP, Pricing Model, Company Size.`;
        try {
            const searchResp = await fetch("https://api.tavily.com/search", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: tavilyKey, query: query, search_depth: "basic", max_results: 2 })
            });
            const searchData = await searchResp.json();
            
            // 2. Creiamo lo Snapshot invisibile
            if (searchData.results) {
                const rawSnapshot = searchData.results.map(r => r.content).join('\n');
                systemContextInjection = `\n[SYSTEM: I have analyzed the user's digital footprint. SNAPSHOT DATA: ${rawSnapshot}. I will use this to skip basic questions and demonstrate competence immediately.]\n`;
            }
        } catch(e) { console.error("Snapshot failed", e); }
    }

    // --- SYSTEM PROMPT (PROTOCOL) ---
    const SYSTEM_PROMPT = `
    ROLE: "Revenue Diagnostic Agent". 
    GOAL: Reduce uncertainty. Surface 1-2 real revenue constraints. Guide to paid session.
    
    PROTOCOL:
    1. SNAPSHOT PHASE (Done silently): You have just analyzed the user's website. START by acknowledging their industry/model to show authority.
       Example: "I've analyzed [Company]. I see you are a [B2B SaaS] targeting [Enterprise]. Let's audit your revenue engine."
    
    2. KYC CHECKPOINT (Turns 1-3): Verify the missing pieces from the snapshot (e.g., specific revenue range, team structure). Use BUTTONS.
    
    3. NARROW INTENT (Turns 4-10): Drill down into ONE constraint. Guide, don't explore.
    
    4. REPORT (Turn 12+): Close with step_id: "FINISH".
    
    RULES: Output JSON. Always provide 3-4 options. Cite sources if using web data.
    `;

    // Costruzione Messaggi
    const historyParts = history.slice(-10).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // Se è l'inizio, il messaggio utente è "finto" per attivare l'AI
    const userText = choice === "SNAPSHOT_INIT" 
        ? `[SYSTEM: User submitted Context Form. Website: ${contextData.website}. LinkedIn: ${contextData.linkedin}. Generate the FIRST welcome message demonstrating you know their business.]`
        : `User input: "${choice}". Respond in JSON.`;

    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT + systemContextInjection }] },
        ...historyParts,
        { role: 'user', parts: [{ text: userText }] }
    ];
    
    // Se c'è un allegato (graffetta)
    if (attachment) allMessages[allMessages.length-1].parts.push({ inline_data: { mime_type: attachment.mime_type, data: attachment.data } });

    // Chiamata Gemini
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
      if ((!jsonResponse.options || jsonResponse.options.length === 0) && jsonResponse.step_id !== 'FINISH') {
          jsonResponse.options = [{ key: "next", label: "Continue" }, { key: "details", label: "Add Details" }];
      }
      if (jsonResponse.step_id !== 'FINISH') jsonResponse.mode = 'mixed';
      return res.status(200).json(jsonResponse);
    } catch (e) { return sendSafeResponse(text, "mixed"); }

  } catch (error) { return sendSafeResponse(`Server Error: ${error.message}`); }
}
