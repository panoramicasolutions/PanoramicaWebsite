export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(500).json({ report: "Error: Missing API Key." });

    // --- REPORT PROTOCOL (Step 6 & 7 from PDF) ---
    const SYSTEM_PROMPT = `
    You are the "Revenue Diagnostic Agent". Write the final PDF report.
    
    STRICT FORMAT (11 POINTS):
    1. Executive Summary
    2. Primary Bottleneck(s) (Max 3)
    3. Root Cause (Not symptoms)
    4. Estimated Impact (With assumptions)
    5. 30/60/90 Day Plan (High level)
    6. What we are deliberately NOT fixing now (Force trade-offs)
    7. Risk of Inaction (Economic focus)
    8. Concrete Solution (Process/Automation/People)
    9. Real-world Evidence (Benchmarks)
    10. Confidence Level
    11. CTA: "We implement or validate this with you - not discuss it."
    
    CRITICAL INSTRUCTION (Step 7):
    - Keep the report INTENTIONALLY INCOMPLETE.
    - Show WHAT to fix and WHY.
    - Outline HOW at a high level.
    - DO NOT provide exact workflows, automation logic, or role design.
    - These belong in the paid session.
    
    Write in clean Markdown.
    `;

    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'user', parts: [{ text: `Here is the diagnostic session history: ${JSON.stringify(history)}. Generate the Fixed-Format Report.` }] }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: allMessages,
        generationConfig: { temperature: 0.4 }
      })
    });

    const data = await response.json();
    let reportText = data.candidates?.[0]?.content?.parts?.[0]?.text || "# Error Generating Report";

    res.status(200).json({ report: reportText });

  } catch (error) {
    res.status(500).json({ report: `# Server Error\n\n${error.message}` });
  }
}
