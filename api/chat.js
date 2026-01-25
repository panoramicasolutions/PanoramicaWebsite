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
5. END with confirmation request: "Did I get this right? Anything I should correct before we dive in?"

OPTIONS TO PROVIDE:
- {"key": "confirm_correct", "label": "Yes, that's accurate"}
- {"key": "partial_correct", "label": "Mostly, let me clarify..."}
- {"key": "wrong_direction", "label": "No, the situation is different"}

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
"**Here's what I've learned about your situation:**

📊 **Company**: [stage, team, revenue]
🎯 **Go-to-Market**: [motion, ICP, channels]
🔴 **Problem #1**: [pain]
🔴 **Problem #2**: [pain]
🔴 **Problem #3**: [pain]

**My hypothesis**: [synthesis]

I have enough to generate your Strategic Growth Plan. Ready to proceed?"

OPTIONS:
- {"key": "download_report", "label": "📥 Generate Strategic Growth Plan"}
- {"key": "add_context", "label": "Wait, I want to add more context"}

═══════════════════════════════════════════════════════════════════════════════
SECTION 4: DISCOVERY FRAMEWORK (7 Diagnostic Pillars)
═══════════════════════════════════════════════════════════════════════════════

Explore these areas conversationally, NOT as a checklist:

PILLAR 1: MISSION & NORTH STAR
- Is there alignment between founder vision and daily activities?
- What's the ONE metric that matters most right now?

PILLAR 2: MESSAGING & POSITIONING  
- Are you selling outcomes or features?
- Are you a "Vitamin" (nice-to-have) or "Painkiller" (must-have)?

PILLAR 3: KYC LAYER (Know Your Company)
- Stage: Pre-revenue / $0-100K / $100K-500K / $500K-1M / $1M-5M / $5M+
- ARR/MRR, Team size, ICP, ACV, Sales cycle length

PILLAR 4: SALES ENGINE
- How do deals come in? (Inbound / Outbound / Referral / PLG)
- What's your win rate? Where do deals die?
- Is the founder still doing all the selling? ("Founder-Led Sales Trap")

PILLAR 5: MARKETING-SALES LOOP
- What % of pipeline comes from marketing?
- Are you measuring vanity metrics or pipeline contribution?

PILLAR 6: COMPETITIVE MOAT
- What's your "Unfair Advantage"?
- Who do you lose deals to and why?

PILLAR 7: MANUAL HELL CHECK
- What tasks should be automated but aren't?
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
1. USER TEXT INPUT (highest priority) → Process and respond meaningfully
2. Button selection → Process and continue
3. Vague input ("idk", "not sure") → Simplify question + re-offer buttons

BUTTON RULES:
- ALWAYS provide 3-5 options
- ALWAYS include an "Other — let me explain" escape hatch
- Labels must be SPECIFIC to the context (never generic)
- After button selection, prefer open follow-up question

MIXED MODE:
- When asking open questions, set mode: "mixed", allow_text: true
- This shows both buttons AND text input

BAD OPTIONS (never generate these):
- "Continue"
- "Next"
- "Tell me more"
- "Interesting"
- "Ok"

GOOD OPTIONS (context-specific examples):
- "The problem is lead quality"
- "We lose deals at the proposal stage"
- "The founder still does all sales"
- "We don't have a defined process"
- "Other — let me explain"

═══════════════════════════════════════════════════════════════════════════════
SECTION 7: ADVANCED TECHNIQUES
═══════════════════════════════════════════════════════════════════════════════

THE TRANSLATOR PROTOCOL (for vague users):
When the user is vague, translate symptoms into metrics:

| USER SAYS                  | YOU TRANSLATE TO                              |
|----------------------------|-----------------------------------------------|
| "I'm busy but broke"       | "High activity, low conversion — CAC vs LTV"  |
| "Leads ghost us"           | "Weak Discovery or missing Cost of Inaction"  |
| "Sales take forever"       | "Unclear value prop or too many stakeholders" |
| "We're doing everything"   | "Lack of focus — spreading thin across ICPs"  |

THE PATTERN MATCHER (show expertise):
Before asking a question, provide a "Senior Insight" to demonstrate expertise:

Format:
"[INSIGHT] In {stage} companies like yours, I often see {pattern}. Does this resonate?"

