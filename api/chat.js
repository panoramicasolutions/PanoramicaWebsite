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

    // --- FASE 1: ROUTER (DECIDE SE CERCARE NEL WEB) ---
    let searchContext = "";
    const isFreeText = choice.includes(" ") || choice.length > 20;
    
    // Cerchiamo solo se l'utente scrive testo libero e non c'è un file allegato
    if (isFreeText && tavilyKey && !attachment) {
        console.log("Checking web search necessity...");
        const routerUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiKey}`;
        try {
            const routerResponse = await fetch(routerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: 
                        `User input: "${choice}". 
                        Does this require real-time factual data (news, companies, stats)? 
                        If YES, output a search query in English. 
                        If NO (it's personal info or chat), output "NO_SEARCH".` 
                    }] }]
                })
            });
            const routerData = await routerResponse.json();
            let searchQuery = routerData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "NO_SEARCH";
            searchQuery = searchQuery.replace(/"/g, '');

            if (searchQuery !== "NO_SEARCH") {
                const searchResp = await fetch("https://api.tavily.com/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        api_key: tavilyKey,
                        query: searchQuery,
                        search_depth: "basic",
                        max_results: 3
                    })
                });
                const searchData = await searchResp.json();
                if (searchData.results && searchData.results.length > 0) {
                    searchContext = "\n\n--- WEB RESULTS ---\n" + searchData.results.map(r => `Source: ${r.title} (${r.url})\n${r.content}`).join("\n\n") + "\n--- END RESULTS ---\n";
                }
            }
        } catch (e) { console.error("Router/Search Error", e); }
    }

    // --- FASE 2: RISPOSTA AGENTE ---

    const SYSTEM_PROMPT = `
    You are "Panoramica Revenue Architect".
    GOAL: Diagnose revenue bottlenecks (12-15 turns).
    
    RULES:
    1. Respond ONLY with valid JSON.
    2. Schema: {"step_id": "string", "message": "string", "mode": "mixed", "options": [{"key": "k", "label": "l"}]}
    3. CRITICAL: ALWAYS provide 3-4 "options" (suggested answers) in the JSON. Never leave options empty unless it is the final report step.
       - Example: If asking about industry, provide [{"key": "saas", "label": "SaaS"}, {"key": "agency", "label": "Agency"}, etc.]
    4. If 'WEB RESULTS' are present, use them and cite sources using Markdown links [Source](URL).
    5. At turn 12+, close with step_id: "FINISH" and option "download_report".
    `;

    // Costruzione messaggi
    const historyParts = history.slice(-10).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const userMessageParts = [
        { text: `User input: "${choice}". ${searchContext} Respond in JSON with options.` }
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
        generationConfig: { temperature: 0.3 }
      })
    });

    const data = await response.json();

    if (data.error) return sendSafeResponse(`Error: ${data.error.message}`);

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return sendSafeResponse("AI did not respond.");

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const jsonResponse = JSON.parse(text);
      
      // SAFETY NET: Se l'AI si dimentica ancora i bottoni, ne aggiungiamo noi di default!
      if (!jsonResponse.options || jsonResponse.options.length === 0) {
          if (jsonResponse.step_id !== 'FINISH') {
              jsonResponse.options = [
                  { key: "details", label: "Give more details" },
                  { key: "skip", label: "Skip this question" },
                  { key: "unsure", label: "Not sure" }
              ];
          } else {
              jsonResponse.options = [];
          }
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
