export default async function handler(req, res) {
  // 1. CONFIGURAZIONE BASE
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(500).json({ report: "Error: Missing API Key." });

    // 2. prompt DI SISTEMA (Generazione Report)
    const SYSTEM_PROMPT = `
    You are a Revenue Architect writing a formal consultation report.
    Based on the chat history provided, write a professional Markdown report.
    
    STRUCTURE:
    # Revenue Architecture Audit
    ## Executive Summary
    (Summarize the user's situation based on their inputs)
    
    ## Identified Bottlenecks
    (List potential issues based on their answers)
    
    ## 30-60-90 Day Execution Plan
    ### Phase 1: Fix (Days 1-30)
    ...
    ### Phase 2: Build (Days 31-60)
    ...
    ### Phase 3: Scale (Days 61-90)
    ...
    
    Refuse to write anything else. Output only the Report content.
    `;

    // 3. COSTRUZIONE MESSAGGI "UNIVERSALE" (Come in Chat)
    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'user', parts: [{ text: `Here is the consultation history: ${JSON.stringify(history)}. Generate the report now.` }] }
    ];

    // 4. CHIAMATA A GEMINI FLASH (Modello Corretto)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: allMessages,
        generationConfig: { temperature: 0.4 } // Un po' più creativo per il report
      })
    });

    const data = await response.json();

    // 5. GESTIONE ERRORI
    if (data.error) {
        console.error("Report Error:", data.error);
        return res.status(200).json({ report: `# Error Generating Report\n\nGoogle API Error: ${data.error.message}` });
    }

    let reportText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!reportText) {
        reportText = "# Error\n\nAI returned an empty response. Please try again.";
    }

    // 6. RESTITUIAMO IL TESTO
    res.status(200).json({ report: reportText });

  } catch (error) {
    res.status(500).json({ report: `# Server Error\n\n${error.message}` });
  }
}
