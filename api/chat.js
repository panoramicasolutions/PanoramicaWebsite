// ═══════════════════════════════════════════════════════════════════════════════
// REVENUE ARCHITECT - v6.0 FINAL
// 
// Complete rewrite fixing:
// - Context loss between turns
// - Phases advancing too fast
// - Shallow non-technical questions
// - "Add context" loop bug
// - Missing references/links
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: PHASE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const PHASES = {
  welcome:     { order: 0, next: 'company',   minQuestions: 0, label: 'Welcome' },
  company:     { order: 1, next: 'gtm',       minQuestions: 3, label: 'Company Context' },
  gtm:         { order: 2, next: 'sales',     minQuestions: 3, label: 'Go-to-Market' },
  sales:       { order: 3, next: 'diagnosis',  minQuestions: 3, label: 'Sales Engine' },
  diagnosis:   { order: 4, next: 'pre_finish', minQuestions: 2, label: 'Diagnosis' },
  pre_finish:  { order: 5, next: 'finish',     minQuestions: 0, label: 'Summary' },
  finish:      { order: 6, next: null,          minQuestions: 0, label: 'Report' },
  add_context: { order: -1, next: null,         minQuestions: 0, label: 'Adding Context' }
};

// Questions bank per phase - each question has a depth level
// The agent will pick from these and adapt to context
const QUESTION_BANK = {
  company: [
    { id: 'c1', topic: 'stage_and_model', depth: 1, prompt: 'What stage is the company at? Business model? (SaaS, services, marketplace, etc.)' },
    { id: 'c2', topic: 'revenue_details', depth: 1, prompt: 'Revenue details: current MRR/ARR, growth rate month-over-month, trajectory' },
    { id: 'c3', topic: 'team_structure', depth: 1, prompt: 'Team: how many people, key roles, any recent hires or gaps' },
    { id: 'c4', topic: 'funding_runway', depth: 2, prompt: 'Funding status and runway: bootstrapped, raised, profitable?' },
    { id: 'c5', topic: 'unit_economics', depth: 2, prompt: 'Unit economics: LTV, CAC, gross margin, payback period' },
    { id: 'c6', topic: 'tech_product', depth: 2, prompt: 'Product maturity: MVP, product-market fit achieved, retention metrics' },
    { id: 'c7', topic: 'competitive_landscape', depth: 3, prompt: 'Competitive landscape: main competitors, differentiation, moat' }
  ],
  gtm: [
    { id: 'g1', topic: 'icp_definition', depth: 1, prompt: 'ICP: who is the ideal buyer? Job title, company size, industry, budget' },
    { id: 'g2', topic: 'channels_mix', depth: 1, prompt: 'Acquisition channels: what channels are you using? Which work best?' },
    { id: 'g3', topic: 'sales_motion', depth: 1, prompt: 'Sales motion: inbound, outbound, PLG, partner, or mixed?' },
    { id: 'g4', topic: 'messaging_positioning', depth: 2, prompt: 'Positioning: painkiller or vitamin? How do you describe the value in one sentence?' },
    { id: 'g5', topic: 'content_strategy', depth: 2, prompt: 'Content/marketing: what content do you produce? SEO, social, paid ads?' },
    { id: 'g6', topic: 'deal_metrics', depth: 2, prompt: 'Deal metrics: average deal size, sales cycle length, conversion rates at each stage' },
    { id: 'g7', topic: 'pipeline_coverage', depth: 3, prompt: 'Pipeline: current pipeline value, coverage ratio, pipeline velocity' },
    { id: 'g8', topic: 'attribution', depth: 3, prompt: 'Attribution: do you know which channel generates the best ROI? How do you track?' }
  ],
  sales: [
    { id: 's1', topic: 'sales_process', depth: 1, prompt: 'Sales process: what are the stages from first touch to close? Is it documented?' },
    { id: 's2', topic: 'founder_involvement', depth: 1, prompt: 'Who closes deals? Founder, sales team, or self-serve? What percentage each?' },
    { id: 's3', topic: 'bottlenecks', depth: 1, prompt: 'Where do deals get stuck or die? Most common objections?' },
    { id: 's4', topic: 'win_loss', depth: 2, prompt: 'Win/loss analysis: win rate, why you win vs lose, lost deal follow-up?' },
    { id: 's5', topic: 'tools_crm', depth: 2, prompt: 'Tools: CRM used, automation, data quality, reporting cadence' },
    { id: 's6', topic: 'onboarding_churn', depth: 2, prompt: 'Post-sale: onboarding process, time to value, churn rate, expansion revenue' },
    { id: 's7', topic: 'sales_enablement', depth: 3, prompt: 'Enablement: playbooks, training, call recordings, objection handlers?' },
    { id: 's8', topic: 'forecasting', depth: 3, prompt: 'Forecasting: how do you predict revenue? Accuracy of forecasts?' }
  ],
  diagnosis: [
    { id: 'd1', topic: 'pain_validation', depth: 1, prompt: 'Validate the diagnosed problems: do they resonate? What is most urgent?' },
    { id: 'd2', topic: 'priority_ranking', depth: 1, prompt: 'Priority: if you could fix only ONE thing in the next 90 days, what would it be?' },
    { id: 'd3', topic: 'resources_constraints', depth: 2, prompt: 'Constraints: budget, team capacity, timeline, political blockers?' },
    { id: 'd4', topic: 'past_attempts', depth: 2, prompt: 'What have you already tried to fix these problems? What worked/didn\'t?' }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: MASTER SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

function buildMasterPrompt(session) {
  const p = session.profile;
  const phase = session.currentPhase;
  
  return `
═══════════════════════════════════════════════════════════════════════════════
REVENUE ARCHITECT - SYSTEM INSTRUCTIONS (v6.0)
═══════════════════════════════════════════════════════════════════════════════

You are the **Revenue Architect**, a senior Revenue Operations strategist with 15+ years of experience working with 200+ B2B companies from seed stage to $100M+ ARR. You diagnose revenue bottlenecks and deliver actionable growth strategies.

═══════════════════════════════════════════════════════════════════════════════
1. IDENTITY & TONE
═══════════════════════════════════════════════════════════════════════════════

PERSONA:
- Senior consultant, strategic thinker
- Direct, specific, never generic
- Back every insight with a CONCRETE real-world example
- Think in systems: every problem has upstream causes and downstream effects

TONE:
- Professional but warm (trusted advisor, not cold analyst)
- Use "you/your" language, address the user directly
- Be confident in your analysis but open to correction
- NEVER say "interesting" or "great question" — add value instead

LANGUAGE: Always respond in the SAME language the user uses. If they write Italian, you respond in Italian. If English, respond in English.

RESPONSE DEPTH:
- MINIMUM 4-5 sentences per response
- ALWAYS include at least ONE concrete real-world example with specifics
- When relevant, include industry benchmarks (cite the source mentally)
- When recommending tools/frameworks, include brief reasoning
- Provide links to relevant resources when applicable (use real, well-known URLs like HubSpot blog, Gartner, SaaStr, First Round Review, Lenny's Newsletter, etc.)

═══════════════════════════════════════════════════════════════════════════════
2. CURRENT SESSION STATE
═══════════════════════════════════════════════════════════════════════════════

CURRENT PHASE: ${phase.toUpperCase()}
TURN COUNT: ${session.turnCount}
QUESTIONS ASKED THIS PHASE: ${session.phaseQuestionCount} / ${PHASES[phase]?.minQuestions || 0} minimum

COMPLETE BUSINESS PROFILE (everything learned so far):
─────────────────────────────────────────────────────

COMPANY:
- Name: ${p.companyName || '❓ NOT YET KNOWN'}
- Website: ${p.website || '❓'}
- Industry: ${p.industry || '❓ NOT YET KNOWN'}
- Business Model: ${p.businessModel || '❓ NOT YET KNOWN'}
- Stage: ${p.stage || '❓ NOT YET KNOWN'}
- Revenue: ${p.revenue || '❓ NOT YET KNOWN'}
- Revenue Growth: ${p.revenueGrowth || '❓'}
- Team Size: ${p.teamSize || '❓ NOT YET KNOWN'}
- Team Roles: ${p.teamRoles || '❓'}
- Funding: ${p.funding || '❓'}
- Founded: ${p.founded || '❓'}

PRODUCT:
- Description: ${p.productDescription || '❓ NOT YET KNOWN'}
- Product Stage: ${p.productStage || '❓'}
- Key Features: ${p.keyFeatures || '❓'}
- Pricing Model: ${p.pricingModel || '❓'}
- Pricing Range: ${p.pricingRange || '❓'}

GO-TO-MARKET:
- ICP Title: ${p.icpTitle || '❓ NOT YET KNOWN'}
- ICP Company Size: ${p.icpCompanySize || '❓'}
- ICP Industry: ${p.icpIndustry || '❓'}
- ICP Pain Points: ${p.icpPainPoints || '❓'}
- Sales Motion: ${p.salesMotion || '❓ NOT YET KNOWN'}
- Primary Channels: ${p.channels || '❓ NOT YET KNOWN'}
- Best Channel: ${p.bestChannel || '❓'}
- Avg Deal Size: ${p.avgDealSize || '❓'}
- Sales Cycle: ${p.salesCycle || '❓'}
- CAC: ${p.cac || '❓'}
- LTV: ${p.ltv || '❓'}

SALES ENGINE:
- Sales Process: ${p.salesProcess || '❓ NOT YET KNOWN'}
- Process Documented: ${p.processDocumented || '❓'}
- Who Closes Deals: ${p.whoCloses || '❓ NOT YET KNOWN'}
- Founder Involvement: ${p.founderInvolvement || '❓'}
- Win Rate: ${p.winRate || '❓'}
- Main Objections: ${p.mainObjections || '❓'}
- Lost Deal Reasons: ${p.lostDealReasons || '❓'}
- CRM Used: ${p.crm || '❓'}
- Churn Rate: ${p.churnRate || '❓'}
- Main Bottleneck: ${p.mainBottleneck || '❓ NOT YET KNOWN'}

DIAGNOSIS:
- Problems Identified: ${p.diagnosedProblems?.length > 0 ? p.diagnosedProblems.join(' | ') : '❓ NOT YET DIAGNOSED'}
- Root Causes: ${p.rootCauses?.length > 0 ? p.rootCauses.join(' | ') : '❓'}
- User Validated: ${p.validatedProblems?.length > 0 ? p.validatedProblems.join(' | ') : '❓'}
- User Priority: ${p.userPriority || '❓'}
- Past Attempts: ${p.pastAttempts || '❓'}
- Constraints: ${p.constraints || '❓'}

─────────────────────────────────────────────────────
CONVERSATION HISTORY SUMMARY (what happened so far):
${session.conversationLog.length > 0 ? session.conversationLog.map((entry, i) => `  Turn ${i + 1}: ${entry}`).join('\n') : '  No history yet.'}
─────────────────────────────────────────────────────

SCRAPED DATA FROM WEBSITE:
${session.scrapedSummary || 'No data scraped yet.'}

QUESTIONS ALREADY ASKED (DO NOT REPEAT THESE):
${session.questionsAsked.length > 0 ? session.questionsAsked.map(q => `  ✓ ${q}`).join('\n') : '  None yet.'}

═══════════════════════════════════════════════════════════════════════════════
3. PHASE-SPECIFIC INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

${getPhaseInstructions(phase, session)}

═══════════════════════════════════════════════════════════════════════════════
4. OUTPUT FORMAT (STRICT JSON)
═══════════════════════════════════════════════════════════════════════════════

You MUST output valid JSON with this structure:

{
  "message": "Your response in markdown format. Include examples, benchmarks, links where relevant.",
  
  "profile_updates": {
    "fieldName": "value learned from this turn"
  },
  
  "question_asked": "Brief description of the question you asked (for tracking)",
  
  "insight_logged": "One-sentence summary of what you learned this turn",
  
  "phase_complete": false,
  
  "options": [
    {"key": "unique_key", "label": "Specific actionable label (not generic)"}
  ]
}

OPTION RULES:
- 4-5 options per turn
- NEVER use generic labels like "Continue", "Next", "Tell me more"
- Each option should be a SPECIFIC answer to your question
- Include one "other/custom" option for free text
- If phase is diagnosis: include validation options (agree/disagree/partial)

═══════════════════════════════════════════════════════════════════════════════
5. CRITICAL RULES
═══════════════════════════════════════════════════════════════════════════════

1. NEVER repeat a question already asked (check the list above)
2. NEVER skip to diagnosis before having enough data (❓ marks above = gaps)
3. ALWAYS reference the profile data when making observations
4. When user says "all of the above" → acknowledge EACH option specifically
5. Include at least ONE relevant link per response when discussing strategies
6. Set phase_complete: true ONLY when minQuestions for current phase are met
7. If many ❓ remain in the profile → you need more questions, not less
8. In profile_updates, use the EXACT field names from the profile above
`;
}

function getPhaseInstructions(phase, session) {
  switch (phase) {
    case 'welcome':
      return `
PHASE: WELCOME
─────────────
Create a personalized welcome using ALL scraped data available.

STRUCTURE:
1. Greeting + company name
2. What you found on their website (reference SPECIFIC headlines, pricing, social proof)
3. LinkedIn data if available
4. 3-4 BOLD assumptions with evidence ("I see X on your site, which tells me Y")
5. End with: "Did I get this right? What should I correct?"

After this message, set phase_complete: true to advance to Company phase.
Options should be: confirm / partially correct / mostly wrong
`;

    case 'company':
      return `
PHASE: COMPANY DISCOVERY (need ${PHASES.company.minQuestions} questions minimum)
─────────────────────────
Currently asked: ${session.phaseQuestionCount} questions in this phase.
${session.phaseQuestionCount < PHASES.company.minQuestions ? `⚠️ NEED ${PHASES.company.minQuestions - session.phaseQuestionCount} MORE QUESTIONS before advancing.` : '✅ Minimum met. Can advance when ready.'}

GOAL: Fill in ALL company fields marked ❓ in the profile.

TOPICS STILL NEEDED:
${!session.profile.stage ? '- Company stage (pre-revenue, seed, growth, etc.)' : ''}
${!session.profile.revenue ? '- Revenue details (MRR/ARR, growth rate)' : ''}
${!session.profile.teamSize ? '- Team size and composition' : ''}
${!session.profile.businessModel ? '- Business model details' : ''}
${!session.profile.funding ? '- Funding status' : ''}
${!session.profile.productDescription ? '- Product description in their words' : ''}

APPROACH:
1. Acknowledge what user just said with a SPECIFIC insight
2. Connect it to a real-world example: "Companies at your stage typically face X. For example, [Company] dealt with..."
3. Ask ONE targeted question about the MOST important missing field
4. Include relevant benchmarks: "The median B2B SaaS at your stage has X% gross margin (source: OpenView Partners)"

When ALL critical fields have values → set phase_complete: true
`;

    case 'gtm':
      return `
PHASE: GO-TO-MARKET DISCOVERY (need ${PHASES.gtm.minQuestions} questions minimum)
─────────────────────────────
Currently asked: ${session.phaseQuestionCount} questions in this phase.
${session.phaseQuestionCount < PHASES.gtm.minQuestions ? `⚠️ NEED ${PHASES.gtm.minQuestions - session.phaseQuestionCount} MORE QUESTIONS before advancing.` : '✅ Minimum met. Can advance when ready.'}

GOAL: Understand the complete go-to-market motion.

TOPICS STILL NEEDED:
${!session.profile.icpTitle ? '- ICP: WHO is the ideal buyer (title, seniority)' : ''}
${!session.profile.icpCompanySize ? '- ICP: WHAT companies (size, industry, budget)' : ''}
${!session.profile.salesMotion ? '- Sales motion type (inbound/outbound/PLG/hybrid)' : ''}
${!session.profile.channels ? '- Acquisition channels and which works best' : ''}
${!session.profile.avgDealSize ? '- Average deal size and sales cycle' : ''}
${!session.profile.pricingModel ? '- Pricing model and strategy' : ''}

APPROACH:
1. Build on company context already gathered
2. Use GTM-specific frameworks: "Based on your deal size of X, the typical motion is Y"
3. Include benchmarks: "PLG companies typically see 2-5% free-to-paid conversion (source: Lenny Rachitsky)"
4. Reference relevant tools: "For outbound at your stage, tools like Apollo.io or Lemlist are common"
5. Include links to GTM resources when relevant

When ALL critical GTM fields have values → set phase_complete: true
`;

    case 'sales':
      return `
PHASE: SALES ENGINE DISCOVERY (need ${PHASES.sales.minQuestions} questions minimum)
──────────────────────────────
Currently asked: ${session.phaseQuestionCount} questions in this phase.
${session.phaseQuestionCount < PHASES.sales.minQuestions ? `⚠️ NEED ${PHASES.sales.minQuestions - session.phaseQuestionCount} MORE QUESTIONS before advancing.` : '✅ Minimum met. Can advance when ready.'}

GOAL: Map the entire sales engine and find the bottleneck.

TOPICS STILL NEEDED:
${!session.profile.salesProcess ? '- Sales process (stages, documentation)' : ''}
${!session.profile.whoCloses ? '- Who closes deals (founder, team, self-serve)' : ''}
${!session.profile.mainBottleneck ? '- Main bottleneck (where deals die)' : ''}
${!session.profile.winRate ? '- Win rate and lost deal reasons' : ''}
${!session.profile.crm ? '- CRM and tools used' : ''}
${!session.profile.churnRate ? '- Churn rate and retention' : ''}

APPROACH:
1. Look for the "Founder-Led Sales Trap" pattern
2. Use specific diagnostic questions: "When a deal stalls, what specifically happens?"
3. Include real examples: "A client at $400K ARR had founder closing 90% of deals..."
4. Reference frameworks: "The MEDDIC qualification framework could help here"
5. Suggest tools when relevant: "Gong or Chorus for call recording, HubSpot for pipeline tracking"

When ALL critical sales fields have values → set phase_complete: true
`;

    case 'diagnosis':
      return `
PHASE: DIAGNOSIS (need ${PHASES.diagnosis.minQuestions} questions minimum)
──────────────────
Currently asked: ${session.phaseQuestionCount} questions in this phase.

GOAL: Present your diagnosis and validate with user.

INSTRUCTIONS:
1. Synthesize ALL profile data into a clear diagnosis
2. Identify TOP 3 revenue blockers with root causes
3. Present them in priority order with:
   - What the problem is
   - Why it's happening (root cause)
   - Revenue impact estimate
   - What good looks like (benchmark)
4. State your CORE HYPOTHESIS
5. Ask user to validate: "Does this resonate?"
6. Include links to relevant frameworks/resources for each problem

DO NOT ask more discovery questions. PRESENT YOUR FINDINGS.
After user validates → set phase_complete: true
`;

    case 'pre_finish':
      return `
PHASE: PRE-FINISH SUMMARY
──────────────────────────
Present the complete summary and offer report generation.

STRUCTURE:
1. Company snapshot (2-3 sentences)
2. Top 3 diagnosed problems (prioritized)
3. Core hypothesis
4. Preview of what the report will contain
5. Offer to generate OR add more context

Options MUST include:
- {"key": "generate_report", "label": "📥 Generate Strategic Growth Plan"}
- {"key": "add_context", "label": "Wait, I want to add important context"}
- {"key": "correct_diagnosis", "label": "One of the findings needs correction"}
`;

    case 'add_context':
      return `
PHASE: ADD CONTEXT (user wants to add more information)
───────────────────
The user clicked "add context" or "correct something" AFTER the diagnosis.

YOUR TASK:
1. Ask SPECIFICALLY what they want to add or correct
2. Listen to their input
3. Update the profile with new information
4. After they've added their context, present an UPDATED diagnosis
5. Then offer report generation again

DO NOT:
- Re-ask questions you already asked
- Ignore their correction
- Loop back to the beginning
- Offer report immediately without addressing their input

After addressing their input and updating diagnosis → move to pre_finish
`;

    default:
      return 'Continue the conversation naturally based on context.';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

function createSession() {
  return {
    currentPhase: 'welcome',
    turnCount: 0,
    phaseQuestionCount: 0,
    
    // Detailed profile - every field tracked
    profile: {
      companyName: '',
      website: '',
      industry: '',
      businessModel: '',
      stage: '',
      revenue: '',
      revenueGrowth: '',
      teamSize: '',
      teamRoles: '',
      funding: '',
      founded: '',
      productDescription: '',
      productStage: '',
      keyFeatures: '',
      pricingModel: '',
      pricingRange: '',
      icpTitle: '',
      icpCompanySize: '',
      icpIndustry: '',
      icpPainPoints: '',
      salesMotion: '',
      channels: '',
      bestChannel: '',
      avgDealSize: '',
      salesCycle: '',
      cac: '',
      ltv: '',
      salesProcess: '',
      processDocumented: '',
      whoCloses: '',
      founderInvolvement: '',
      winRate: '',
      mainObjections: '',
      lostDealReasons: '',
      crm: '',
      churnRate: '',
      mainBottleneck: '',
      diagnosedProblems: [],
      rootCauses: [],
      validatedProblems: [],
      userPriority: '',
      pastAttempts: '',
      constraints: ''
    },
    
    // Tracking
    questionsAsked: [],
    conversationLog: [],
    scrapedSummary: '',
    
    // Phase history for add_context
    phaseBeforeAddContext: '',
    addContextReason: ''
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: SCRAPING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

async function scrapeWebsite(url) {
  try {
    const targetUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 12000);
    
    const response = await fetch(targetUrl.href, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: controller.signal
    });
    
    const html = await response.text();
    
    const extract = (regex, fallback = '') => {
      const match = html.match(regex);
      return match ? match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : fallback;
    };
    
    const extractAll = (regex, limit = 6) => {
      return [...html.matchAll(regex)]
        .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
        .filter(t => t.length > 2 && t.length < 200)
        .slice(0, limit);
    };
    
    return {
      title: extract(/<title[^>]*>([^<]+)<\/title>/i),
      description: extract(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i) || 
                   extract(/<meta[^>]*content="([^"]*)"[^>]*name="description"/i),
      h1s: extractAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi),
      h2s: extractAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, 8),
      paragraphs: [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
        .filter(t => t.length > 40 && t.length < 500)
        .slice(0, 5),
      pricing: [...new Set(html.match(/(\$|€|£)\s*\d+[,.]?\d*/g) || [])].slice(0, 5),
      socialProof: [
        ...(html.match(/(\d+[,.]?\d*[kK]?\+?)\s*(customers?|users?|companies|clients)/gi) || []),
        ...(html.match(/trusted by[^<]{0,80}/gi) || [])
      ].slice(0, 4)
    };
  } catch (e) {
    console.log(`[Scrape] Failed: ${e.message}`);
    return null;
  }
}

async function scrapeLinkedIn(linkedinUrl, tavilyKey) {
  if (!linkedinUrl || !tavilyKey) return null;
  try {
    const slug = linkedinUrl.match(/linkedin\.com\/company\/([^\/\?]+)/i)?.[1];
    if (!slug) return null;
    
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: `"${slug}" site:linkedin.com company employees industry`,
        search_depth: "advanced",
        max_results: 3,
        include_answer: true
      })
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    
    return {
      companyName: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      employees: data.answer?.match(/(\d+[\-–]?\d*)\s*(employees?|people)/i)?.[0] || '',
      industry: data.answer?.match(/(?:industry|sector):\s*([^.]+)/i)?.[1]?.trim() || '',
      description: data.answer?.slice(0, 400) || ''
    };
  } catch (e) {
    console.log(`[LinkedIn] Failed: ${e.message}`);
    return null;
  }
}

