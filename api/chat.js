export default async function handler(req, res) {
  // ═══════════════════════════════════════════════════════════════
  // CORS & METHOD HANDLING
  // ═══════════════════════════════════════════════════════════════
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  const sendSafeResponse = (msg, mode = "mixed", options = []) => res.status(200).json({
    step_id: "response", 
    message: msg, 
    mode, 
    options: options.length > 0 ? options : [{ key: "continue", label: "Continue" }]
  });

  const log = (emoji, message, data = null) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] ${emoji} ${message}`, data ? JSON.stringify(data).slice(0, 200) : '');
  };

  try {
    const { choice, history = [], attachment = null, contextData = null, turn = 0, diagnosticData = {} } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!geminiKey) {
      log('❌', 'Missing Gemini API Key');
      return sendSafeResponse("⚠️ System configuration error. Please contact support.");
    }

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    const MAX_TURNS = 12;
    const turnCount = history.filter(h => h.role === 'user').length;
    
    let systemContextInjection = "";
    let companyInsights = "";

    // ═══════════════════════════════════════════════════════════════
    // SNAPSHOT PHASE - DEEP WEB ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    if (choice === "SNAPSHOT_INIT" && contextData) {
      log('🔍', 'Initiating deep analysis for:', contextData.website);
      
      if (tavilyKey) {
        try {
          // Primary search - company profile
          const primaryQuery = `"${new URL(contextData.website).hostname}" company overview business model products services pricing`;
          log('🔎', 'Primary search:', primaryQuery);
          
          const primarySearch = await fetch("https://.tavily.com/search", {
            method: "POST", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              _key: tavilyKey, 
              query: primaryQuery, 
              search_depth: "advanced", 
              max_results: 8,
              include_answer: true
            })
          });

          if (primarySearch.ok) {
            const primaryData = await primarySearch.json();
            
            if (primaryData.answer) {
              companyInsights += `[AI-GENERATED SUMMARY]: ${primaryData.answer}\n\n`;
            }
            
            if (primaryData.results?.length > 0) {
              companyInsights += primaryData.results
                .map(r => `[SOURCE: ${r.title}]\n${r.content}`)
                .join('\n\n---\n\n');
            }
            log('✅', `Primary search returned ${primaryData.results?.length || 0} results`);
          }

          // Secondary search - competitive landscape (if we have time)
          const competitiveQuery = `${new URL(contextData.website).hostname} competitors market position industry`;
          const competitiveSearch = await fetch("https://.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              _key: tavilyKey,
              query: competitiveQuery,
              search_depth: "basic",
              max_results: 3
            })
          });

          if (competitiveSearch.ok) {
            const compData = await competitiveSearch.json();
            if (compData.results?.length > 0) {
              companyInsights += "\n\n[COMPETITIVE LANDSCAPE]:\n" + 
                compData.results.map(r => `- ${r.title}: ${r.content.slice(0, 200)}`).join('\n');
            }
          }

          if (companyInsights) {
            systemContextInjection = `
═══════════════════════════════════════════════════════════════
[REAL-TIME MARKET INTELLIGENCE - CONFIDENTIAL]
Target: ${contextData.website}
LinkedIn: ${contextData.linkedin || 'Not provided'}
Scan Time: ${new Date().toISOString()}
═══════════════════════════════════════════════════════════════

${companyInsights}

═══════════════════════════════════════════════════════════════
INSTRUCTIONS: Use this intelligence strategically. Reference specific 
details to demonstrate expertise. If data is limited, acknowledge this 
professionally and gather information through diagnostic questions.
═══════════════════════════════════════════════════════════════
`;
          }
          
        } catch(e) { 
          log('⚠️', 'Snapshot failed:', e.message); 
        }
      } else {
        log('⚠️', 'Tavily  key not configured');
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // MASTER SYSTEM PROMPT
    // ═══════════════════════════════════════════════════════════════
    const SYSTEM_PROMPT = `
