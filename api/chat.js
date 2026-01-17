export default async function handler(req, res) {
  // 1. CONFIGURAZIONE BASE
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Funzione di emergenza per rispondere sempre
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

    // 2. DEFINIZIONE DEL PROMPT DI SISTEMA (Lo trattiamo come testo normale)
    const SYSTEM_PROMPT = `
    Sei "Panoramica Revenue Architect". 
    Il tuo obiettivo è fare una diagnosi in esattamente 5 turni.
    
    REGOLE FONDAMENTALI:
    1. Rispondi SOLO ed ESCLUSIVAMENTE con un JSON valido. Niente markdown, niente backticks.
    2. Schema JSON richiesto: {"step_id": "string", "message": "string", "mode": "buttons"|"mixed", "options": [{"key": "k", "label": "l"}]}
    3. Fai domande brevi e dirette.
    4. Al turno 5, DEVI chiudere con step_id: "FINISH" e l'opzione key: "download_report".
    `;

    // 3. PREPARAZIONE DATI "VECCHIA SCUOLA" (Compatibile con tutto)
    // Invece di usare system_instruction, lo mettiamo come primo messaggio dell'utente.
    // Questo aggira i bug dei parametri avanzati.
    
    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] }, // Istruzione nascosta
        ...history.slice(-6).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        })),
        { role: 'user', parts: [{ text: `User input: "${choice}". Rispondi col JSON.` }] }
    ];

    // 4. CHIAMATA A GEMINI FLASH (Usiamo quello che è stato trovato)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: allMessages,
        // Rimuoviamo response_mime_type perché alcuni modelli non lo supportano e danno Internal Error
        generationConfig: { temperature: 0.2 } 
      })
    });

    const data = await response.json();

    // 5. GESTIONE ERRORI
    if (data.error) {
      console.error("Errore Google:", data.error);
      return sendSafeResponse(`Errore Tecnico Google: ${data.error.message}. Riprova.`);
    }

    // 6. ESTRAZIONE RISPOSTA
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return sendSafeResponse("L'AI non ha risposto.");

    // Pulizia
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const jsonResponse = JSON.parse(text);
      if (!jsonResponse.options) jsonResponse.options = [];
      return res.status(200).json(jsonResponse);
    } catch (e) {
      // Se il JSON è rotto, mostriamo il testo grezzo e permettiamo di continuare
      return sendSafeResponse(text, "mixed"); 
    }

  } catch (error) {
    return sendSafeResponse(`Errore Server: ${error.message}`);
  }
}
