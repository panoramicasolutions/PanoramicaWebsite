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
    // Ora accettiamo anche "attachment" dal frontend
    const { choice, history = [], attachment = null } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return sendSafeResponse("Error: Missing API Key.");

    const SYSTEM_PROMPT = `
    You are "Panoramica Revenue Architect".
    GOAL: Diagnose revenue bottlenecks deeply (12-15 turns).
    
    RULES:
    1. Respond ONLY with valid JSON.
    2. Schema: {"step_id": "string", "message": "string", "mode": "mixed", "options": [{"key": "k", "label": "l"}]}
    3. If the user uploads a document/image, ANALYZE IT thoroughly in your response.
    4. At turn 12+, close with step_id: "FINISH" and option "download_report".
    `;

    // 1. Costruiamo la storia della chat (Testo)
    const historyParts = history.slice(-10).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // 2. Costruiamo il messaggio CORRENTE dell'utente
    // Se c'è un allegato, lo aggiungiamo come "inline_data"
    const currentUserParts = [{ text: `User input: "${choice}". Respond in JSON.` }];

    if (attachment) {
        // attachment deve avere: { mime_type: "image/png", data: "BASE64_STRING..." }
        currentUserParts.push({
            inline_data: {
                mime_type: attachment.mime_type,
                data: attachment.data
            }
        });
    }

    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        ...historyParts,
        { role: 'user', parts: currentUserParts }
    ];

    // 3. Chiamata a Gemini 1.5 Flash (che supporta immagini e PDF)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
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
        console.error("Google Error:", data.error);
        return sendSafeResponse(`Analysis Error: ${data.error.message}. Try a smaller file or text only.`);
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return sendSafeResponse("AI could not analyze the document.");

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
