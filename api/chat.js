export default async function handler(req, res) {
  // 1. CONFIGURAZIONE BASE
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Funzione di emergenza
  const sendSafeResponse = (msg, mode="mixed", options=[]) => {
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

    // 2. PROMPT AGGIORNATO (SESSIONE LUNGA & INPUT LIBERO)
    const SYSTEM_PROMPT = `
    You are "Panoramica Revenue Architect", a senior consultant conducting a deep diagnostic session.
    
    GOALS:
    1. Conduct a deep, thorough diagnosis lasting approx 12-15 turns (simulating a 60-min session).
    2. Don't rush. Ask follow-up questions if the user's answer is vague.
    3. Allow the user to express themselves freely.
    
    RULES:
    1. DEFAULT MODE: "mixed" (ALWAYS allow text input + buttons).
    2. Respond ONLY with valid JSON. No markdown.
    3. Schema: {"step_id": "string", "message": "string", "mode": "mixed", "options": [{"key": "k", "label": "l"}]}
    4. ONLY when you have gathered substantial data (around turn 12-15), close with step_id: "FINISH" and option key: "download_report".
    `;

    // 3. COSTRUZIONE MESSAGGI
    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        ...history.slice(-10).map(msg => ({ // Aumentiamo la memoria a 10 messaggi per ricordare meglio il contesto lungo
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        })),
        { role: 'user', parts: [{ text: `User input: "${choice}". Respond in JSON.` }] }
    ];

    // 4. CHIAMATA A GEMINI
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: allMessages,
        generationConfig: { temperature: 0.3 } // Un po' più di creatività per la conversazione lunga
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
      
      // FORZATURA SAFETY: Assicuriamoci che la modalità sia SEMPRE mixed (tranne alla fine)
      if (jsonResponse.step_id !== 'FINISH') {
          jsonResponse.mode = 'mixed';
      }
      
      return res.status(200).json(jsonResponse);
    } catch (e) {
      return sendSafeResponse(text, "mixed"); 
    }

  } catch (error) {
    return sendSafeResponse(`Server Error: ${error.message}`);
  }
}
