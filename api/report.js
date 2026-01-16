export default async function handler(req, res) {
  // 1. CONFIGURAZIONE
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { history } = req.body;

    // 2. CHIEDIAMO A GEMINI DI SCRIVERE IL REPORT
    const apiKey = process.env.GEMINI_API_KEY;
    const prompt = `
    Analyze this conversation history and write a consulting report.
    
    HISTORY:
    ${JSON.stringify(history)}
    
    OUTPUT FORMAT:
    Write a clean, professional summary in Markdown format.
    Include:
    1. Executive Summary
    2. Identified Bottlenecks
    3. 30/60/90 Day Plan
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    const reportText = data.candidates[0].content.parts[0].text;

    // 3. RESTITUIAMO IL TESTO (Il frontend lo trasformerà in file)
    res.status(200).json({ report: reportText });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
