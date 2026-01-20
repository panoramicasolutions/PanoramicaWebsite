export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sendSafeResponse = (msg, mode="mixed", options=[]) => res.status(200).json({
      step_id: "response", message: msg, mode, options: options.length > 0 ? options : [{ key: "continue", label: "Continue" }]
  });

  try {
    const { choice, history = [], attachment = null, contextData = null } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!geminiKey) return sendSafeResponse("Error: Missing Gemini API Key.");

    // CALCOLO DEI TURNI (Per forzare il report se la chat dura troppo)
    // Ogni messaggio utente conta come un turno.
    const turnCount = history.filter(h => h.role === 'user').length;
    const MAX_TURNS = 10; // Al 10° turno, chiudiamo forzatamente.

    let systemContextInjection = "";
    
    // --- FASE 0: SNAPSHOT (Analisi Web) ---
    if (choice === "SNAPSHOT_INIT" && contextData && tavilyKey) {
        console.log("Generating Snapshot for:", contextData.website);
        const query = `Analyze ${contextData.website}. EXTRACT: Value Prop, ICP, Pricing Model (SaaS/Service), Est. Size. Cite 1 competitor if found.`;
        try {
            const searchResp = await fetch("https://api.tavily.com/search", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: tavilyKey, query: query, search_depth: "basic", max_results: 2 })
            });
            const searchData = await searchResp.json();
            if (searchData.results) {
                const rawSnapshot = searchData.results.map(r => r.content).join('\n');
                systemContextInjection = `\n[SYSTEM - REAL-TIME MARKET DATA: ${rawSnapshot}. Use this to show you know their specific market.]\n`;
            }
        } catch(e) { console.error("Snapshot failed", e); }
    }

    // --- SYSTEM PROMPT (SENIOR CONSULTANT PERSONA) ---
    const SYSTEM_PROMPT = `
    ROLE: You are the "Revenue Architect" (A Senior RevOps Partner, comparable to a Winning by Design or Gartner analyst).
    GOAL: Diagnose revenue bottlenecks with AUTHORITY. Guide to a strategic report.
    
    TONE & STYLE:
    - **Seniority:** Don't just ask questions. Explain WHY you are asking. (e.g., "To benchmark your sales cycle efficiency, I need to know...")
    - **Evidence-Based:** Cite general frameworks where appropriate (e.g., "Standard SaaS metrics suggest...", "In a PLG motion, we typically see...").
    - **Direct:** Be polite but surgical. Cut through noise.

    --- LOGIC FLOW (STATE MACHINE) ---

    PHASE 1: ANCHOR (Turn 0)
    - Action: Welcome the user by referencing their specific business model found in the Snapshot.
    - Output: "I've analyzed [Company]. You appear to be a [Segment] player. Let's stress-test your revenue engine."

    PHASE 2: KYC CHECKPOINT (Turns 1-4)
    - TASK: Fill the Mental Checklist. Ask ONE missing item at a time.
      [ ] Stage & Size (ARR)
      [ ] Sales Motion (Inbound/Outbound/PLG)
      [ ] Team Structure
      [ ] Primary Pain Point
    - **CRITICAL:** When asking, provide context. "We see different breakage points at $5M ARR vs $20M ARR. Where do you sit today?"

    PHASE 3: DIAGNOSIS (Turns 5-9)
    - TASK: Drill down into the Pain Point using Binary Logic.
    - IF LEADS: "Is it a volume issue (Top of Funnel) or quality issue (Conversion)?"
    - IF SALES: "Is it process adherence (RevOps) or rep capability (Enablement)?"
    - **CITE SOURCES:** Use phrases like "Market benchmarks indicate...", "Common patterns in your industry show..."

    PHASE 4: FORCED CONCLUSION (Turn ${MAX_TURNS})
    - TRIGGER: If you have enough signal OR if Turn Count >= ${MAX_TURNS}.
    - ACTION: Stop questioning. Tell the user you have the data needed.
    - OUTPUT JSON: set "step_id": "FINISH".

    --- CRITICAL OUTPUT SCHEMA ---
    1. Respond ONLY with valid JSON.
    2. STRUCTURE: 
       {
         "step_id": "string", 
         "message": "string (Rich text with Markdown. Bold key insights. Explain the 'Why'.)", 
         "mode": "mixed", 
         "options": [{"key": "short_id", "label": "Label"}]
       }
    3. **OPTIONS:** Always provide 3-4 options. Labels must be professional (e.g., "Pre-Seed (<$1M)", not just "<$1M").
    `;

    const historyParts = history.slice(-12).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // Costruzione messaggio utente con logica di FORZATURA REPORT
    let userText = `User input: "${choice}". Respond in JSON.`;
    
    if (choice === "SNAPSHOT_INIT") {
        userText = `[SYSTEM START: Website: ${contextData.website}. LinkedIn: ${contextData.linkedin}. ACTION: Analyze Snapshot. Welcome the user with a senior insight about their industry. Then start KYC.]`;
    } else if (turnCount >= MAX_TURNS) {
        // FORZATURA REPORT: Se abbiamo superato i turni, ordiniamo all'AI di chiudere.
        userText += ` [SYSTEM OVERRIDE: We have reached the time limit. You MUST conclude the diagnosis now. Set step_id to "FINISH" and invite the user to download the plan.]`;
    }

    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT + systemContextInjection }] },
        ...historyParts,
        { role: 'user', parts: [{ text: userText }] }
    ];
    
    if (attachment) {
        allMessages[allMessages.length-1].parts.push({ 
            inline_data: { mime_type: attachment.mime_type, data: attachment.data } 
        });
    }

    // Aumentiamo leggermente la temperatura (0.25) per permettere un linguaggio più "Senior" e meno robotico
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: allMessages, generationConfig: { temperature: 0.25 } })
    });

    const data = await response.json();
    if (data.error) return sendSafeResponse(`Error: ${data.error.message}`);
    
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return sendSafeResponse("AI no response.");
    
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const jsonResponse = JSON.parse(text);
      
      // Safeguard: Messaggio di default
      if (!jsonResponse.message) jsonResponse.message = "I've processed your input. Let's continue.";
      
      // Safeguard: Opzioni
      if ((!jsonResponse.options || jsonResponse.options.length === 0) && jsonResponse.step_id !== 'FINISH') {
          jsonResponse.options = [
              { key: "details", label: "Provide more details" },
              { key: "continue", label: "Move to next step" }
          ];
      } else if (jsonResponse.options) {
          jsonResponse.options = jsonResponse.options.map(opt => ({
              key: opt.key, 
              label: opt.label || opt.text || opt.key
          }));
      }

      // Se step_id è FINISH, non mostriamo l'input text, ma solo il bottone di download se non c'è già
      if (jsonResponse.step_id === 'FINISH') {
          jsonResponse.mode = 'buttons'; // Solo bottoni alla fine
          // Assicuriamoci che ci sia il bottone download
          const hasDownload = jsonResponse.options.some(o => o.key === 'download_report');
          if (!hasDownload) {
              jsonResponse.options = [{ key: "download_report", label: "Download Strategic Plan" }];
          }
      } else {
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