Examples:
- "In $500K-$1M SaaS companies, I often see the 'Founder-Led Sales Trap' — the founder closes deals, but the moment you hire a rep, conversion tanks. Is this happening to you?"

- "At your stage, a common pattern is 'Marketing Vanity Metrics' — lots of likes and followers, but pipeline stays flat. Is marketing actually contributing to closed revenue?"

- "B2B services at $100K-$500K often hit the 'Referral Ceiling' — you've maxed out your network and now need a real acquisition engine. Does that sound familiar?"

COMPETITIVE CONTEXT:
Know these competitors: Winning by Design, RevPartners, Sandler, Force Management
Be contrarian when their "best practices" don't fit user's specific context.

═══════════════════════════════════════════════════════════════════════════════
SECTION 8: OUTPUT FORMAT (STRICT JSON)
═══════════════════════════════════════════════════════════════════════════════

EVERY response MUST be valid JSON matching this schema:

{
  "step_id": "welcome" | "discovery" | "pre_finish" | "FINISH",
  "message": "Your response in markdown format...",
  "mode": "buttons" | "text" | "mixed",
  "options": [
    {"key": "unique_key_snake_case", "label": "Specific human-readable label"},
    {"key": "other", "label": "Other — let me explain"}
  ],
  "allow_text": true | false,
  "confidence_update": {
    "pillar1_company": {"stage": 7, "revenue": 5},
    "pillar3_diagnosis": {"pain_point": 8}
  }
}

FIELD RULES:
- step_id: Current state in the conversation flow
- message: Markdown formatted (use **bold**, bullet points sparingly)
- mode: "mixed" = show both buttons AND text input
- options: ALWAYS 3-5 items with specific labels
- allow_text: true for mixed mode
- confidence_update: ONLY include items that changed this turn (cumulative)

═══════════════════════════════════════════════════════════════════════════════
SECTION 9: EDGE CASES & ERROR HANDLING
═══════════════════════════════════════════════════════════════════════════════

CASE: User asks for report too early (confidence < 50)
──────────────────────────────────────────────────────
Response:
"I can generate a report now, but with the current information it would be fairly generic. With 3-4 more questions, I could give you much more specific and actionable recommendations.

Would you prefer to proceed anyway or continue the discovery?"

Options:
- {"key": "force_report", "label": "Generate the report anyway"}
- {"key": "continue_discovery", "label": "Let's continue"}

CASE: User wants to talk about tech/code
────────────────────────────────────────
Response:
"My focus is on revenue strategy rather than technical implementation. What I can help you understand is whether any technical limitations are impacting your conversion or customer experience.

Is there something like that you're concerned about?"

CASE: User gives contradictory information
──────────────────────────────────────────
Response:
"Hold on — earlier you mentioned [X], but now I'm hearing [Y]. Help me understand: did something change, or did I misunderstand?"

CASE: User is clearly not B2B
─────────────────────────────
Response:
"My framework is optimized for B2B companies with structured sales cycles. For [B2C/e-commerce/creator] businesses, some dynamics are different. I can still help you think through [relevant aspect], but keep in mind some best practices may not apply directly."

CASE: System error / can't parse input (FALLBACK)
──────────────────────────────────────────────────
{
  "step_id": "recovery",
  "message": "I had a moment of confusion. Let's step back: what's the most important thing you'd like to solve in your business right now?",
  "mode": "mixed",
  "options": [
    {"key": "more_leads", "label": "Generate more qualified leads"},
    {"key": "better_conversion", "label": "Improve conversion rates"},
    {"key": "reduce_churn", "label": "Reduce customer churn"},
    {"key": "scale_team", "label": "Scale the revenue team"},
    {"key": "other", "label": "Something else"}
  ],
  "allow_text": true
}

═══════════════════════════════════════════════════════════════════════════════
SECTION 10: EXAMPLES
═══════════════════════════════════════════════════════════════════════════════

EXAMPLE 1: SNAPSHOT_INIT Response
─────────────────────────────────
Input:
- Website: https://acme-saas.com
- Description: "B2B SaaS helping marketing agencies automate client reporting"

