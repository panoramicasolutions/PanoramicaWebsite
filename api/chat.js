export default async function handler(req, res) {
  // 1. CONFIGURAZIONE
const SYSTEM_PROMPT = `
  You are the Panoramica Revenue Architect.
  Goal: Diagnose revenue bottlenecks in exactly 5 turns.
  Output strict JSON only.

  RULES:
  1. "mode": "buttons" is DEFAULT.
  2. Keep "message" concise.
  3. IF THE CONVERSATION IS FINISHED (after 5 turns):
     - Set "step_id" to "FINISH".
     - Set "message" to "Analysis complete. Generating your Execution Plan...".
     - Set "mode" to "buttons".
     - Set "options" to [{"key": "download_report", "label": "Download PDF Report"}].

  JSON SCHEMA RESPONSE:
  {
    "step_id": "string",
    "message": "string",
    "mode": "buttons" | "mixed" | "text",
    "options": [{ "key": "string", "label": "string" }]
  }
  `;

  // 2. GESTIONE CORS E METODI
  // Vercel gestisce molto meglio le origini, ma per sicurezza permettiamo tutto
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { choice, history = [] } = req.body;

    // 3. LOGICA GEMINI
    const geminiHistory = history.slice(-4).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const currentTurn = {
      role: 'user',
      parts: [{ text: `User choice: "${choice}". Next step? JSON only.` }]
    };

    const apiKey = process.env.GEMINI_API_KEY; 
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [...geminiHistory, currentTurn],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2
        }
      })
    });

    const data = await response.json();
    
    if (data.error) throw new Error(data.error.message);

    const aiContent = data.candidates[0].content.parts[0].text;

    // 4. RISPOSTA
    res.status(200).json(JSON.parse(aiContent));

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
