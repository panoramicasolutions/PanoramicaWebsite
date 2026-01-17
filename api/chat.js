export default async function handler(req, res) {
  // --- CONFIGURAZIONE PROMPT ---
  const SYSTEM_PROMPT = `
  You are the Panoramica Revenue Architect.
  Goal: Diagnose revenue bottlenecks in 5 turns.
  Output strict JSON only. Do not add markdown blocks.

  RULES:
  1. Ask short questions.
  2. If user needs to type numbers/text, use "mode": "mixed".
  3. "mode": "buttons" is DEFAULT.
  4. AFTER 5 TURNS, YOU MUST END THE SESSION:
     - Set "step_id": "FINISH"
     - Set "message": "Analysis complete. Download your Revenue Plan below."
     - Set "mode": "buttons"
     - Set "options": [{"key": "download_report", "label": "Download Report ⬇"}]

  JSON SCHEMA:
  {"step_id": "string", "message": "string", "mode": "buttons"|"mixed", "options": [{"key": "string", "label": "string"}]}
  `;

  // --- GESTIONE CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { choice, history = [] } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("Chiave mancante");
      throw new Error("Missing GEMINI_API_KEY");
    }

    // Preparazione messaggi
    const geminiHistory = history.slice(-6).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const currentTurn = {
      role: 'user',
      parts: [{ text: `User: "${choice}". Next step? JSON only.` }]
    };

    // --- CHIAMATA GOOGLE ---
    // Usiamo il modello stabile "001" o "pro"
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
    
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
    
    // Check errori Google
    if (data.error) {
      console.error("Google Error:", data.error);
      throw new Error(data.error.message);
    }

    // --- PARSING ROBUSTO (Rescue Mode) ---
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Pulizia violenta del testo
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(text);
    } catch (e) {
      // SE IL PARSING FALLISCE: Non rompiamo tutto! Creiamo una risposta di emergenza.
      console.warn("AI returned invalid JSON, recovering...", text);
      jsonResponse = {
        step_id: "recovery",
        message: text.substring(0, 150), // Usiamo il testo grezzo come messaggio
        mode: "mixed", // Attiviamo l'input per non bloccare l'utente
        options: []
      };
    }

    // Safety Check: Se mancano le opzioni, attiviamo l'input testo
    if ((!jsonResponse.options || jsonResponse.options.length === 0) && jsonResponse.step_id !== 'FINISH') {
      jsonResponse.mode = 'mixed';
    }

    return res.status(200).json(jsonResponse);

  } catch (error) {
    console.error("SERVER CRASH:", error);
    // Rispondiamo con un JSON valido anche in caso di crash totale
    return res.status(200).json({
      step_id: "error",
      message: "Si è verificato un errore tecnico. Per favore, riprova o scrivi qui sotto.",
      mode: "mixed",
      options: [{"key": "retry", "label": "Riprova"}]
    });
  }
}message });
  }
}
