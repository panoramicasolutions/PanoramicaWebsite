export default async function handler(req, res) {
  // CORS & METHOD HANDLING
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sendSafeResponse = (msg, mode = "mixed", options = [], confidenceState = null) => {
    const response = {
      step_id: "response", 
      message: msg, 
      mode, 
      options: options.length > 0 ? options : [{ key: "continue", label: "Continue" }]
    };
    if (confidenceState) response.confidence_state = confidenceState;
    return res.status(200).json(response);
  };

  const log = (emoji, message, data = null) => {
    console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${emoji} ${message}`, data || '');
  };

  try {
    const { 
      choice, 
      history = [], 
      attachment = null, 
      contextData = null, 
      confidenceState = null
    } = req.body;
    
    const geminiKey = process.env.GEMINI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!geminiKey) {
      return sendSafeResponse("⚠️ System configuration error.");
    }

    // ═══════════════════════════════════════════════════════════════
    // CONFIDENCE SCORE SYSTEM - 4 PILLARS (100 points total)
    // ═══════════════════════════════════════════════════════════════
    const CONFIDENCE_THRESHOLD = 80;
    const HARD_TURN_CAP = 15;
    const turnCount = history.filter(h => h.role === 'user').length;
    
    // Initialize or restore confidence state
    let confidence = confidenceState || {
      pillar1_company: { score: 0, max: 25, items: { stage: 0, revenue: 0, team: 0 } },
      pillar2_gtm: { score: 0, max: 25, items: { motion: 0, icp: 0, channels: 0 } },
      pillar3_diagnosis: { score: 0, max: 30, items: { pain_point: 0, root_cause: 0, factors: 0 } },
      pillar4_solution: { score: 0, max: 20, items: { validated: 0, next_steps: 0, recommendations: 0 } },
      total_score: 0,
      ready_for_finish: false
    };

    let systemContextInjection = "";

    // SNAPSHOT PHASE - WEB ANALYSIS
    if (choice === "SNAPSHOT_INIT" && contextData) {
      log('🔍', 'Analyzing:', contextData.website);
      
      if (tavilyKey) {
        try {
          const query = `"${new URL(contextData.website).hostname}" company business model products pricing`;
          const search = await fetch("https://api.tavily.com/search", {
            method: "POST", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              api_key: tavilyKey, 
              query, 
              search_depth: "advanced", 
              max_results: 6,
              include_answer: true
            })
          });

          if (search.ok) {
            const data = await search.json();
            let insights = "";
            if (data.answer) insights += `[SUMMARY]: ${data.answer}\n\n`;
            if (data.results?.length) {
              insights += data.results.map(r => `[${r.title}]: ${r.content}`).join('\n\n');
            }
            if (insights) {
              systemContextInjection = `\n[MARKET INTELLIGENCE for ${contextData.website}]:\n${insights}\n`;
              // Pre-populate some confidence from web data
              confidence.pillar1_company.items.stage = 3;
              confidence.pillar2_gtm.items.icp = 3;
            }
          }
        } catch(e) { 
          log('⚠️', 'Snapshot failed:', e.message); 
        }
      }
    }

    // Recalculate totals
    const recalculate = () => {
      confidence.pillar1_company.score = 
        confidence.pillar1_company.items.stage + 
        confidence.pillar1_company.items.revenue + 
        confidence.pillar1_company.items.team;
      confidence.pillar2_gtm.score = 
        confidence.pillar2_gtm.items.motion + 
        confidence.pillar2_gtm.items.icp + 
        confidence.pillar2_gtm.items.channels;
      confidence.pillar3_diagnosis.score = 
        confidence.pillar3_diagnosis.items.pain_point + 
        confidence.pillar3_diagnosis.items.root_cause + 
        confidence.pillar3_diagnosis.items.factors;
      confidence.pillar4_solution.score = 
        confidence.pillar4_solution.items.validated + 
        confidence.pillar4_solution.items.next_steps + 
        confidence.pillar4_solution.items.recommendations;
      confidence.total_score = 
        confidence.pillar1_company.score +
        confidence.pillar2_gtm.score +
        confidence.pillar3_diagnosis.score +
        confidence.pillar4_solution.score;
      confidence.ready_for_finish = 
        confidence.total_score >= CONFIDENCE_THRESHOLD || turnCount >= HARD_TURN_CAP;
    };
    
    recalculate();
    log('📊', `Confidence: ${confidence.total_score}/100 (Threshold: ${CONFIDENCE_THRESHOLD})`);

    // ═══════════════════════════════════════════════════════════════
    // SYSTEM PROMPT WITH DYNAMIC SCORING
    // ═══════════════════════════════════════════════════════════════
    const SYSTEM_PROMPT = `
═══════════════════════════════════════════════════════════════════════════════
REVENUE ARCHITECT - DYNAMIC CONFIDENCE SCORING v4.0
═══════════════════════════════════════════════════════════════════════════════

You are a world-class Revenue Operations strategist conducting a diagnostic.
The conversation continues until CONFIDENCE SCORE >= 80/100.

═══════════════════════════════════════════════════════════════════════════════
CONFIDENCE SCORING SYSTEM
═══════════════════════════════════════════════════════════════════════════════

Track these 4 PILLARS. Focus questions on the LOWEST scoring pillar.

PILLAR 1: COMPANY CONTEXT (25 pts max)
├─ stage (0-10): Company stage identified
│  0=unknown, 5=vague, 10=specific (Series A, $5M ARR)
├─ revenue (0-8): ARR/MRR known
│  0=unknown, 4=range, 8=specific
└─ team (0-7): Team structure understood
   0=unknown, 3=size, 7=breakdown

PILLAR 2: GO-TO-MARKET (25 pts max)
├─ motion (0-10): Sales motion identified
│  0=unknown, 5=general, 10=specific
├─ icp (0-8): ICP clear
│  0=unknown, 4=vertical, 8=detailed
└─ channels (0-7): Channels understood
   0=unknown, 3=primary, 7=full mix

PILLAR 3: DIAGNOSIS (30 pts max) ← MOST IMPORTANT
├─ pain_point (0-12): Pain identified
│  0=unknown, 6=symptom, 12=specific+measurable
├─ root_cause (0-10): Root cause found
│  0=unknown, 5=likely, 10=confirmed
└─ factors (0-8): Contributing factors
   0=unknown, 4=one, 8=multiple

PILLAR 4: SOLUTION READY (20 pts max)
├─ validated (0-10): Client validated
│  0=no, 5=partial, 10=full agreement
├─ next_steps (0-5): Can recommend
└─ recommendations (0-5): Ready to advise

═══════════════════════════════════════════════════════════════════════════════
CURRENT STATE
═══════════════════════════════════════════════════════════════════════════════
${JSON.stringify(confidence, null, 2)}

TOTAL: ${confidence.total_score}/100 | THRESHOLD: ${CONFIDENCE_THRESHOLD} | TURN: ${turnCount}/${HARD_TURN_CAP}
READY FOR FINISH: ${confidence.ready_for_finish}

═══════════════════════════════════════════════════════════════════════════════
DIAGNOSTIC DECISION TREES
═══════════════════════════════════════════════════════════════════════════════

Use these to diagnose efficiently:

IF "Pipeline/Leads" problem:
→ "VOLUME (not enough) or QUALITY (don't convert)?"

IF "Sales Closing" problem:
→ "PROCESS issue (deals stall) or CAPABILITY (reps can't execute)?"

IF "Retention" problem:
→ "Concentrated in SEGMENT or TIME PERIOD?"

IF "Scaling" problem:
→ "What breaks first: HIRING, PROCESS, or DATA?"

═══════════════════════════════════════════════════════════════════════════════
BENCHMARKS TO REFERENCE
═══════════════════════════════════════════════════════════════════════════════
- NRR: 100-120% good, 120%+ excellent
- CAC Payback: <18mo healthy, <12mo excellent
- LTV:CAC: 3:1 minimum, 5:1+ excellent
- Win Rate: 15-25% typical, 30%+ strong
- Sales Cycle: <$15K=14-30d, $15-50K=30-90d, $50K+=90-180d

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (CRITICAL)
═══════════════════════════════════════════════════════════════════════════════

Respond ONLY with valid JSON:

{
  "step_id": "diagnostic" | "validation" | "FINISH",
  "message": "markdown string",
  "mode": "mixed",
  "options": [{"key": "snake_case", "label": "Label"}],
  "confidence_update": {
    "pillar1_company": {"stage": N, "revenue": N, "team": N},
    "pillar2_gtm": {"motion": N, "icp": N, "channels": N},
    "pillar3_diagnosis": {"pain_point": N, "root_cause": N, "factors": N},
    "pillar4_solution": {"validated": N, "next_steps": N, "recommendations": N}
  },
  "reasoning": "Why scores changed"
}

RULES:
- ALWAYS include confidence_update
- Only INCREASE scores (cumulative)
- When total >= ${CONFIDENCE_THRESHOLD}: step_id = "FINISH"
- At FINISH: options = [{"key": "download_report", "label": "📥 Download Strategic Growth Plan"}]
- Turn >= ${HARD_TURN_CAP}: FORCE FINISH

COMMUNICATION: Senior consultant, explain WHY you ask, reference benchmarks.
`;

    // Build history
    const historyParts = history.slice(-14).map(msg => {
      let content = msg.content;
      if (msg.role === 'assistant') {
        try { content = JSON.parse(content).message || content; } catch {}
      }
      return { role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: content }] };
    });

    // Build user message
    let userText = "";
    if (choice === "SNAPSHOT_INIT") {
      userText = `[START] Website: ${contextData.website}\n${systemContextInjection}\nACTION: Welcome, share insight if available, ask first question targeting lowest pillar, include confidence_update.`;
    } else if (confidence.ready_for_finish) {
      userText = `[FINISH REQUIRED] Input: "${choice}" | Score: ${confidence.total_score}/100\nSummarize findings, preview report, set step_id="FINISH", only download option.`;
    } else {
      userText = `Input: "${choice}" | Turn: ${turnCount} | Score: ${confidence.total_score}\nAnalyze response, update confidence, ask next question targeting lowest pillar.`;
    }

    const allMessages = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Ready. I will track confidence across 4 pillars, focus on lowest-scoring areas, and finish when score >= 80.' }] },
      ...historyParts,
      { role: 'user', parts: [{ text: userText }] }
    ];
    
    if (attachment) {
      allMessages[allMessages.length - 1].parts.push({ 
        inline_data: { mime_type: attachment.mime_type, data: attachment.data } 
      });
    }

    // Call Gemini
    log('📤', `Gemini call (Turn ${turnCount}, Score: ${confidence.total_score})`);
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: allMessages, 
          generationConfig: { 
            temperature: 0.7, topP: 0.9, maxOutputTokens: 2048,
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
      return sendSafeResponse("Technical issue. Retrying...", "mixed", [{ key: "retry", label: "Retry" }], confidence);
    }

    const data = await geminiResponse.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return sendSafeResponse("No response. Retrying...", "mixed", [{ key: "retry", label: "Retry" }], confidence);
    }
    
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // Parse response
    try {
      const json = JSON.parse(text);
      
      // Process confidence update (only increase)
      if (json.confidence_update) {
        const cu = json.confidence_update;
        if (cu.pillar1_company) {
          confidence.pillar1_company.items.stage = Math.max(confidence.pillar1_company.items.stage, cu.pillar1_company.stage || 0);
          confidence.pillar1_company.items.revenue = Math.max(confidence.pillar1_company.items.revenue, cu.pillar1_company.revenue || 0);
          confidence.pillar1_company.items.team = Math.max(confidence.pillar1_company.items.team, cu.pillar1_company.team || 0);
        }
        if (cu.pillar2_gtm) {
          confidence.pillar2_gtm.items.motion = Math.max(confidence.pillar2_gtm.items.motion, cu.pillar2_gtm.motion || 0);
          confidence.pillar2_gtm.items.icp = Math.max(confidence.pillar2_gtm.items.icp, cu.pillar2_gtm.icp || 0);
          confidence.pillar2_gtm.items.channels = Math.max(confidence.pillar2_gtm.items.channels, cu.pillar2_gtm.channels || 0);
        }
        if (cu.pillar3_diagnosis) {
          confidence.pillar3_diagnosis.items.pain_point = Math.max(confidence.pillar3_diagnosis.items.pain_point, cu.pillar3_diagnosis.pain_point || 0);
          confidence.pillar3_diagnosis.items.root_cause = Math.max(confidence.pillar3_diagnosis.items.root_cause, cu.pillar3_diagnosis.root_cause || 0);
          confidence.pillar3_diagnosis.items.factors = Math.max(confidence.pillar3_diagnosis.items.factors, cu.pillar3_diagnosis.factors || 0);
        }
        if (cu.pillar4_solution) {
          confidence.pillar4_solution.items.validated = Math.max(confidence.pillar4_solution.items.validated, cu.pillar4_solution.validated || 0);
          confidence.pillar4_solution.items.next_steps = Math.max(confidence.pillar4_solution.items.next_steps, cu.pillar4_solution.next_steps || 0);
          confidence.pillar4_solution.items.recommendations = Math.max(confidence.pillar4_solution.items.recommendations, cu.pillar4_solution.recommendations || 0);
        }
      }
      
      recalculate();
      log('📊', `Updated: ${confidence.total_score}/100`);

      // Validate response
      if (!json.message) json.message = "Processing...";
      json.mode = 'mixed';
      
      // Handle options
      if (!json.options?.length) {
        json.options = confidence.ready_for_finish 
          ? [{ key: "download_report", label: "📥 Download Strategic Growth Plan" }]
          : [{ key: "continue", label: "Continue" }];
      } else {
        json.options = json.options.map((o, i) => ({ key: o.key || `opt_${i}`, label: o.label || "Continue" }));
      }

      // Force FINISH if ready
      if (confidence.ready_for_finish || json.step_id === 'FINISH') {
        json.step_id = 'FINISH';
        json.options = [{ key: "download_report", label: "📥 Download Strategic Growth Plan" }];
        
        if (!json.message.includes('Strategic Growth Plan')) {
          json.message += `\n\n**Diagnostic Complete** (Confidence: ${confidence.total_score}%)\n\nYour Strategic Growth Plan includes:\n- Executive summary\n- Root cause analysis\n- 30/60/90 day action plan\n- KPIs and success metrics\n- Risk mitigation\n\nClick below to download.`;
        }
      }
      
      json.confidence_state = confidence;
      return res.status(200).json(json);

    } catch (e) { 
      log('❌', 'Parse error:', e.message);
      return sendSafeResponse(text.substring(0, 400), "mixed", [{ key: "continue", label: "Continue" }], confidence);
    }

  } catch (error) { 
    console.error("Server Error:", error);
    return sendSafeResponse("Error occurred. Try again.", "mixed", [{ key: "retry", label: "Retry" }]); 
  }
}
