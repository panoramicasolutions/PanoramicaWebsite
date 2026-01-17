export default async function handler(req, res) {
  // 1. CONFIGURAZIONE BASE (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Funzione di emergenza per rispondere nella chat invece di crashare
  const sendErrorToChat = (errorMsg, details = "") => {
    return res.status(200).json({
      step_id: "error",
      message: `🛑 ERRORE DI SISTEMA: ${errorMsg}\n\nDETTAGLI: ${JSON.stringify(details)}`,
      mode: "buttons",
      options: [{ key: "retry", label: "Riprova tra poco" }]
    });
  };

  try {
    const { choice, history = [] } = req.body;

    // 2. CONTROLLO CHIAVE API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return sendErrorToChat("Chiave API mancante su Vercel.", "Verifica in Settings > Environment Variables");
    }

    // 3. PREPARAZIONE DATI
    const geminiHistory = history.slice(-4).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const currentTurn = {
      role: 'user',
      parts: [{ text: `User: "${choice}". Next step? JSON only.` }]
    };

    const SYSTEM_PROMPT = `
      You are a Revenue Architect. Output JSON only.
      Schema: {"step_id": "string", "message": "string", "mode": "buttons", "options": [{"key": "k", "label": "l"}]}
    `;

    // 4. CHIAMATA GOOGLE (Usiamo gemini-pro che è il più compatibile)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    console.log("Chiamata a Google in corso...");

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT }] }, ...geminiHistory, currentTurn]
      })
    });

    const data = await response.json();

    // 5. GESTIONE ERRORI GOOGLE
    if (data.error) {
      return sendErrorToChat("Google ha rifiutato la richiesta", data.error.message);
    }

    // 6. ESTRAZIONE E PARSING
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return sendErrorToChat("Risposta vuota da Google", data);

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const jsonResponse = JSON.parse(text);
      // Se tutto va bene, inviamo la risposta corretta
      return res.status(200).json(jsonResponse);
    } catch (e) {
      return sendErrorToChat("L'AI non ha risposto in JSON valido", text);
    }

  } catch (error) {
    // 7. CATTURA ERRORI DI RETE O SERVER
    return sendErrorToChat("Crash del Server Vercel", error.message);
  }
}
