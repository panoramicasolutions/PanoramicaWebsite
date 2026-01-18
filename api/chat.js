export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sendSafeResponse = (msg, mode="mixed", options=[]) => {
    return res.status(200).json({
      step_id: "response",
      message: msg,
      mode: mode,
      options: options.length > 0 ? options : [{ key: "continue", label: "Continue" }]
    });
  };

  try {
    const { choice, history = [], attachment = null } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!geminiKey) return sendSafeResponse("Error: Missing Gemini API Key.");

    // --- FASE 1: COMPANY SNAPSHOT (SILENT CONTEXT BUILDING) ---
    // Come da Step 2 del PDF: "Agent silently builds context from Website/LinkedIn"
    let searchContext = "";
    
    // Se l'input sembra un nome azienda o un URL, attiviamo Tavily per creare lo snapshot
    const isCompanyInput = choice.includes("http") || choice.toLowerCase().includes(".com") || (history.length < 2 && choice.length > 3);
    
    if (isCompanyInput && tavilyKey && !attachment) {
        try {
            console.log("Building Company Snapshot for:", choice);
            const searchResp = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    api_key: tavilyKey,
                    query: `Analyze business model, ICP, and pricing for: ${choice}. Short summary.`,
                    search_depth: "basic",
                    max_results: 2
                })
            });
            const searchData = await searchResp.json();
            if (searchData.results) {
                searchContext = `\n[INTERNAL SNAPSHOT - DO NOT READ ALOUD]:\n${searchData.results.map(r => r.content).join('\n')}\n`;
            }
        } catch (e) { console.error("Snapshot Error", e); }
    }

    // --- FASE 2: DEFINIZIONE DEL PROTOCOLLO (SYSTEM PROMPT) ---
    // Basato rigorosamente sul PDF "Operating Instructions"
    
    const SYSTEM_PROMPT = `
    ROLE: You are the "Revenue Diagnostic Agent". 
    NOT a generic chat. NOT a RevOps audit tool.
    
    GOAL: Reduce uncertainty. Surface 1-2 real revenue constraints. Force trade-offs. Guide to paid session.
    
    OPERATING PROTOCOL:
    
    PHASE 1: ANCHOR & SNAPSHOT (Turns 1-2)
    - If you don't know the company, ask for the URL/Name first.
    - Build a mental "Company Snapshot" (ICP, Pricing, Size) using the web context provided.
    
    PHASE 2: KYC CHECKPOINT (Turns 3-6)
    - This is a CHECKPOINT, not a conversation.
    - Collect STRICTLY: Company Structure, Market, Stage, Key Metrics.
    - USE BUTTONS by default. Free text only if unavoidable.
    
    PHASE 3: NARROW INTENT (Turns 7-12)
    - Guide, don't explore. One question at a time.
    - Narrow down to the primary constraint (Leads? Sales Process? Retention?).
    - If outcomes feel fuzzy, narrow the scope.
    
    PHASE 4: REPORT SIGNAL (Turn 12+)
    - Once you have clear signal on the bottleneck, close with step_id: "FINISH".
    
    CRITICAL RULES:
    1. Output JSON ONLY. Schema: {"step_id": "string", "message": "string", "mode": "mixed", "options": [{"key": "k", "label": "l"}]}
    2. ALWAYS provide 3-4 distinct buttons (options) for every question.
    3. Keep questions short. Clarity creates momentum.
    4. CITE SOURCES if you use web data.
    `;

    // Costruzione messaggi
    const historyParts = history.slice(-12).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const userMessageParts = [
        { text: `User input: "${choice}". ${searchContext} Respond in JSON following the PROTOCOL.` }
    ];

    if (attachment) {
        userMessageParts.push({
            inline_data: { mime_type: attachment.mime_type, data: attachment.data }
        });
    }

    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        ...historyParts,
        { role: 'user', parts: userMessageParts }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: allMessages,
        generationConfig: { temperature: 0.2 } // Bassa temperatura per rigore procedurale
      })
    });

    const data = await response.json();

    if (data.error) return sendSafeResponse(`Error: ${data.error.message}`);

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return sendSafeResponse("AI did not respond.");

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const jsonResponse = JSON.parse(text);
      
      // SAFETY: Se mancano le opzioni in fase KYC/Narrowing, le forziamo
      if ((!jsonResponse.options || jsonResponse.options.length === 0) && jsonResponse.step_id !== 'FINISH') {
          jsonResponse.options = [
              { key: "next", label: "Continue" },
              { key: "details", label: "Add Details" }
          ];
      }
      
      if (jsonResponse.step_id !== 'FINISH') jsonResponse.mode = 'mixed';
      
      return res.status(200).json(jsonResponse);
    } catch (e) {
      return sendSafeResponse(text, "mixed"); 
    }

  } catch (error) {
    return sendSafeResponse(`Server Error: ${error.message}`);
  }
}
