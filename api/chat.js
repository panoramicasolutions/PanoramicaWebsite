export default async function handler(req, res) {
  // 1. CONFIGURAZIONE BASE
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Funzione di emergenza
  const sendSafeResponse = (msg, mode="buttons", options=[]) => {
    return res.status(200).json({
      step_id: "response",
      message: msg,
      mode: mode,
      options: options.length > 0 ? options : [{ key: "continue", label: "Continue" }]
    });
  };

  try {
    const { choice, history = [] } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return sendSafeResponse("Error: Missing API Key.");

    // 2. DEFINIZIONE DEL PROMPT (ORA IN INGLESE)
    const SYSTEM_PROMPT = `
    You are "Panoramica Revenue Architect". 
    Your goal is to diagnose revenue bottlenecks in exactly 5 turns.
    
    CORE RULES:
    1. Respond ONLY with valid JSON. No markdown, no backticks.
    2. Required JSON Schema: {"step_id": "string", "message": "string", "mode": "buttons"|"mixed", "options": [{"key": "k", "label": "l"}]}
    3. Ask short, punchy questions in English.
    4. At turn 5, YOU MUST close with step_id: "FINISH" and option key: "download_report".
    `;

    // 3. PREPARAZIONE MESSAGGI
    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] }, // Istruzione nascosta
        ...history.slice(-6).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        })),
        { role: 'user', parts: [{ text: `User input: "${choice}". Respond in JSON.` }] }
    ];

    // 4. CHIAMATA A GEMINI FLASH
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: allMessages,
        generationConfig: { temperature: 0.2 } 
      })
    });

    const data = await response.json();

    // 5. GESTIONE ERRORI
    if (data.error) {
      console.error("Google Error:", data.error);
      return sendSafeResponse(`Technical Error: ${data.error.message}. Please retry.`);
    }

    // 6. ESTRAZIONE RISPOSTA
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return sendSafeResponse("AI did not respond.");

    // Pulizia
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const jsonResponse = JSON.parse(text);
      if (!jsonResponse.options) jsonResponse.options = [];
      return res.status(200).json(jsonResponse);
    } catch (e) {
      return sendSafeResponse(text, "mixed"); 
    }

  } catch (error) {
    return sendSafeResponse(`Server Error: ${error.message}`);
  }
}
