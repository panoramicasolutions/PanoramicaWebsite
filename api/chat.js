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

    // --- FASE 1: CAPIRE SE SERVE IL WEB (ROUTER) ---
    // Se l'utente ha scritto del testo (non un comando fisso) e non c'è allegato, controlliamo se serve cercare.
    let searchContext = "";
    
    // Controlliamo se 'choice' è una frase lunga e non una chiave tecnica (es. "start", "download")
    const isFreeText = choice.includes(" ") || choice.length > 20;
    
    if (isFreeText && tavilyKey && !attachment) {
        console.log("Valutazione necessità ricerca web...");
        
        // Chiediamo a Gemini Flash (velocissimo) se serve cercare
        const routerUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const routerResponse = await fetch(routerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 
                    `Analizza l'input utente: "${choice}". 
                    Se l'utente chiede dati fattuali, news, aziende, o info che richiedono internet, rispondi SOLO con una query di ricerca ottimizzata in Inglese.
                    Se è una risposta personale o conversazione, rispondi "NO_SEARCH".` 
                }] }]
            })
        });
        
        const routerData = await routerResponse.json();
        let searchQuery = routerData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "NO_SEARCH";
        
        // Puliamo eventuali virgolette
        searchQuery = searchQuery.replace(/"/g, '');

        if (searchQuery !== "NO_SEARCH") {
            console.log("Cercando sul web:", searchQuery);
            
            // --- FASE 2: ESEGUIRE LA RICERCA CON TAVILY ---
            try {
                const searchResp = await fetch("https://api.tavily.com/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        api_key: tavilyKey,
                        query: searchQuery,
                        search_depth: "basic", // "advanced" è più lento, basic va bene per chat
                        include_answer: false,
                        max_results: 3
                    })
                });
                
                const searchData = await searchResp.json();
                
                if (searchData.results && searchData.results.length > 0) {
                    searchContext = "\n\n--- WEB SEARCH RESULTS (Use these to answer) ---\n";
                    searchData.results.forEach((res, i) => {
                        searchContext += `Source [${i+1}]: ${res.title} (${res.url})\nContent: ${res.content}\n\n`;
                    });
                    searchContext += "--- END WEB RESULTS ---\nRules for sources: Always cite sources inline using Markdown links like [Source Title](URL).";
                }
            } catch (err) {
                console.error("Errore Tavily:", err);
            }
        }
    }

    // --- FASE 3: RISPOSTA FINALE DELL'AGENTE ---

    const SYSTEM_PROMPT = `
    You are "Panoramica Revenue Architect".
    GOAL: Diagnose revenue bottlenecks (12-15 turns).
    
    RULES:
    1. Respond ONLY with valid JSON.
    2. Schema: {"step_id": "string", "message": "string", "mode": "mixed", "options": [{"key": "k", "label": "l"}]}
    3. If 'WEB SEARCH RESULTS' are provided below, USE THEM to enrich your answer.
    4. CITATIONS: If you use web info, you MUST cite the source creating a clickable Markdown link. Example: "According to [HubSpot](https://hubspot.com)..."
    5. At turn 12+, close with step_id: "FINISH" and option "download_report".
    `;

    // Costruzione messaggi
    const historyParts = history.slice(-10).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // Messaggio utente corrente + Eventuale Context Web + Eventuale Allegato
    const userMessageParts = [
        { text: `User input: "${choice}". ${searchContext} Respond in JSON.` }
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

    // Chiamata Finale a Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: allMessages,
        generationConfig: { temperature: 0.3 }
      })
    });

    const data = await response.json();

    if (data.error) {
        return sendSafeResponse(`Technical Error: ${data.error.message}.`);
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return sendSafeResponse("AI did not respond.");

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const jsonResponse = JSON.parse(text);
      if (!jsonResponse.options) jsonResponse.options = [];
      if (jsonResponse.step_id !== 'FINISH') jsonResponse.mode = 'mixed';
      return res.status(200).json(jsonResponse);
    } catch (e) {
      return sendSafeResponse(text, "mixed"); 
    }

  } catch (error) {
    return sendSafeResponse(`Server Error: ${error.message}`);
  }
}
