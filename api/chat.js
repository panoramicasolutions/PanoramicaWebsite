// ═══════════════════════════════════════════════════════════════
// HELPER: BUSINESS CONTENT ANALYZER
// ═══════════════════════════════════════════════════════════════
function analyzeSiteContent(html, headers) {
  const context = {
    technologies: [],
    business_signals: {
      title: '',
      description: '',
      h1: [],
      h2: []
    }
  };

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) context.business_signals.title = titleMatch[1].trim();

  const metaDescMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || 
                        html.match(/<meta\s+content="([^"]*)"\s+name="description"/i);
  if (metaDescMatch) context.business_signals.description = metaDescMatch[1].trim();

  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  context.business_signals.h1 = h1Matches.map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 0);

  const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  context.business_signals.h2 = h2Matches.map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 0).slice(0, 6);

  if (/__react|react-dom|_next/i.test(html)) context.technologies.push('React/Next.js');
  if (/shopify/i.test(html)) context.technologies.push('Shopify');
  if (/wordpress/i.test(html)) context.technologies.push('WordPress');
  if (/webflow/i.test(html)) context.technologies.push('Webflow');
  if (/stripe/i.test(html)) context.technologies.push('Stripe');
  
  return context;
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════
function buildSystemPrompt(systemContextInjection, confidence, turnCount) {
  return `
═══════════════════════════════════════════════════════════════════════════════
                        REVENUE ARCHITECT - SYSTEM PROMPT
                              Version 3.0 | Production
═══════════════════════════════════════════════════════════════════════════════

You are the **Revenue Architect**, a senior strategic advisor specializing in Revenue Operations for B2B companies. You diagnose revenue bottlenecks and deliver actionable growth strategies.

═══════════════════════════════════════════════════════════════════════════════
SECTION 1: CORE IDENTITY & BEHAVIORAL RULES
═══════════════════════════════════════════════════════════════════════════════

PERSONA:
- You are a seasoned RevOps consultant with 15+ years of experience
- You've worked with 200+ B2B companies from seed to $100M+ ARR
- You think in systems, not symptoms
- You are direct, strategic, and genuinely curious about each business

TONE:
- Professional but conversational (like a trusted advisor over coffee)
- Confident but not arrogant
- Ask ONE question at a time
- Use "you/your" language, not "the company"
- Be specific—generic advice is worthless

LANGUAGE RULE (CRITICAL):
- ALWAYS respond in the same language the user writes in
- If user writes in Italian → respond in Italian
- If user writes in English → respond in English
- If user switches language mid-conversation → switch with them

WHAT YOU ARE NOT:
- NOT a code reviewer (ignore React, Tailwind, Vercel, CSS)
- NOT a technical consultant
- NOT a generic chatbot that says "interesting" and "great question"
- NEVER mention tech stack unless it directly impacts revenue

ABSOLUTE PROHIBITIONS:
1. Never generate options like "Continue", "Next", "Tell me more" (too generic)
2. Never ask more than ONE question per message
3. Never skip the confirmation step after welcome
4. Never provide a report before reaching 80% confidence OR 15 turns
5. Never contradict the user's manual Business Description

═══════════════════════════════════════════════════════════════════════════════
SECTION 2: CURRENT SESSION CONTEXT
═══════════════════════════════════════════════════════════════════════════════

${systemContextInjection}

CONFIDENCE SCORING STATUS:
- Current Score: ${confidence.total_score}/100
- Pillar 1 (Company): ${confidence.pillar1_company.score}/25
- Pillar 2 (GTM): ${confidence.pillar2_gtm.score}/25
- Pillar 3 (Diagnosis): ${confidence.pillar3_diagnosis.score}/30
- Pillar 4 (Solution): ${confidence.pillar4_solution.score}/20
- Turn Count: ${turnCount}/15
- Ready for Finish: ${confidence.ready_for_finish}

═══════════════════════════════════════════════════════════════════════════════
SECTION 3: CONVERSATION FLOW (STATE MACHINE)
═══════════════════════════════════════════════════════════════════════════════

STATE 1: SNAPSHOT_INIT (Welcome)
────────────────────────────────
TRIGGER: choice === "SNAPSHOT_INIT"

YOUR TASK:
1. Acknowledge the business based on Description (priority) or scraped data
2. Make 2-3 SPECIFIC assumptions about their business model/situation
3. Make 1-2 assumptions about the user's role/responsibilities
4. Show you've "done your homework"
5. END with confirmation request: "Ho capito bene? C'è qualcosa che dovrei correggere?"

OPTIONS TO PROVIDE:
- {"key": "confirm_correct", "label": "Sì, hai capito bene"}
- {"key": "partial_correct", "label": "Quasi, lasciami precisare..."}
- {"key": "wrong_direction", "label": "No, la situazione è diversa"}

STATE 2: DISCOVERY (Main Loop)
──────────────────────────────
TRIGGER: After welcome, until confidence ≥ 80 OR turn ≥ 15

YOUR TASK:
1. Identify the LOWEST scoring pillar
2. Ask ONE targeted question to fill that gap
3. Follow "pain signals" when user shows frustration
4. Connect dots between problems
5. Every 3-4 turns, do a mini-recap

STATE 3: PRE-FINISH (Summary)
─────────────────────────────
TRIGGER: confidence.ready_for_finish === true

YOUR TASK:
Present structured summary:
"**Ecco cosa ho capito:**
📊 **Company**: [stage, team, revenue]
🎯 **Go-to-Market**: [motion, ICP, channels]
🔴 **Problema #1**: [pain]
🔴 **Problema #2**: [pain]
🔴 **Problema #3**: [pain]
**La mia ipotesi**: [synthesis]

Procedo con il report?"

OPTIONS:
- {"key": "download_report", "label": "📥 Genera Strategic Growth Plan"}
- {"key": "add_context", "label": "Aspetta, aggiungo contesto"}

═══════════════════════════════════════════════════════════════════════════════
SECTION 4: DISCOVERY FRAMEWORK (7 Diagnostic Pillars)
═══════════════════════════════════════════════════════════════════════════════

Explore these areas conversationally, NOT as a checklist:

PILLAR 1: MISSION & NORTH STAR
- Alignment between founder vision and daily activities?
- What's the ONE metric that matters most?

PILLAR 2: MESSAGING & POSITIONING  
- Selling outcomes or features?
- "Vitamin" (nice-to-have) or "Painkiller" (must-have)?

PILLAR 3: KYC LAYER (Know Your Company)
- Stage: Pre-revenue / $0-100K / $100K-500K / $500K-1M / $1M-5M / $5M+
- ARR/MRR, Team size, ICP, ACV, Sales cycle

PILLAR 4: SALES ENGINE
- Inbound / Outbound / Referral / PLG?
- Win rate? Where do deals die?
- "Founder-Led Sales Trap"?

PILLAR 5: MARKETING-SALES LOOP
- % pipeline from marketing?
- Vanity metrics vs pipeline contribution?

PILLAR 6: COMPETITIVE MOAT
- "Unfair Advantage"?
- Who do you lose deals to?

PILLAR 7: MANUAL HELL CHECK
- What should be automated but isn't?
- CRM hygiene? Data silos? Frankenstein automations?

═══════════════════════════════════════════════════════════════════════════════
SECTION 5: CONFIDENCE SCORING RULES
═══════════════════════════════════════════════════════════════════════════════

PILLAR 1: COMPANY CONTEXT (max 25)
- stage (0-10): Pre-revenue +5, $0-100K +7, $100K-1M +8, $1M+ +10
- revenue (0-8): Specific number +8, Range +5
- team (0-7): Solo +3, 2-5 people +5, 6+ people +7

PILLAR 2: GO-TO-MARKET (max 25)
- motion (0-10): Channel identified +5, Process detailed +10
- icp (0-8): Title mentioned +4, Company+problem +8
- channels (0-7): Specific channels +7

PILLAR 3: DIAGNOSIS (max 30) — MOST IMPORTANT
- pain_point (0-12): Generic +4, Specific +8, Quantified +12
- root_cause (0-10): Hypothesized +5, Validated +10
- factors (0-8): Contributing factors +8

PILLAR 4: SOLUTION (max 20)
- validated (0-8): User agrees +8
- next_steps (0-6): Timeline indicated +6
- recommendations (0-6): User accepts +6

THRESHOLDS:
- ready_for_finish = TRUE when: total_score ≥ 80 OR turn_count ≥ 15

═══════════════════════════════════════════════════════════════════════════════
SECTION 6: INPUT HANDLING & BUTTON LOGIC
═══════════════════════════════════════════════════════════════════════════════

PRIORITY ORDER:
1. USER TEXT INPUT (highest priority) → Process and respond
2. Button selection → Process and continue
3. Vague input ("boh", "non so") → Simplify + re-offer buttons

BUTTON RULES:
- ALWAYS 3-5 options
- ALWAYS include "Altro — spiegami" escape hatch
- Labels must be SPECIFIC (never "Continue", "Next", "Tell me more")
- After button selection, prefer open follow-up question

MIXED MODE:
- When asking open questions, set mode: "mixed", allow_text: true
- This shows both buttons AND text input

═══════════════════════════════════════════════════════════════════════════════
SECTION 7: ADVANCED TECHNIQUES
═══════════════════════════════════════════════════════════════════════════════

THE TRANSLATOR (for vague users):
- "I'm busy but broke" → "High activity, low conversion — CAC vs LTV issue"
- "Leads ghost us" → "Weak Discovery or missing Cost of Inaction"
- "Sales take forever" → "Unclear value prop or too many stakeholders"

THE PATTERN MATCHER (show expertise):
Before questions, add insight: 
"[INSIGHT] In $500K-$1M SaaS companies, I often see the 'Founder-Led Sales Trap'..."

COMPETITIVE CONTEXT:
Know these competitors: Winning by Design, RevPartners, Sandler, Force Management
Be contrarian when their "best practices" don't fit user's specific context.

═══════════════════════════════════════════════════════════════════════════════
SECTION 8: OUTPUT FORMAT (STRICT JSON)
═══════════════════════════════════════════════════════════════════════════════

EVERY response MUST be valid JSON:

{
  "step_id": "welcome" | "discovery" | "pre_finish" | "FINISH",
  "message": "Your response in markdown...",
  "mode": "buttons" | "text" | "mixed",
  "options": [
    {"key": "unique_key", "label": "Specific label"},
    {"key": "other", "label": "Altro — spiegami"}
  ],
  "allow_text": true | false,
  "confidence_update": {
    "pillar1_company": {"stage": 7},
    "pillar3_diagnosis": {"pain_point": 8}
  }
}

═══════════════════════════════════════════════════════════════════════════════
SECTION 9: EDGE CASES
═══════════════════════════════════════════════════════════════════════════════

REPORT TOO EARLY (confidence < 50):
"Posso generare il report ora, ma sarebbe generico. Con altre 3-4 domande potrei darti raccomandazioni molto più specifiche. Continuiamo?"

USER WANTS TECH TALK:
"Il mio focus è sulla strategia revenue. Posso aiutarti a capire se limitazioni tecniche impattano la conversione. C'è qualcosa del genere?"

CONTRADICTORY INFO:
"Aspetta — prima avevi menzionato [X], ora [Y]. Mi aiuti a capire?"

NOT B2B:
"Il mio framework è per B2B con cicli di vendita strutturati. Per [type], alcune dinamiche sono diverse..."

FALLBACK (error):
{
  "step_id": "recovery",
  "message": "Ho avuto un momento di confusione. Qual è la cosa più importante che vorresti risolvere nel tuo business?",
  "mode": "mixed",
  "options": [
    {"key": "more_leads", "label": "Più lead qualificati"},
    {"key": "better_conversion", "label": "Convertire meglio"},
    {"key": "reduce_churn", "label": "Ridurre il churn"},
    {"key": "scale_team", "label": "Scalare il team"},
    {"key": "other", "label": "Altro"}
  ],
  "allow_text": true
}

═══════════════════════════════════════════════════════════════════════════════
END OF SYSTEM PROMPT
═══════════════════════════════════════════════════════════════════════════════
`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
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
      options: options.length > 0 ? options : [
        { key: "tell_more", label: "Lasciami spiegare meglio" },
        { key: "continue_discovery", label: "Continua con le domande" }
      ]
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
      return sendSafeResponse("⚠️ Errore di configurazione: Gemini API Key mancante.");
    }

    // ═══════════════════════════════════════════════════════════════
    // CONFIDENCE SCORE SYSTEM
    // ═══════════════════════════════════════════════════════════════
    const CONFIDENCE_THRESHOLD = 80;
    const HARD_TURN_CAP = 15;
    const turnCount = history.filter(h => h.role === 'user').length;
    
    let confidence = confidenceState || {
      pillar1_company: { score: 0, max: 25, items: { stage: 0, revenue: 0, team: 0 } },
      pillar2_gtm: { score: 0, max: 25, items: { motion: 0, icp: 0, channels: 0 } },
      pillar3_diagnosis: { score: 0, max: 30, items: { pain_point: 0, root_cause: 0, factors: 0 } },
      pillar4_solution: { score: 0, max: 20, items: { validated: 0, next_steps: 0, recommendations: 0 } },
      total_score: 0,
      ready_for_finish: false
    };

    let systemContextInjection = "";

    // ═══════════════════════════════════════════════════════════════
    // SNAPSHOT PHASE - BUSINESS CONTEXT EXTRACTION
    // ═══════════════════════════════════════════════════════════════
    if (choice === "SNAPSHOT_INIT" && contextData) {
      log('🔍', 'Analyzing Business Context for:', contextData.website);
      
      let siteAnalysis = null;
      let externalInsights = "";
      
      // 1. WEB SCRAPING
      try {
        const targetUrl = new URL(contextData.website.startsWith('http') ? contextData.website : `https://${contextData.website}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(targetUrl.href, {
          method: 'GET',
          headers: { 
            'User-Agent': 'Mozilla/5.0 (compatible; RevenueArchitect/1.0)',
            'Accept': 'text/html' 
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const html = await response.text();
        const headers = Object.fromEntries(response.headers.entries());
        
        siteAnalysis = analyzeSiteContent(html, headers);
        log('✅', `Content extracted. Title: ${siteAnalysis.business_signals.title}`);
        
      } catch (e) {
        log('⚠️', `Scraping failed: ${e.message}`);
      }
      
      // 2. EXTERNAL SEARCH (Tavily)
      if (tavilyKey) {
        try {
          const query = `"${new URL(contextData.website).hostname}" company business model`;
          const search = await fetch("https://api.tavily.com/search", {
            method: "POST", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              api_key: tavilyKey, 
              query, 
              search_depth: "advanced", 
              max_results: 3,
              include_answer: true
            })
          });

          if (search.ok) {
            const data = await search.json();
            if (data.answer) externalInsights += `[SEARCH SUMMARY]: ${data.answer}\n`;
            if (data.results?.length) {
              externalInsights += `[SEARCH RESULTS]: ${data.results.map(r => r.content).join(' | ').slice(0, 500)}...\n`;
            }
          }
        } catch(e) { log('⚠️', 'Search skipped'); }
      }
      
      // 3. BUILD CONTEXT INJECTION
      systemContextInjection = `
═══════════════════════════════════════════════
[BUSINESS INTELLIGENCE DATA]
═══════════════════════════════════════════════
`;

      if (contextData.description) {
         systemContextInjection += `🚨 USER DESCRIPTION (ABSOLUTE TRUTH): "${contextData.description}"
NOTE: This description has highest priority. Do not contradict it.

`;
      }

      if (siteAnalysis) {
         systemContextInjection += `WEBSITE TITLE: ${siteAnalysis.business_signals.title}
META DESCRIPTION: ${siteAnalysis.business_signals.description}
`;
         if (siteAnalysis.business_signals.h1.length > 0) {
             systemContextInjection += `PRIMARY VALUE PROP (H1): ${siteAnalysis.business_signals.h1.join(' | ')}
`;
         }
         if (siteAnalysis.business_signals.h2.length > 0) {
             systemContextInjection += `KEY OFFERINGS (H2): ${siteAnalysis.business_signals.h2.join(' | ')}
`;
         }
      }

      if (externalInsights) {
          systemContextInjection += `
${externalInsights}`;
      }
      
      systemContextInjection += `═══════════════════════════════════════════════
`;
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

    // ═══════════════════════════════════════════════════════════════
    // BUILD SYSTEM PROMPT
    // ═══════════════════════════════════════════════════════════════
    const SYSTEM_PROMPT = buildSystemPrompt(systemContextInjection, confidence, turnCount);

    // Build history
    const historyParts = history.slice(-14).map(msg => {
      let content = msg.content;
      if (msg.role === 'assistant') {
        try { content = JSON.parse(content).message || content; } catch {}
      }
      return { role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: content }] };
    });

    // Build user message based on state
    let userText = "";
    if (choice === "SNAPSHOT_INIT") {
      userText = `[SESSION START]
Website: ${contextData?.website}
Description: ${contextData?.description || "None provided"}

TASK: Analyze the business context and deliver a personalized welcome message.
1. Acknowledge what the company does (use Description as truth)
2. Make 2-3 specific assumptions about their business
3. Do NOT mention React, Tailwind, Vercel, or any tech
4. End with: "Ho capito bene? C'è qualcosa che dovrei correggere?"
5. Provide confirmation options (not generic "Continue")`;

    } else if (confidence.ready_for_finish) {
      userText = `[FINISH REQUIRED]
Confidence Score: ${confidence.total_score}/100
Turn Count: ${turnCount}

TASK: Summarize all findings and offer the Strategic Growth Plan.
1. Present structured summary with emojis (📊🎯🔴)
2. List top 3 problems identified
3. State your hypothesis
4. First option MUST be: {"key": "download_report", "label": "📥 Genera Strategic Growth Plan"}`;

    } else {
      userText = `[CONTINUE DISCOVERY]
User input: "${choice}"
Current Score: ${confidence.total_score}/100
Lowest Pillar: ${getLowestPillar(confidence)}

TASK: 
1. Process user's input and update confidence scores
2. Identify missing information (focus on lowest pillar)
3. Ask ONE strategic question
4. Provide 3-5 SPECIFIC options (never "Continue")
5. If user was vague, simplify and re-ask`;
    }

    const allMessages = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Understood. I am the Revenue Architect. I will focus on business strategy, respond in the user\'s language, ignore tech details, and follow the confidence scoring system.' }] },
      ...historyParts,
      { role: 'user', parts: [{ text: userText }] }
    ];
    
    if (attachment) {
      allMessages[allMessages.length - 1].parts.push({ 
        inline_data: { mime_type: attachment.mime_type, data: attachment.data } 
      });
    }

    // Call Gemini
    log('🤖', 'Calling Gemini API...');
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: allMessages, 
          generationConfig: { 
            temperature: 0.7, 
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      log('❌', 'Gemini API Error:', geminiResponse.status);
      throw new Error("Gemini API Error");
    }

    const data = await geminiResponse.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error("Empty response from Gemini");
    }
    
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    log('✅', 'Gemini response received');

    let json;
    try {
      json = JSON.parse(text);
    } catch (parseError) {
      log('❌', 'JSON Parse Error:', text.substring(0, 200));
      throw new Error("Invalid JSON from Gemini");
    }

    // Confidence Update Logic (Cumulative)
    if (json.confidence_update) {
      const cu = json.confidence_update;
      
      if (cu.pillar1_company) {
        Object.keys(cu.pillar1_company).forEach(key => {
          if (confidence.pillar1_company.items[key] !== undefined) {
            confidence.pillar1_company.items[key] = Math.max(
              confidence.pillar1_company.items[key],
              cu.pillar1_company[key]
            );
          }
        });
      }
      
      if (cu.pillar2_gtm) {
        Object.keys(cu.pillar2_gtm).forEach(key => {
          if (confidence.pillar2_gtm.items[key] !== undefined) {
            confidence.pillar2_gtm.items[key] = Math.max(
              confidence.pillar2_gtm.items[key],
              cu.pillar2_gtm[key]
            );
          }
        });
      }
      
      if (cu.pillar3_diagnosis) {
        Object.keys(cu.pillar3_diagnosis).forEach(key => {
          if (confidence.pillar3_diagnosis.items[key] !== undefined) {
            confidence.pillar3_diagnosis.items[key] = Math.max(
              confidence.pillar3_diagnosis.items[key],
              cu.pillar3_diagnosis[key]
            );
          }
        });
      }
      
      if (cu.pillar4_solution) {
        Object.keys(cu.pillar4_solution).forEach(key => {
          if (confidence.pillar4_solution.items[key] !== undefined) {
            confidence.pillar4_solution.items[key] = Math.max(
              confidence.pillar4_solution.items[key],
              cu.pillar4_solution[key]
            );
          }
        });
      }
    }
    
    recalculate();

    // Validate and fix options
    if (!json.options || json.options.length === 0) {
      log('⚠️', 'No options in response, adding defaults');
      json.options = [
        { key: "tell_more", label: "Lasciami spiegare meglio" },
        { key: "continue_discovery", label: "Fai la prossima domanda" },
        { key: "different_topic", label: "Parliamo di altro" }
      ];
    }
    
    // Remove generic options
    json.options = json.options.filter(opt => 
      !['continue', 'next', 'ok'].includes(opt.key.toLowerCase())
    );
    
    // Ensure at least 3 options
    if (json.options.length < 3) {
      json.options.push({ key: "other", label: "Altro — spiegami" });
    }

    // Finalize response
    json.confidence_state = confidence;
    json.allow_text = json.mode === 'mixed' || json.allow_text === true;
    
    if (confidence.ready_for_finish || json.step_id === 'FINISH') {
      json.step_id = 'FINISH';
      json.options = [
        { key: "download_report", label: "📥 Scarica Strategic Growth Plan" },
        { key: "add_context", label: "Aspetta, voglio aggiungere contesto" },
        { key: "correct_something", label: "Devo correggere qualcosa" }
      ];
    }

    log('📤', `Response: step_id=${json.step_id}, score=${confidence.total_score}, options=${json.options.length}`);
    return res.status(200).json(json);

  } catch (error) { 
    console.error("Server Error:", error);
    return sendSafeResponse(
      "Ho avuto un problema tecnico. Raccontami: qual è la sfida principale che stai affrontando con il tuo business?",
      "mixed",
      [
        { key: "lead_gen", label: "Generare più lead" },
        { key: "conversion", label: "Convertire meglio" },
        { key: "retention", label: "Trattenere i clienti" },
        { key: "scaling", label: "Scalare il team" },
        { key: "other", label: "Altro problema" }
      ]
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Get Lowest Scoring Pillar
// ═══════════════════════════════════════════════════════════════
function getLowestPillar(confidence) {
  const pillars = [
    { name: 'Company Context', score: confidence.pillar1_company.score, max: 25 },
    { name: 'Go-to-Market', score: confidence.pillar2_gtm.score, max: 25 },
    { name: 'Diagnosis', score: confidence.pillar3_diagnosis.score, max: 30 },
    { name: 'Solution', score: confidence.pillar4_solution.score, max: 20 }
  ];
  
  // Calculate percentage for fair comparison
  const withPercentage = pillars.map(p => ({
    ...p,
    percentage: (p.score / p.max) * 100
  }));
  
  // Sort by percentage ascending
  withPercentage.sort((a, b) => a.percentage - b.percentage);
  
  return `${withPercentage[0].name} (${withPercentage[0].score}/${withPercentage[0].max})`;
}
