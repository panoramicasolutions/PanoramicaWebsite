export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // Prompt per generare il piano finale
    const prompt = `
    Based on the following consultation chat, write a Revenue Operations Execution Plan.
    
    CHAT HISTORY:
    ${JSON.stringify(history)}
    
    OUTPUT FORMAT:
    Write in clear Markdown. Include:
    # Executive Summary
    # Key Bottlenecks Identified
    # 30-Day Plan (Quick Wins)
    # 60-Day Plan (System Building)
    # 90-Day Plan (Optimization)
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

    res.status(200).json({ report: reportText });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
