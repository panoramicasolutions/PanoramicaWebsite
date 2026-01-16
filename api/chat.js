export default async function handler(req, res) {
  // 1. CONFIGURAZIONE PROMPT
  const SYSTEM_PROMPT = `
  You are the Panoramica Revenue Architect.
  Goal: Diagnose revenue bottlenecks in exactly 5 turns.
  Output strict JSON only.

  RULES:
  1. Ask short, punchy questions.
  2. If asking for a metric/number, set "mode": "mixed".
  3. "mode": "buttons" is DEFAULT for multiple choice.
  4. CRITICAL: IF THE CONVERSATION IS FINISHED (after 5 turns):
     - Set "step_id": "FINISH"
     - Set "message": "Analysis complete. Click below to generate your Execution Plan."
     - Set "mode": "buttons"
     - Set "options": [{"key": "download_report", "label": "Download PDF Report ⬇"}]

  JSON SCHEMA RESPONSE:
  {
    "step_id": "string",
    "message": "string",
    "mode": "buttons" | "mixed",
    "options": [{"key": "string", "label": "string"}]
  }
  `;

  // 2. GESTIONE CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { choice, history = [] } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    // Preparazione messaggi per Gemini
    const geminiHistory = history.slice(-6).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const currentTurn = {
      role: 'user',
      parts: [{ text: `User input: "${choice}". Next step? JSON only.` }]
    };

    // 3. CHIAMATA GOOGLE
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${apiKey}`;
    
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
    if (data.error) throw new Error(data.error.message);

    // 4. PULIZIA E PARSING ROBUSTO
    let text = data.candidates[0].content.parts[0].text;
    
    // Rimuoviamo eventuali backticks markdown che rompono il JSON
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let jsonResponse = JSON.parse(text);

    // 5. SAFETY NET (Anti-Blocco)
    // Se l'AI non manda opzioni, forziamo la modalità "mixed" così appare la casella di testo
    if (!jsonResponse.options || jsonResponse.options.length === 0) {
        if (jsonResponse.step_id !== 'FINISH') {
            jsonResponse.mode = 'mixed'; 
        }
    }

    return res.status(200).json(jsonResponse);

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