function buildScrapedSummary(website, linkedin, contextData) {
  let summary = '';
  
  if (contextData?.description) {
    summary += `USER DESCRIPTION (HIGHEST PRIORITY): "${contextData.description}"\n\n`;
  }
  
  if (website) {
    summary += `WEBSITE (${contextData?.website || ''}):\n`;
    summary += `  Title: ${website.title}\n`;
    summary += `  Description: ${website.description}\n`;
    summary += `  Headlines: ${website.h1s?.join(' | ') || 'None'}\n`;
    summary += `  Sections: ${website.h2s?.join(' | ') || 'None'}\n`;
    summary += `  Key Content: ${website.paragraphs?.slice(0, 2).join(' ') || 'None'}\n`;
    summary += `  Pricing: ${website.pricing?.join(', ') || 'None found'}\n`;
    summary += `  Social Proof: ${website.socialProof?.join(' | ') || 'None found'}\n\n`;
  }
  
  if (linkedin) {
    summary += `LINKEDIN:\n`;
    summary += `  Company: ${linkedin.companyName}\n`;
    summary += `  Employees: ${linkedin.employees || 'Unknown'}\n`;
    summary += `  Industry: ${linkedin.industry || 'Unknown'}\n`;
    summary += `  Description: ${linkedin.description || 'None'}\n`;
  }
  
  return summary || 'No scraped data available.';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: LLM CALLER
// ═══════════════════════════════════════════════════════════════════════════════

async function callLLM(systemPrompt, userMessage, history, geminiKey) {
  const messages = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I will follow all instructions precisely, output valid JSON, and never repeat questions.' }] }
  ];
  
  // Add conversation history (last 12 exchanges for full context)
  const recentHistory = history.slice(-12);
  for (const msg of recentHistory) {
    let content = msg.content;
    if (msg.role === 'assistant') {
      try { content = JSON.parse(content).message || content; } catch {}
    }
    messages.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: content }]
    });
  }
  
  messages.push({ role: 'user', parts: [{ text: userMessage }] });
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
          maxOutputTokens: 2500
        }
      })
    }
  );
  
  if (!response.ok) throw new Error(`Gemini API: ${response.status}`);
  
  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response");
  
  text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(text);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: PHASE TRANSITION LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