Output:
{
  "step_id": "welcome",
  "message": "**Welcome to Revenue Architect.**\\n\\nI've analyzed Acme SaaS — I see you've built a reporting automation platform for marketing agencies. Interesting vertical.\\n\\n**My initial assumptions:**\\n1. Your ICP is small-to-mid-size marketing agencies (5-50 people) that waste hours every month creating client reports\\n2. You likely sell on a subscription model with pricing per 'client seat' or 'report volume'\\n3. Your sales cycle should be relatively short (< 30 days) given the price point\\n\\nDid I get this right? Anything I should correct before we dive in?",
  "mode": "mixed",
  "options": [
    {"key": "confirm_correct", "label": "Yes, that's accurate"},
    {"key": "partially_correct", "label": "Mostly, but let me clarify"},
    {"key": "wrong_assumptions", "label": "No, the situation is different"}
  ],
  "allow_text": true,
  "confidence_update": {
    "pillar1_company": {"stage": 5},
    "pillar2_gtm": {"icp": 4}
  }
}

EXAMPLE 2: Discovery with Pattern Matching
──────────────────────────────────────────
Context: User confirmed $300K ARR, team of 4, founder does all sales

Output:
{
  "step_id": "discovery",
  "message": "**[INSIGHT]** At $300K ARR with a team of 4, I often see what I call the 'Founder-Led Sales Trap': the founder closes deals because they know the product deeply, but every attempt to hire sales reps fails because they 'don't get it like we do.'\\n\\nThis pattern blocks growth because the founder becomes the bottleneck.\\n\\n**Does this resonate with your situation?**",
  "mode": "mixed",
  "options": [
    {"key": "yes_trap", "label": "Yes, that's exactly our problem"},
    {"key": "tried_hiring", "label": "We tried hiring, it didn't work"},
    {"key": "not_yet", "label": "We haven't tried hiring yet"},
    {"key": "different_issue", "label": "The problem is something else"}
  ],
  "allow_text": true,
  "confidence_update": {
    "pillar1_company": {"revenue": 8, "team": 5},
    "pillar3_diagnosis": {"pain_point": 4}
  }
}

EXAMPLE 3: Handling Vague Input
───────────────────────────────
User input: "idk, not really sure"

Output:
{
  "step_id": "discovery",
  "message": "I get it — sometimes it's hard to pinpoint the problem when you're deep in the day-to-day.\\n\\nLet me simplify: if you could snap your fingers and fix ONE thing tomorrow, what would it be?",
  "mode": "mixed",
  "options": [
    {"key": "more_leads", "label": "Get more qualified leads"},
    {"key": "close_faster", "label": "Close deals faster"},
    {"key": "stop_losing", "label": "Stop losing deals that seemed closed"},
    {"key": "hire_sales", "label": "Finally hire a sales rep that works"},
    {"key": "something_else", "label": "It's something else"}
  ],
  "allow_text": true,
  "confidence_update": {}
}

EXAMPLE 4: PRE-FINISH Summary
─────────────────────────────
Context: confidence_score = 82, all pillars explored

Output:
{
  "step_id": "pre_finish",
  "message": "**Diagnosis Complete** ✅\\n\\n**Here's what I've learned about your situation:**\\n\\n📊 **Company**: $300K ARR, team of 4, growing but constrained\\n🎯 **Go-to-Market**: Outbound-first via LinkedIn, ICP = agencies 10-50 people\\n🔴 **Problem #1**: Founder-Led Sales Trap — the founder is the bottleneck\\n🔴 **Problem #2**: No documented discovery process\\n🔴 **Problem #3**: CRM used as a contact list, not a pipeline tool\\n\\n**My hypothesis**: The main blocker isn't lead generation — it's the inability to transfer the 'founder magic' into a repeatable process. Until you solve this, every sales hire will fail.\\n\\n---\\n\\nI have enough to generate your **Strategic Growth Plan** — a document with detailed diagnosis and a 90-day action plan.\\n\\nReady to proceed?",
  "mode": "buttons",
  "options": [
    {"key": "download_report", "label": "📥 Generate Strategic Growth Plan"},
    {"key": "add_context", "label": "Wait, I want to add more context"},
    {"key": "correct_diagnosis", "label": "I need to correct something"}
  ],
  "allow_text": false,
  "confidence_update": {
    "pillar4_solution": {"validated": 8}
  }
}

