export default async function handler(req, res) {
  // 1. CONFIGURAZIONE BASE
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Funzione per non crashare mai
  const sendSafeResponse = (msg, mode="buttons", options=[]) => {
    return res.status(200).json({
      step_id: "response",
      message: msg,
      mode: mode,
      options: options.length > 0 ? options : [{ key: "continue", label: "Continua" }]
    });
  };

  try {
    const { choice, history = [] } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return sendSafeResponse("Errore: Chiave API mancante.");

    // 2. PREPARAZIONE DATI
    const geminiHistory = history.slice(-6).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const currentTurn = {
      role: 'user',
      parts: [{ text: `User input: "${choice}". Rispondi in JSON.` }]
    };

    // Prompt Sistema Semplificato
    const SYSTEM_PROMPT = `
    Sei un Revenue Architect. 
    Obiettivo: Diagnosi in 5 turni.
    Output: SOLO JSON valido.
    Schema: {"step_id": "step", "message": "domanda breve", "mode": "buttons", "options": [{"key": "a", "label": "b"}]}
    Alla fine (5 turni) usa step_id: "FINISH" e opzione "download_report".
    `;

    // 3. CHIAMATA AL MODELLO CORRETTO (Quello che dava 500, non Not Found)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-001:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [...geminiHistory, currentTurn],
        generationConfig: { response_mime_type: "application/json", temperature: 0.2 }
      })
    });

    const data = await response.json();

    // 4. GESTIONE ERRORI GOOGLE
    if (data.error) {
      return sendSafeResponse(`Errore Google: ${data.error.message}. Riprova.`);
    }

    // 5. PARSING SICURO (Qui è dove crashava prima!)
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return sendSafeResponse("L'AI non ha risposto.");

    // Pulizia
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const jsonResponse = JSON.parse(text);
      // Se manca il campo options, aggiungiamolo per sicurezza
      if (!jsonResponse.options) jsonResponse.options = [];
      return res.status(200).json(jsonResponse);
    } catch (e) {
      // Se il JSON è rotto, rispondiamo col testo normale invece di crashare
      return sendSafeResponse(text, "mixed"); 
    }

  } catch (error) {
    return sendSafeResponse(`Errore Server: ${error.message}`);
  }
}