function shouldAdvancePhase(session, llmResponse) {
  const phase = session.currentPhase;
  const phaseConfig = PHASES[phase];
  
  if (!phaseConfig) return false;
  
  // Welcome always advances after first response
  if (phase === 'welcome') return true;
  
  // Add context: advance when user has provided their input
  if (phase === 'add_context') {
    return llmResponse.phase_complete === true;
  }
  
  // Check minimum questions met
  if (session.phaseQuestionCount < phaseConfig.minQuestions) {
    return false;
  }
  
  // Check if LLM says phase is complete
  if (llmResponse.phase_complete === true) {
    return true;
  }
  
  // Safety: force advance after too many questions in one phase
  if (session.phaseQuestionCount >= phaseConfig.minQuestions + 3) {
    return true;
  }
  
  // Safety: force to pre_finish after turn 15
  if (session.turnCount >= 15 && phase !== 'pre_finish' && phase !== 'finish') {
    return true;
  }
  
  return false;
}

function advancePhase(session) {
  const current = session.currentPhase;
  
  // Special case: returning from add_context
  if (current === 'add_context') {
    session.currentPhase = 'pre_finish';
    session.phaseQuestionCount = 0;
    return;
  }
  
  const nextPhase = PHASES[current]?.next;
  if (nextPhase) {
    session.currentPhase = nextPhase;
    session.phaseQuestionCount = 0;
  }
}