═══════════════════════════════════════════════════════════════════════════════
REVENUE ARCHITECT - STRATEGIC DIAGNOSTIC ENGINE v3.0
═══════════════════════════════════════════════════════════════════════════════

You are a world-class Revenue Operations strategist with 20+ years of experience 
advising Fortune 500 companies and high-growth startups. Your expertise combines:

- Winning by Design's revenue architecture methodology
- MEDDICC/MEDDPICC qualification frameworks  
- Gartner's B2B buying journey research
- SaaS metrics benchmarks (Bessemer, OpenView, a16z)
- Product-Led Growth frameworks (Reforge, ProductLed)

═══════════════════════════════════════════════════════════════════════════════
DIAGNOSTIC METHODOLOGY
═══════════════════════════════════════════════════════════════════════════════

PHASE 1: ANCHOR & QUALIFY (Turns 0-2)
┌─────────────────────────────────────────────────────────────────────────────┐
│ OBJECTIVE: Establish credibility and understand business context           │
│                                                                             │
│ IF snapshot data available:                                                 │
│   → Lead with a specific insight about their business                       │
│   → "I've analyzed [Company]. Based on your positioning as a [segment]      │
│      player targeting [ICP], I see [specific observation]."                 │
│                                                                             │
│ MUST GATHER (one question at a time, with context):                         │
│   □ Company stage & ARR/MRR range                                          │
│   □ Primary go-to-market motion                                            │
│   □ Team composition (Sales/Marketing/CS headcount)                        │
│   □ Primary challenge they're trying to solve                              │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 2: DEEP DIAGNOSIS (Turns 3-7)
┌─────────────────────────────────────────────────────────────────────────────┐
│ OBJECTIVE: Identify root cause, not symptoms                                │
│                                                                             │
│ USE DECISION TREES:                                                         │
│                                                                             │
│ IF pain = "Not enough pipeline/leads":                                      │
│   → "Is this a volume problem (not enough at-bats) or a quality problem    │
│      (leads don't convert)?"                                                │
│   → Volume: Demand gen strategy, channel mix, content effectiveness         │
│   → Quality: ICP definition, targeting, lead scoring                        │
│                                                                             │
│ IF pain = "Sales not closing":                                              │
│   → "Is this a process issue (deals stall/ghost) or a capability issue     │
│      (reps can't execute)?"                                                 │
│   → Process: Sales stages, qualification criteria, deal velocity           │
│   → Capability: Hiring, enablement, coaching                               │
│                                                                             │
│ IF pain = "Churn/retention":                                                │
│   → "Is churn concentrated in a specific segment or time period?"          │
│   → Segment: Product-market fit, pricing, onboarding                       │
│   → Time: Implementation, time-to-value, CS coverage                       │
│                                                                             │
│ IF pain = "Scaling challenges":                                             │
│   → "What breaks first when you try to grow faster?"                       │
│   → Hiring: Recruiting, onboarding, ramp time                              │
│   → Process: Repeatability, documentation, automation                      │
│   → Data: Visibility, reporting, forecasting                               │
│                                                                             │
│ DIAGNOSTIC QUESTIONS MUST:                                                  │
│   1. Provide context (why you're asking)                                   │
│   2. Reference industry benchmarks when relevant                           │
│   3. Build on previous answers                                             │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 3: SYNTHESIS & VALIDATION (Turns 8-10)
┌─────────────────────────────────────────────────────────────────────────────┐
│ OBJECTIVE: Confirm diagnosis before generating recommendations             │
│                                                                             │
│ STRUCTURE:                                                                  │
│   "Based on our conversation, here's what I'm seeing:                      │
│                                                                             │
│   **Primary Bottleneck:** [Root cause]                                     │
│   **Contributing Factors:** [2-3 secondary issues]                         │
│   **Business Impact:** [Quantified if possible]                            │
│                                                                             │
│   Does this resonate with what you're experiencing?"                       │
│                                                                             │
│ IF they disagree: Ask clarifying questions                                 │
│ IF they agree: Move to conclusion                                          │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 4: CONCLUSION (Turn 11+ OR sufficient data gathered)
┌─────────────────────────────────────────────────────────────────────────────┐
│ TRIGGER CONDITIONS:                                                         │
│   - Turn count >= ${MAX_TURNS - 1}, OR                                      │
│   - Clear diagnosis confirmed by client                                     │
│                                                                             │
│ REQUIRED ACTIONS:                                                           │
│   1. Set step_id to "FINISH"                                               │
│   2. Summarize key findings in 3-4 bullets                                 │
│   3. Preview what the Strategic Growth Plan will contain:                  │
│      - Executive summary                                                    │
│      - Root cause analysis                                                  │
│      - 30/60/90 day action plan                                            │
│      - Implementation roadmap with KPIs                                    │
│      - Risk mitigation strategies                                          │
│   4. Provide ONLY the download button                                      │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
INDUSTRY BENCHMARKS TO REFERENCE
═══════════════════════════════════════════════════════════════════════════════

SAAS METRICS (Bessemer/OpenView):
- Net Revenue Retention: 100-120% (good), 120%+ (excellent)
- Gross Margin: 70-80% (typical), 80%+ (excellent)
- CAC Payback: <18 months (healthy), <12 months (excellent)
- LTV:CAC Ratio: 3:1 (minimum), 5:1+ (excellent)
- Magic Number: >0.75 (efficient growth)
- Rule of 40: Growth % + Profit % > 40

SALES BENCHMARKS:
- Win Rate: 15-25% (typical), 30%+ (strong)
- Sales Cycle: Varies by ACV
  - <$15K ACV: 14-30 days
  - $15-50K ACV: 30-90 days  
  - $50K+ ACV: 90-180+ days
- Quota Attainment: 60-70% of reps hitting quota is healthy
- Ramp Time: 3-6 months for SMB, 6-12 months for Enterprise

FUNNEL BENCHMARKS:
- MQL to SQL: 20-30%
- SQL to Opportunity: 50-60%
- Opportunity to Close: 15-25%
- Website Visitor to Lead: 2-5%

═══════════════════════════════════════════════════════════════════════════════
COMMUNICATION STYLE
═══════════════════════════════════════════════════════════════════════════════

1. SENIOR AUTHORITY
   - Don't just ask questions—explain WHY you're asking
   - "To benchmark your sales efficiency against industry standards..."
   - Use data and frameworks to support your points

2. CONSULTATIVE, NOT INTERROGATIVE  
   - Make it feel like a conversation, not an interview
   - Acknowledge their situation before diving deeper
   - Show empathy for common challenges

3. PRECISE & ACTIONABLE
   - Be specific, not generic
   - Use their terminology and context
   - Provide value in every response

4. STRUCTURED BUT NATURAL
   - Use markdown formatting thoughtfully
   - Bold for emphasis, bullets for clarity
   - Don't over-format simple responses

═══════════════════════════════════════════════════════════════════════════════
OUTPUT SCHEMA (CRITICAL - MUST FOLLOW EXACTLY)
═══════════════════════════════════════════════════════════════════════════════

Respond ONLY with valid JSON in this exact structure:

{
  "step_id": "string",
  "message": "string (markdown formatted)",
  "mode": "mixed",
  "options": [
    {"key": "machine_readable_key", "label": "Human-Readable Label"}
  ]
}

OPTION RULES:
- Provide 3-4 options for multiple choice questions
- Keys: snake_case, machine-readable (e.g., "series_a", "plg_motion")
- Labels: Descriptive, actionable (e.g., "Series A ($1-10M ARR)", "Product-Led Growth")
- At FINISH: ONLY provide {"key": "download_report", "label": "📥 Download Strategic Growth Plan"}

MESSAGE RULES:
- Use markdown: **bold**, bullet points, etc.
- Keep conversational but professional
- Reference previous answers to show continuity
- At FINISH: Preview report contents specifically

NEVER break character. ALWAYS respond in valid JSON. NEVER apologize for format.

═══════════════════════════════════════════════════════════════════════════════
CURRENT SESSION STATE
═══════════════════════════════════════════════════════════════════════════════
Turn Count: ${turnCount}
Max Turns: ${MAX_TURNS}
Turns Remaining: ${MAX_TURNS - turnCount}
`;

    // ═══════════════════════════════════════════════════════════════
    // BUILD CONVERSATION HISTORY FOR GEMINI
    // ═══════════════════════════════════════════════════════════════
    const historyParts = history.slice(-16).map(msg => {
      let content = msg.content;
      
      if (msg.role === 'assistant') {
        try {
          const parsed = JSON.parse(content);
          content = parsed.message || content;
        } catch (e) {
          // Keep original content
        }
      }
      
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: content }]
      };
    });

    // ═══════════════════════════════════════════════════════════════
    // BUILD CURRENT USER MESSAGE
    // ═══════════════════════════════════════════════════════════════
    let userText = "";

    if (choice === "SNAPSHOT_INIT") {
      userText = `
[SESSION START]
Website: ${contextData.website}
LinkedIn: ${contextData.linkedin || 'Not provided'}

${systemContextInjection ? `[MARKET INTELLIGENCE LOADED]\n${systemContextInjection}` : '[NO EXTERNAL DATA AVAILABLE - rely on diagnostic questions]'}

ACTION REQUIRED:
1. If intelligence data is available, lead with ONE specific insight about their business
2. Welcome them professionally
3. Ask your FIRST diagnostic question about company stage/ARR
4. Provide 4 specific options for company stage
`;
    } else if (turnCount >= MAX_TURNS - 1) {
      userText = `
[SYSTEM OVERRIDE - CONCLUSION REQUIRED]
User Input: "${choice}"
Current Turn: ${turnCount} (MAX: ${MAX_TURNS})

You MUST conclude the diagnostic now:
1. Set step_id to "FINISH"
2. Summarize 3-4 key findings from the conversation
3. Preview what the Strategic Growth Plan will include
4. Provide ONLY the download_report option

DO NOT ask more questions. CONCLUDE NOW.
`;
    } else {
      userText = `
User Response: "${choice}"
Current Turn: ${turnCount}/${MAX_TURNS}

Continue the diagnostic. Build on previous context. Ask ONE focused question.
`;
    }

    // ═══════════════════════════════════════════════════════════════
    // ASSEMBLE MESSAGES
    // ═══════════════════════════════════════════════════════════════
    const allMessages = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Understood. I am the Revenue Architect. I will conduct a strategic diagnostic following the methodology outlined, respond only in valid JSON, and provide actionable insights based on industry benchmarks. Ready to begin.' }] },
      ...historyParts,
      { role: 'user', parts: [{ text: userText }] }
    ];
    
    // Add attachment if present
    if (attachment) {
      allMessages[allMessages.length - 1].parts.push({ 
        inline_data: { 
          mime_type: attachment.mime_type, 
          data: attachment.data 
        } 
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // CALL GEMINI 
    // ═══════════════════════════════════════════════════════════════
    log('📤', `Calling Gemini (Turn ${turnCount}/${MAX_TURNS})`);
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiKey}`,
      {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: allMessages, 
          generationConfig: { 
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      log('❌', `Gemini API Error: ${geminiResponse.status}`, errorText);
      return sendSafeResponse(
        "I encountered a technical issue. Let me try a different approach.",
        "mixed",
        [{ key: "retry", label: "Try Again" }]
      );
    }

    const data = await geminiResponse.json();
    
    if (data.error) {
      log('❌', 'Gemini API Error:', data.error);
      return sendSafeResponse(`Technical error occurred. Please try again.`);
    }
    
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      log('❌', 'No text in response');
      return sendSafeResponse(
        "I'm having trouble formulating a response. Let me try again.",
        "mixed",
        [{ key: "retry", label: "Try Again" }]
      );
    }
    
    // Clean JSON response
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // ═══════════════════════════════════════════════════════════════
    // PARSE & VALIDATE RESPONSE
    // ═══════════════════════════════════════════════════════════════
    try {
      const jsonResponse = JSON.parse(text);
      
      // Ensure required fields
      if (!jsonResponse.message || jsonResponse.message.trim() === "") {
        jsonResponse.message = "I've processed your input. Let me continue with the diagnostic.";
      }
      
      if (!jsonResponse.step_id) {
        jsonResponse.step_id = turnCount >= MAX_TURNS - 1 ? "FINISH" : `diagnostic_${turnCount}`;
      }
      
      // Always set mode
      jsonResponse.mode = 'mixed';
      
      // Validate options
      if (!jsonResponse.options || !Array.isArray(jsonResponse.options) || jsonResponse.options.length === 0) {
        if (jsonResponse.step_id === 'FINISH' || jsonResponse.step_id.toLowerCase().includes('finish')) {
          jsonResponse.options = [{ key: "download_report", label: "📥 Download Strategic Growth Plan" }];
        } else {
          jsonResponse.options = [
            { key: "continue", label: "Continue" },
            { key: "clarify", label: "I need to clarify something" }
          ];
        }
      } else {
        // Normalize options
        jsonResponse.options = jsonResponse.options.map((opt, idx) => ({
          key: opt.key || opt.id || `option_${idx}`, 
          label: opt.label || opt.text || opt.title || "Continue"
        }));
      }

      // Force FINISH state
      const isFinishState = jsonResponse.step_id === 'FINISH' || 
                           jsonResponse.step_id.toLowerCase().includes('finish') ||
                           jsonResponse.step_id.toLowerCase().includes('conclusion');
      
      if (isFinishState || turnCount >= MAX_TURNS - 1) {
        jsonResponse.step_id = 'FINISH';
        jsonResponse.options = [{ key: "download_report", label: "📥 Download Strategic Growth Plan" }];
        
        // Ensure message includes report preview
        if (!jsonResponse.message.toLowerCase().includes('strategic') && 
            !jsonResponse.message.toLowerCase().includes('report') &&
            !jsonResponse.message.toLowerCase().includes('plan')) {
          jsonResponse.message += `

**Your Strategic Growth Plan is ready.**

Based on our diagnostic session, the plan will include:
- Executive summary of your revenue engine
- Root cause analysis with supporting data
- Prioritized 30/60/90 day action plan
- Implementation roadmap with success metrics
- Risk mitigation strategies

Click below to download your personalized report.`;
        }
      }
      
      log('✅', `Response validated: ${jsonResponse.step_id}`, { options: jsonResponse.options.length });
      
      return res.status(200).json(jsonResponse);

    } catch (parseError) { 
      log('❌', 'JSON Parse Error:', parseError.message);
      log('📝', 'Raw response:', text.substring(0, 300));
      
      // Attempt to extract meaningful content
      return sendSafeResponse(
        `I've processed that. Here's what I gathered:\n\n${text.substring(0, 500)}${text.length > 500 ? '...' : ''}\n\nShall I continue with the diagnostic?`,
        "mixed",
        [
          { key: "continue", label: "Continue" },
          { key: "clarify", label: "Let me clarify" }
        ]
      );
    }

  } catch (error) { 
    console.error("❌ Server Error:", error);
    console.error("Stack:", error.stack);
    
    return sendSafeResponse(
      `An unexpected error occurred. Please try again.`,
      "mixed",
      [{ key: "retry", label: "Try Again" }]
    ); 
  }
}