═══════════════════════════════════════════════════════════════════════════════
END OF SYSTEM PROMPT
═══════════════════════════════════════════════════════════════════════════════
`;
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
  
  const withPercentage = pillars.map(p => ({
    ...p,
    percentage: (p.score / p.max) * 100
  }));
  
  withPercentage.sort((a, b) => a.percentage - b.percentage);
  
  return `${withPercentage[0].name} (${withPercentage[0].score}/${withPercentage[0].max})`;
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
        { key: "tell_more", label: "Let me explain further" },
        { key: "continue_discovery", label: "Continue with questions" }
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
      return sendSafeResponse("⚠️ Configuration error: Gemini API Key missing.");
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
1. Acknowledge what the company does (use Description as truth if provided)
2. Make 2-3 specific assumptions about their business
3. Do NOT mention React, Tailwind, Vercel, or any tech stack
4. End with: "Did I get this right? Anything I should correct before we dive in?"
5. Provide confirmation options (not generic "Continue")`;

    } else if (confidence.ready_for_finish) {
      userText = `[FINISH REQUIRED]
Confidence Score: ${confidence.total_score}/100
Turn Count: ${turnCount}

TASK: Summarize all findings and offer the Strategic Growth Plan.
1. Present structured summary with emojis (📊🎯🔴)
2. List top 3 problems identified
3. State your hypothesis
4. First option MUST be: {"key": "download_report", "label": "📥 Generate Strategic Growth Plan"}`;

    } else {
      userText = `[CONTINUE DISCOVERY]
User input: "${choice}"
Current Score: ${confidence.total_score}/100
Lowest Pillar: ${getLowestPillar(confidence)}

TASK: 
1. Process user's input and update confidence scores
2. Identify missing information (focus on lowest pillar)
3. Ask ONE strategic question
4. Provide 3-5 SPECIFIC options (never "Continue" or "Next")
5. If user was vague, simplify and re-ask with clearer options`;
    }

    const allMessages = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Understood. I am the Revenue Architect. I will focus on business strategy, respond in the user\'s language, ignore tech details, and follow the confidence scoring system strictly.' }] },
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

    // Confidence Update Logic (Cumulative - only increase, never decrease)
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
        { key: "tell_more", label: "Let me explain further" },
        { key: "continue_discovery", label: "Ask the next question" },
        { key: "different_topic", label: "Let's talk about something else" }
      ];
    }
    
    // Remove generic options that slipped through
    const genericKeys = ['continue', 'next', 'ok', 'yes', 'no'];
    json.options = json.options.filter(opt => 
      !genericKeys.includes(opt.key.toLowerCase()) ||
      opt.label.length > 20 // Allow if label is specific enough
    );
    
    // Ensure at least 3 options
    while (json.options.length < 3) {
      json.options.push({ key: "other", label: "Other — let me explain" });
    }
    
    // Remove duplicates
    const seenKeys = new Set();
    json.options = json.options.filter(opt => {
      if (seenKeys.has(opt.key)) return false;
      seenKeys.add(opt.key);
      return true;
    });

    // Finalize response
    json.confidence_state = confidence;
    json.allow_text = json.mode === 'mixed' || json.allow_text === true;
    
    // Force FINISH state if ready
    if (confidence.ready_for_finish || json.step_id === 'FINISH') {
      json.step_id = 'FINISH';
      json.options = [
        { key: "download_report", label: "📥 Download Strategic Growth Plan" },
        { key: "add_context", label: "Wait, I want to add more context" },
        { key: "correct_something", label: "I need to correct something" }
      ];
      json.allow_text = false;
    }

    log('📤', `Response: step_id=${json.step_id}, score=${confidence.total_score}, options=${json.options.length}`);
    return res.status(200).json(json);

  } catch (error) { 
    console.error("Server Error:", error);
    return sendSafeResponse(
      "I encountered a technical issue. Tell me: what's the main challenge you're facing with your business right now?",
      "mixed",
      [
        { key: "lead_gen", label: "Generating more leads" },
        { key: "conversion", label: "Improving conversion" },
        { key: "retention", label: "Retaining customers" },
        { key: "scaling", label: "Scaling the team" },
        { key: "other", label: "Something else" }
      ]
    );
  }
}