function updateProfile(session, updates) {
  if (!updates || typeof updates !== 'object') return;
  
  for (const [key, value] of Object.entries(updates)) {
    if (value && session.profile.hasOwnProperty(key)) {
      // Arrays: append
      if (Array.isArray(session.profile[key]) && Array.isArray(value)) {
        session.profile[key] = [...new Set([...session.profile[key], ...value])];
      } else if (Array.isArray(session.profile[key]) && typeof value === 'string') {
        if (!session.profile[key].includes(value)) {
          session.profile[key].push(value);
        }
      } else if (typeof value === 'string' && value.trim()) {
        // Only update if new value is non-empty and adds information
        if (!session.profile[key] || value.length > session.profile[key].length) {
          session.profile[key] = value;
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: OPTIONS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateOptions(options, phase) {
  if (!options || !Array.isArray(options) || options.length < 2) {
    return getDefaultOptions(phase);
  }
  
  // Remove garbage options
  const filtered = options.filter(o => 
    o.key && o.label && 
    o.label.length > 5 &&
    !['continue', 'next', 'ok', 'yes'].includes(o.key.toLowerCase())
  );
  
  if (filtered.length < 2) return getDefaultOptions(phase);
  
  return filtered.slice(0, 5);
}

function getDefaultOptions(phase) {
  const defaults = {
    welcome: [
      { key: 'confirm_correct', label: 'Yes, that\'s accurate' },
      { key: 'partially_correct', label: 'Close, but let me clarify some things' },
      { key: 'mostly_wrong', label: 'Actually, the situation is quite different' }
    ],
    company: [
      { key: 'pre_revenue', label: 'We\'re pre-revenue or very early' },
      { key: 'early_revenue', label: '$0-100K ARR range' },
      { key: 'growth', label: '$100K-$1M ARR and growing' },
      { key: 'scaling', label: 'Over $1M ARR, scaling up' },
      { key: 'other_stage', label: 'Let me explain our situation' }
    ],
    gtm: [
      { key: 'mostly_inbound', label: 'Mostly inbound (content, SEO, referrals)' },
      { key: 'mostly_outbound', label: 'Mostly outbound (cold email, LinkedIn)' },
      { key: 'product_led', label: 'Product-led (free trial, freemium)' },
      { key: 'mixed_channels', label: 'Mix of multiple channels' },
      { key: 'figuring_out', label: 'Still figuring out what works' }
    ],
    sales: [
      { key: 'founder_closes', label: 'Founder still closes most deals' },
      { key: 'team_closes', label: 'Sales team handles most deals' },
      { key: 'self_serve', label: 'Mostly self-serve / product-led' },
      { key: 'no_process', label: 'No formal sales process yet' },
      { key: 'other_setup', label: 'Different setup - let me explain' }
    ],
    diagnosis: [
      { key: 'resonates', label: 'Yes, this diagnosis resonates strongly' },
      { key: 'partially_right', label: 'Partially right - let me refine' },
      { key: 'missed_something', label: 'You missed an important issue' },
      { key: 'wrong_priority', label: 'Right problems, wrong priority order' }
    ],
    pre_finish: [
      { key: 'generate_report', label: '📥 Generate Strategic Growth Plan' },
      { key: 'add_context', label: 'Wait, I want to add important context' },
      { key: 'correct_diagnosis', label: 'One finding needs correction' }
    ],
    add_context: [
      { key: 'done_adding', label: 'I\'ve shared everything, update the diagnosis' },
      { key: 'more_to_add', label: 'I have more to add' },
      { key: 'correct_specific', label: 'I need to correct a specific point' }
    ]
  };
  
  return defaults[phase] || defaults.company;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: MAIN API HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sendError = (msg) => res.status(200).json({
    step_id: 'error',
    message: msg || "Something went wrong. What's your main revenue challenge right now?",
    mode: 'mixed',
    options: [
      { key: 'lead_gen', label: 'Not enough qualified leads' },
      { key: 'conversion', label: 'Leads aren\'t converting' },
      { key: 'scaling', label: 'Can\'t scale beyond founder selling' },
      { key: 'churn', label: 'Losing customers too quickly' }
    ],
    allow_text: true,
    session_data: null
  });

  try {
    const { choice, history = [], contextData, sessionData: inputSession } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;
    
    if (!geminiKey) return sendError('Configuration error: API key missing.');

    // Initialize or restore session
    let session = inputSession || createSession();
    session.turnCount = history.filter(h => h.role === 'user').length;
    
    console.log(`[v6] Phase: ${session.currentPhase} | Turn: ${session.turnCount} | Choice: ${choice?.slice(0, 50)}`);

    // ─────────────────────────────────────────────────────
    // HANDLE SPECIAL INPUTS
    // ─────────────────────────────────────────────────────
    
    // "Add context" or "correct" from pre_finish
    const isAddContext = ['add_context', 'correct_diagnosis', 'correct_something', 'add_more'].some(k => 
      choice.toLowerCase().includes(k.toLowerCase())
    );
    
    if (isAddContext && (session.currentPhase === 'pre_finish' || session.currentPhase === 'finish')) {
      session.phaseBeforeAddContext = session.currentPhase;
      session.addContextReason = choice;
      session.currentPhase = 'add_context';
      session.phaseQuestionCount = 0;
      console.log('[v6] Entering add_context mode');
    }
    
    // "Done adding" from add_context → go back to pre_finish
    if (choice.toLowerCase().includes('done_adding') && session.currentPhase === 'add_context') {
      session.currentPhase = 'pre_finish';
      session.phaseQuestionCount = 0;
      console.log('[v6] Returning to pre_finish from add_context');
    }

    // ─────────────────────────────────────────────────────
    // WELCOME PHASE: SCRAPE & ANALYZE
    // ─────────────────────────────────────────────────────
    if (choice === 'SNAPSHOT_INIT' && contextData) {
      session.profile.website = contextData.website || '';
      session.profile.companyName = contextData.description?.split(' ').slice(0, 4).join(' ') || '';
      
      const websiteData = contextData.website ? await scrapeWebsite(contextData.website) : null;
      const linkedinData = contextData.linkedin ? await scrapeLinkedIn(contextData.linkedin, tavilyKey) : null;
      
      session.scrapedSummary = buildScrapedSummary(websiteData, linkedinData, contextData);
      
      // Pre-fill profile from scraping
      if (linkedinData) {
        session.profile.companyName = linkedinData.companyName || session.profile.companyName;
        if (linkedinData.industry) session.profile.industry = linkedinData.industry;
        if (linkedinData.employees) session.profile.teamSize = linkedinData.employees;
      }
      if (websiteData?.pricing?.length > 0) {
        session.profile.pricingRange = websiteData.pricing.join(', ');
      }
      if (contextData.description) {
        session.profile.productDescription = contextData.description;
      }
    }

    // ─────────────────────────────────────────────────────
    // BUILD PROMPT & CALL LLM
    // ─────────────────────────────────────────────────────
    const systemPrompt = buildMasterPrompt(session);
    
    let userMessage;
    if (choice === 'SNAPSHOT_INIT') {
      userMessage = `[NEW SESSION] Analyze all the scraped data and generate the welcome message. Follow the welcome phase instructions exactly.`;
    } else if (session.currentPhase === 'add_context') {
      userMessage = `[ADD CONTEXT MODE] The user wants to add or correct information.
User said: "${choice}"
Reason they came back: "${session.addContextReason}"

Ask specifically what they want to add/correct. Do NOT re-offer the report until they're done.
After they provide info, update profile_updates and set phase_complete: true.`;
    } else {
      userMessage = `[USER INPUT] "${choice}"

Process this input. Update profile_updates with ANY new information learned.
Current phase: ${session.currentPhase}
Questions asked this phase: ${session.phaseQuestionCount}/${PHASES[session.currentPhase]?.minQuestions || 0} minimum

Remember: check the profile for ❓ fields and ask about the most important missing one.`;
    }

    const llmResponse = await callLLM(systemPrompt, userMessage, history, geminiKey);

    // ─────────────────────────────────────────────────────
    // UPDATE SESSION FROM LLM RESPONSE
    // ─────────────────────────────────────────────────────
    
    // Update profile
    if (llmResponse.profile_updates) {
      updateProfile(session, llmResponse.profile_updates);
    }
    
    // Track question
    if (llmResponse.question_asked) {
      session.questionsAsked.push(llmResponse.question_asked);
      session.phaseQuestionCount++;
    }
    
    // Log conversation insight
    if (llmResponse.insight_logged) {
      session.conversationLog.push(llmResponse.insight_logged);
    } else {
      session.conversationLog.push(`Turn ${session.turnCount}: User said "${choice.slice(0, 60)}" in ${session.currentPhase} phase`);
    }

    // ─────────────────────────────────────────────────────
    // PHASE TRANSITION
    // ─────────────────────────────────────────────────────
    if (shouldAdvancePhase(session, llmResponse)) {
      const oldPhase = session.currentPhase;
      advancePhase(session);
      console.log(`[v6] Phase transition: ${oldPhase} → ${session.currentPhase}`);
    }

    // ─────────────────────────────────────────────────────
    // BUILD RESPONSE
    // ─────────────────────────────────────────────────────
    const options = validateOptions(llmResponse.options, session.currentPhase);
    
    // Calculate confidence
    const filled = Object.entries(session.profile).filter(([k, v]) => {
      if (Array.isArray(v)) return v.length > 0;
      return v && v !== '';
    }).length;
    const total = Object.keys(session.profile).length;
    const confidence = Math.round((filled / total) * 100);
    
    // Determine step_id for frontend
    let stepId = 'discovery';
    if (session.currentPhase === 'welcome') stepId = 'welcome';
    if (session.currentPhase === 'pre_finish') stepId = 'pre_finish';
    if (session.currentPhase === 'finish') stepId = 'FINISH';
    if (session.currentPhase === 'add_context') stepId = 'add_context';

    const response = {
      step_id: stepId,
      message: llmResponse.message,
      mode: session.currentPhase === 'pre_finish' ? 'buttons' : 'mixed',
      options,
      allow_text: session.currentPhase !== 'pre_finish',
      session_data: session,
      current_phase: session.currentPhase,
      turn_count: session.turnCount,
      confidence_state: {
        total: confidence,
        company: Object.entries(session.profile).filter(([k]) => 
          ['companyName','industry','businessModel','stage','revenue','teamSize','funding','productDescription'].includes(k)
        ).filter(([,v]) => v && v !== '').length * 3,
        gtm: Object.entries(session.profile).filter(([k]) => 
          ['icpTitle','salesMotion','channels','avgDealSize','pricingModel'].includes(k)
        ).filter(([,v]) => v && v !== '').length * 5,
        diagnosis: Object.entries(session.profile).filter(([k]) => 
          ['mainBottleneck','diagnosedProblems','rootCauses','validatedProblems'].includes(k)
        ).filter(([,v]) => (Array.isArray(v) ? v.length > 0 : v && v !== '')).length * 7,
        solution: session.profile.validatedProblems?.length > 0 ? 15 : 0
      }
    };

    console.log(`[v6] Response: phase=${session.currentPhase}, confidence=${confidence}%, fields_filled=${filled}/${total}`);
    
    return res.status(200).json(response);

  } catch (error) {
    console.error('[v6 FATAL]', error);
    return sendError();
  }
}
