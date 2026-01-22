export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    if (!geminiKey) {
      console.error('❌ Missing Gemini API Key');
      return sendSafeResponse("⚠️ System configuration error. Please contact support.");
    }

    // Calculate turn count
    const turnCount = history.filter(h => h.role === 'user').length;
    const MAX_TURNS = 10;

    let systemContextInjection = "";
    
    // --- SNAPSHOT PHASE (Web Analysis) ---
    if (choice === "SNAPSHOT_INIT" && contextData) {
        console.log("🔍 Generating Snapshot for:", contextData.website);
        
        if (tavilyKey) {
            const query = `site:${contextData.website} OR ${contextData.website} company profile value proposition pricing model team size competitors`;
            
            try {
                const searchResp = await fetch("https://api.tavily.com/search", {
                    method: "POST", 
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        api_key: tavilyKey, 
                        query: query, 
                        search_depth: "basic", 
                        max_results: 5,
                        include_domains: [new URL(contextData.website).hostname]
                    })
                });
                
                if (!searchResp.ok) {
                    console.warn(`⚠️ Tavily API error: ${searchResp.status}`);
                } else {
                    const searchData = await searchResp.json();
                    if (searchData.results && searchData.results.length > 0) {
                        const rawSnapshot = searchData.results
                            .map(r => `[${r.title}]: ${r.content}`)
                            .join('\n\n');
                        systemContextInjection = `\n[SYSTEM - REAL-TIME MARKET DATA FROM ${contextData.website}:\n${rawSnapshot}\n\nUse this data to demonstrate deep knowledge of their specific business. Reference specific details when possible.]\n`;
                        console.log("✅ Snapshot retrieved successfully");
                    }
                }
            } catch(e) { 
                console.error("❌ Snapshot failed:", e.message); 
            }
        } else {
            console.warn('⚠️ Tavily API key not configured - snapshot disabled');
        }
    }

    // --- SYSTEM PROMPT ---
    const SYSTEM_PROMPT = `
ROLE: You are the "Revenue Architect" - a Senior RevOps consultant with expertise comparable to Winning by Design or Gartner analysts.

MISSION: Conduct a diagnostic conversation to identify revenue bottlenecks, then generate a strategic growth plan.

COMMUNICATION STYLE:
- **Senior Authority:** Don't just ask - explain WHY. Example: "To benchmark your sales cycle efficiency against industry standards, I need to understand..."
- **Evidence-Based:** Reference frameworks when relevant: "Standard SaaS metrics suggest...", "In a PLG motion, we typically see..."
- **Direct & Precise:** Be polite but surgical. Cut through noise.
- **Conversational:** Natural language, minimal jargon.

--- CONVERSATION FLOW ---

**PHASE 1: ANCHOR** (Turn 0-1)
- If SNAPSHOT data available: Reference specific business insights from their website
- If no SNAPSHOT: Start with warm welcome
- Example: "I've analyzed [Company]. You appear to be a [Segment] player targeting [ICP]. Let's diagnose your revenue engine."

**PHASE 2: KNOW YOUR CLIENT** (Turns 1-4)
Build your mental model by filling these gaps ONE AT A TIME:
- [ ] Stage & Revenue (ARR/MRR range)
- [ ] Sales Motion (Inbound/Outbound/PLG/Hybrid)
- [ ] Team Structure (Sales/Marketing/CS headcount)
- [ ] Primary Pain Point (What's broken?)

**Critical Rules:**
1. Provide context with EVERY question: "We see different breakage points at $5M vs $20M ARR. Where are you today?"
2. Offer 3-4 specific button options (e.g., "Pre-Seed (<$1M)", "Series A ($1-10M)", "Series B ($10-50M)", "Growth ($50M+)")
3. Use their previous answers to refine next questions

**PHASE 3: DIAGNOSIS** (Turns 5-9)
Drill into the pain point using binary decision trees:
- IF LEADS: "Volume issue (top of funnel) or quality issue (conversion)?"
- IF SALES: "Process adherence (RevOps) or rep capability (Enablement)?"
- IF RETENTION: "Product gap or Customer Success gap?"

**Citation Strategy:**
- Use phrases like: "Market benchmarks indicate...", "Common patterns in your vertical show...", "Industry data suggests..."
- Ask follow-ups to understand root cause, not symptoms

**PHASE 4: SYNTHESIS** (Turns 8-9)
- Summarize findings in 2-3 bullets
- Validate: "Based on our conversation, here's what I'm seeing... Does this resonate?"

**PHASE 5: CONCLUSION** (Turn ${MAX_TURNS} OR sufficient data gathered)
**TRIGGER CONDITIONS:**
- Turn count >= ${MAX_TURNS}, OR
- You have clear answers to ALL Phase 2 items AND identified root cause

**WHEN TRIGGERED:**
1. Stop asking questions
2. Set "step_id" to "FINISH"
3. Summarize key findings
4. Explain what the strategic plan will contain (specific previews)
5. Provide ONLY download_report button

--- OUTPUT SCHEMA (CRITICAL) ---

You MUST respond with ONLY valid JSON in this exact structure:

{
  "step_id": "string",
  "message": "string (Use **bold** for emphasis, bullet points for lists, markdown formatting)",
  "mode": "mixed",
  "options": [
    {"key": "unique_machine_key", "label": "Human-Readable Label"}
  ]
}

**OPTIONS RULES:**
1. Provide 3-4 options for multiple choice questions
2. Labels must be descriptive: "Series A ($1-10M ARR)" not "$1-10M"
3. Keys must be machine-readable: "series_a" not "Series A ($1-10M ARR)"
4. At FINISH state, provide ONLY: {"key": "download_report", "label": "📥 Download Strategic Growth Plan"}

**MESSAGE RULES:**
1. Use markdown formatting (**bold**, bullet points, etc.)
2. Keep messages conversational but professional
3. Include specific context from previous answers
4. At FINISH state, preview what the report will contain

**CRITICAL:** Never break character. Always respond in JSON. Never apologize for the format.
`;

    // Build conversation history for Gemini
    const historyParts = history.slice(-14).map(msg => {
        let content = msg.content;
        
        // Parse JSON responses from assistant
        if (msg.role === 'assistant') {
            try {
                const parsed = JSON.parse(content);
                content = parsed.message || content;
            } catch (e) {
                // Keep original content if not JSON
            }
        }
        
        return {
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: content }]
        };
    });

    // Build current user message
    let userText = `User selected: "${choice}". Current turn: ${turnCount}.`;
    
    if (choice === "SNAPSHOT_INIT") {
        userText = `[SYSTEM START] Website: ${contextData.website}. LinkedIn: ${contextData.linkedin || 'N/A'}.\n\nACTION: Review the SNAPSHOT data provided. Welcome the user with a specific insight about their business positioning. Then ask the FIRST diagnostic question about their revenue stage/ARR.`;
    } else if (turnCount >= MAX_TURNS) {
        userText += `\n\n[SYSTEM OVERRIDE] Maximum diagnostic turns reached (${MAX_TURNS}). You MUST conclude now:\n1. Set step_id to "FINISH"\n2. Summarize key findings\n3. Preview what the strategic plan will include\n4. Provide ONLY the download_report option.`;
    }

    // Combine all messages
    const allMessages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT + systemContextInjection }] },
        ...historyParts,
        { role: 'user', parts: [{ text: userText }] }
    ];
    
    // Add attachment if present
    if (attachment) {
        allMessages[allMessages.length-1].parts.push({ 
            inline_data: { 
                mime_type: attachment.mime_type, 
                data: attachment.data 
            } 
        });
    }

    // Call Gemini API
    console.log(`📤 Calling Gemini (Turn ${turnCount})...`);
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
      {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: allMessages, 
          generationConfig: { 
            temperature: 0.4,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            }
          ]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("❌ Gemini API Error:", geminiResponse.status, errorText);
      return sendSafeResponse(
        `I encountered a technical issue. Please try again or contact support if this persists.`,
        "mixed",
        [{ key: "retry", label: "Try Again" }]
      );
    }

    const data = await geminiResponse.json();
    
    if (data.error) {
        console.error("❌ Gemini API Error:", data.error);
        return sendSafeResponse(`Technical error: ${data.error.message}`);
    }
    
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
        console.error("❌ No text in response:", JSON.stringify(data));
        return sendSafeResponse(
          "I'm having trouble formulating a response. Please try again.",
          "mixed",
          [{ key: "retry", label: "Try Again" }]
        );
    }
    
    // Clean JSON response (remove markdown code blocks)
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const jsonResponse = JSON.parse(text);
      
      // --- VALIDATION & SAFEGUARDS ---
      
      // 1. Ensure required fields exist
      if (!jsonResponse.message || jsonResponse.message.trim() === "") {
        jsonResponse.message = "I've processed your input. Let me know how I can help further.";
      }
      
      if (!jsonResponse.step_id) {
        jsonResponse.step_id = turnCount >= MAX_TURNS ? "FINISH" : `diagnostic_${turnCount}`;
      }
      
      // 2. Always set mode to 'mixed'
      jsonResponse.mode = 'mixed';
      
      // 3. Validate and normalize options
      if (!jsonResponse.options || !Array.isArray(jsonResponse.options) || jsonResponse.options.length === 0) {
        if (jsonResponse.step_id === 'FINISH') {
          jsonResponse.options = [{ 
            key: "download_report", 
            label: "📥 Download Strategic Growth Plan" 
          }];
        } else {
          jsonResponse.options = [
            { key: "provide_context", label: "Provide more context" },
            { key: "continue", label: "Continue" }
          ];
        }
      } else {
        // Normalize option format
        jsonResponse.options = jsonResponse.options.map((opt, idx) => ({
          key: opt.key || opt.id || `option_${idx}`, 
          label: opt.label || opt.text || opt.title || opt.key || "Continue"
        }));
      }

      // 4. Force FINISH state behavior
      if (jsonResponse.step_id === 'FINISH' || jsonResponse.step_id.toLowerCase().includes('finish')) {
        // Ensure ONLY download button exists
        jsonResponse.options = [{ 
          key: "download_report", 
          label: "📥 Download Strategic Growth Plan" 
        }];
        
        // Ensure message includes preview of report contents
        if (!jsonResponse.message.toLowerCase().includes('strategic plan') && 
            !jsonResponse.message.toLowerCase().includes('report')) {
          jsonResponse.message += "\n\n**Your Strategic Growth Plan is ready for download.** It will include:\n- Executive summary of findings\n- Root cause analysis\n- Prioritized action plan\n- Success metrics & timeline";
        }
      }
      
      console.log(`✅ Response validated: ${jsonResponse.step_id} with ${jsonResponse.options.length} options`);
      
      return res.status(200).json(jsonResponse);

    } catch (parseError) { 
      console.error("❌ JSON Parse Error:", parseError.message);
      console.error("Raw response:", text.substring(0, 500));
      
      // Fallback: send text as message
      return sendSafeResponse(
        `I've processed that, but had trouble formatting my response properly. Here's what I found:\n\n${text.substring(0, 400)}...`,
        "mixed",
        [
          { key: "continue", label: "Continue" },
          { key: "clarify", label: "Can you clarify?" }
        ]
      );
    }

  } catch (error) { 
    console.error("❌ Server Error:", error);
    console.error("Stack:", error.stack);
    
    return sendSafeResponse(
      `An unexpected error occurred. Please try again or contact support if this persists.`,
      "mixed",
      [{ key: "retry", label: "Try Again" }]
    ); 
  }
}
