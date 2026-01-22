export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sendSafeResponse = (msg, mode="mixed", options=[]) => res.status(200).json({
      step_id: "response", 
      message: msg, 
      mode, 
      options: options.length > 0 ? options : [{ key: "continue", label: "Continue" }]
  });

  try {
    const { choice, history = [], attachment = null, contextData = null } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!geminiKey) return sendSafeResponse("⚠️ Error: Missing Gemini API Key. Configure in environment.");

    // CALCOLO DEI TURNI
    const turnCount = history.filter(h => h.role === 'user').length;
    const MAX_TURNS = 10;

    let systemContextInjection = "";
    
    // --- FASE 0: SNAPSHOT (Analisi Web) ---
    if (choice === "SNAPSHOT_INIT" && contextData && tavilyKey) {
        console.log("🔍 Generating Snapshot for:", contextData.website);
        const query = `Analyze ${contextData.website}. EXTRACT: Value Prop, ICP, Pricing Model (SaaS/Service), Est. Size. Cite 1 competitor if found.`;
        try {
            const searchResp = await fetch("https://api.tavily.com/search", {
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    api_key: tavilyKey, 
                    query: query, 
                    search_depth: "basic", 
                    max_results: 3 
                }),
                timeout: 10000 // 10 secondi timeout
            });
            
            if (!searchResp.ok) throw new Error(`Tavily API error: ${searchResp.status}`);
            
            const searchData = await searchResp.json();
            if (searchData.results && searchData.results.length > 0) {
                const rawSnapshot = searchData.results.map(r => r.content).join('\n');
                systemContextInjection = `\n[SYSTEM - REAL-TIME MARKET DATA: ${rawSnapshot}. Use this to show you know their specific market.]\n`;
                console.log("✅ Snapshot retrieved successfully");
            } else {
                console.log("⚠️ No snapshot data found");
            }
        } catch(e) { 
            console.error("❌ Snapshot failed:", e.message); 
        }
    }

    // --- SYSTEM PROMPT (SENIOR CONSULTANT PERSONA) ---
    const SYSTEM_PROMPT = `
ROLE: You are the "Revenue Architect" (A Senior RevOps Partner, comparable to a Winning by Design or Gartner analyst).
GOAL: Diagnose revenue bottlenecks with AUTHORITY. Guide to a strategic report.

TONE & STYLE:
- **Seniority:** Don't just ask questions. Explain WHY you are asking. (e.g., "To benchmark your sales cycle efficiency, I need to know...")
- **Evidence-Based:** Cite general frameworks where appropriate (e.g., "Standard SaaS metrics suggest...", "In a PLG motion, we typically see...").
- **Direct:** Be polite but surgical. Cut through noise.
- **Conversational:** Use natural language, avoid corporate jargon when possible.

--- LOGIC FLOW (STATE MACHINE) ---

PHASE 1: ANCHOR (Turn 0)
- Action: Welcome the user by referencing their specific business model found in the Snapshot.
- Output: "I've analyzed [Company]. You appear to be a [Segment] player with [specific insight]. Let's stress-test your revenue engine."

PHASE 2: KYC CHECKPOINT (Turns 1-4)
- TASK: Fill the Mental Checklist. Ask ONE missing item at a time.
  [ ] Stage & Size (ARR/Revenue)
  [ ] Sales Motion (Inbound/Outbound/PLG/Hybrid)
  [ ] Team Structure (Sales, Marketing, CS headcount)
  [ ] Primary Pain Point (What's broken?)
- **CRITICAL:** When asking, provide context. "We see different breakage points at $5M ARR vs $20M ARR. Where do you sit today?"
- Provide 3-4 specific options as buttons (e.g., "Pre-Seed (<$1M ARR)", "Series A ($1M-$10M)", "Series B ($10M-$50M)", "Growth ($50M+)")

PHASE 3: DIAGNOSIS (Turns 5-9)
- TASK: Drill down into the Pain Point using Binary Logic.
- IF LEADS: "Is it a volume issue (Top of Funnel) or quality issue (Conversion)?"
- IF SALES: "Is it process adherence (RevOps) or rep capability (Enablement)?"
- **CITE SOURCES:** Use phrases like "Market benchmarks indicate...", "Common patterns in your industry show..."
- Ask follow-up questions to understand root cause, not just symptoms.

PHASE 4: SYNTHESIS (Turn 8-9)
- Summarize findings in 2-3 bullet points
- Validate with user: "Based on our conversation, here's what I'm seeing... Does this resonate?"

PHASE 5: FORCED CONCLUSION (Turn ${MAX_TURNS} OR when you have sufficient data)
- TRIGGER: If you have enough signal OR if Turn Count >= ${MAX_TURNS}.
- ACTION: Stop questioning. Tell the user you have the data needed for the strategic plan.
- OUTPUT: Set "step_id" to "FINISH" and include a compelling message about what the plan will contain.
- IMPORTANT: When step_id is FINISH, include ONLY this option: {"key": "download_report", "label": "📥 Download Strategic Growth Plan"}

--- CRITICAL OUTPUT SCHEMA ---
1. Respond ONLY with valid JSON.
2. STRUCTURE: 
   {
     "step_id": "string", 
     "message": "string (Rich Markdown. Use **bold** for key insights. Use bullet points for clarity.)", 
     "mode": "mixed",
     "options": [{"key": "unique_key", "label": "Professional Label"}]
   }
3. **OPTIONS:** 
   - Always provide 3-4 options for multiple choice questions
   - Use descriptive labels (e.g., "Series A ($1M-$10M ARR)", not just "$1M-$10M")
   - Keys should be machine-readable (e.g., "series_a", "enterprise_sales")
4. **FINISH STATE:** When step_id is "FINISH", set mode to "mixed" and provide only the download_report option.
`;

    const historyParts = history.slice(-12).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // Costruzione messaggio utente
    let userText = `User input: "${choice}". Current turn: ${turnCount}. Respond in JSON format as specified.`;
    
    if (choice === "SNAPSHOT_INIT") {
        userText = `[SYSTEM START: Website: ${contextData.website}. LinkedIn: ${contextData.linkedin || 'N/A'}. ACTION: Analyze Snapshot data. Welcome the user with a senior insight about their industry positioning. Then start KYC with the first question about their stage/ARR.]`;
    } else if (turnCount >= MAX_TURNS) {
        userText += ` [SYSTEM OVERRIDE: Maximum turns reached (${MAX_TURNS}). You MUST conclude the diagnosis now. Set step_id to "FINISH" and invite the user to download their strategic plan with specific preview of what it will contain.]`;
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

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: allMessages, 
        generationConfig: { 
          temperature: 0.3,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048
        } 
      })
    });

    const data = await response.json();
    
    if (data.error) {
        console.error("❌ Gemini API Error:", data.error);
        return sendSafeResponse(`AI Error: ${data.error.message}`);
    }
    
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        console.error("❌ No text in response:", JSON.stringify(data));
        return sendSafeResponse("AI returned empty response. Please try again.");
    }
    
    // Clean JSON response
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const jsonResponse = JSON.parse(text);
      
      // SAFEGUARDS
      
      // 1. Ensure message exists
      if (!jsonResponse.message || jsonResponse.message.trim() === "") {
        jsonResponse.message = "I've processed your input. What would you like to explore next?";
      }
      
      // 2. Ensure step_id exists
      if (!jsonResponse.step_id) {
        jsonResponse.step_id = turnCount >= MAX_TURNS ? "FINISH" : "diagnostic";
      }
      
      // 3. Handle options
      if (!jsonResponse.options || jsonResponse.options.length === 0) {
        if (jsonResponse.step_id === 'FINISH') {
          // Force download option at the end
          jsonResponse.options = [{ 
            key: "download_report", 
            label: "📥 Download Strategic Growth Plan" 
          }];
        } else {
          // Provide generic continue options
          jsonResponse.options = [
            { key: "provide_details", label: "Provide more context" },
            { key: "continue", label: "Continue to next step" }
          ];
        }
      } else {
        // Normalize options format
        jsonResponse.options = jsonResponse.options.map(opt => ({
          key: opt.key || opt.id || Math.random().toString(36).substr(2, 9), 
          label: opt.label || opt.text || opt.key || "Continue"
        }));
      }

      // 4. Force FINISH state when needed
      if (jsonResponse.step_id === 'FINISH') {
        jsonResponse.mode = 'mixed'; // IMPORTANTE: frontend supporta solo 'mixed'
        // Assicurati che ci sia SOLO il bottone download
        const hasDownload = jsonResponse.options.some(o => o.key === 'download_report');
        if (!hasDownload) {
          jsonResponse.options = [{ 
            key: "download_report", 
            label: "📥 Download Strategic Growth Plan" 
          }];
        } else {
          // Rimuovi altri bottoni, tieni solo download
          jsonResponse.options = jsonResponse.options.filter(o => o.key === 'download_report');
        }
      } else {
        jsonResponse.mode = 'mixed';
      }
      
      console.log("✅ Response sent:", jsonResponse.step_id);
      return res.status(200).json(jsonResponse);

    } catch (parseError) { 
      console.error("❌ JSON Parse Error:", parseError.message);
      console.error("Raw text:", text);
      // Fallback: invia il testo raw come messaggio
      return sendSafeResponse(
        `I've processed that, but had trouble formatting the response. Here's what I found:\n\n${text.substring(0, 500)}`,
        "mixed",
        [{ key: "continue", label: "Continue" }]
      );
    }

  } catch (error) { 
    console.error("❌ Server Error:", error);
    return sendSafeResponse(`Server Error: ${error.message}. Please refresh and try again.`); 
  }
}
