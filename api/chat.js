// ═══════════════════════════════════════════════════════════════════════════════
// REVENUE ARCHITECT - MULTI-AGENT v5.0
// Fixed: Loop prevention, strict state machine, consolidated memory
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: STATE MACHINE & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Strict sequential phases - NO going back
const PHASES = {
  WELCOME: { order: 1, name: 'welcome', minTurns: 0, maxTurns: 1 },
  COMPANY: { order: 2, name: 'company', minTurns: 2, maxTurns: 4 },
  GTM: { order: 3, name: 'gtm', minTurns: 4, maxTurns: 7 },
  SALES: { order: 4, name: 'sales', minTurns: 6, maxTurns: 9 },
  DIAGNOSIS: { order: 5, name: 'diagnosis', minTurns: 8, maxTurns: 11 },
  PRE_FINISH: { order: 6, name: 'pre_finish', minTurns: 10, maxTurns: 12 },
  FINISH: { order: 7, name: 'finish', minTurns: 11, maxTurns: 15 }
};

// Questions we need answered (tracking to avoid repeats)
const REQUIRED_DATA_POINTS = {
  company: [
    { key: 'stage', question: 'company_stage', asked: false, answered: false },
    { key: 'revenue', question: 'revenue_range', asked: false, answered: false },
    { key: 'team_size', question: 'team_composition', asked: false, answered: false }
  ],
  gtm: [
    { key: 'icp', question: 'ideal_customer', asked: false, answered: false },
    { key: 'channels', question: 'acquisition_channels', asked: false, answered: false },
    { key: 'sales_motion', question: 'sales_motion_type', asked: false, answered: false }
  ],
  sales: [
    { key: 'process', question: 'sales_process', asked: false, answered: false },
    { key: 'bottleneck', question: 'main_bottleneck', asked: false, answered: false },
    { key: 'founder_role', question: 'founder_involvement', asked: false, answered: false }
  ],
  diagnosis: [
    { key: 'pain_validated', question: 'pain_validation', asked: false, answered: false },
    { key: 'priority', question: 'priority_confirmation', asked: false, answered: false }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: CONSOLIDATED MEMORY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

function createFreshSession() {
  return {
    // Current phase tracking
    currentPhase: 'welcome',
    phaseOrder: 1,
    turnCount: 0,
    
    // Questions tracking (prevents loops)
    questionsAsked: [],
    questionsAnswered: [],
    
    // Consolidated business profile (the "memory")
    profile: {
      // Company
      companyName: '',
      website: '',
      industry: '',
      stage: '', // pre-revenue, 0-100k, 100k-500k, 500k-1m, 1m+
      revenueRange: '',
      revenueExact: '',
      teamSize: '',
      teamRoles: [],
      founded: '',
      funding: '',
      
      // GTM
      icp: {
        title: '',
        companySize: '',
        industry: '',
        painPoints: []
      },
      salesMotion: '', // inbound, outbound, plg, mixed
      channels: [],
      avgDealSize: '',
      salesCycle: '',
      
      // Sales
      salesProcess: '',
      founderInvolvement: '', // high, medium, low
      winRate: '',
      mainBottleneck: '',
      lostDealReasons: [],
      
      // Operations
      tools: [],
      manualProcesses: [],
      
      // Diagnosis
      diagnosedProblems: [],
      rootCauses: [],
      userValidatedProblems: [],
      priorityOrder: []
    },
    
    // Scraped data (one-time)
    scrapedData: {
      website: null,
      linkedin: null,
      external: null
    },
    
    // Conversation insights (append-only log)
    insights: [],
    
    // Confidence scores
    confidence: {
      company: 0,    // max 25
      gtm: 0,        // max 25
      diagnosis: 0,  // max 30
      solution: 0,   // max 20
      total: 0       // max 100
    }
  };
}

function buildProfileSummary(session) {
  const p = session.profile;
  
  let summary = `
══════════════════════════════════════════════════════════════
CONSOLIDATED BUSINESS PROFILE (Turn ${session.turnCount})
══════════════════════════════════════════════════════════════

COMPANY:
- Name: ${p.companyName || 'Unknown'}
- Stage: ${p.stage || 'Unknown'}
- Revenue: ${p.revenueRange || p.revenueExact || 'Unknown'}
- Team: ${p.teamSize || 'Unknown'}${p.teamRoles.length > 0 ? ` (${p.teamRoles.join(', ')})` : ''}
- Industry: ${p.industry || 'Unknown'}

GO-TO-MARKET:
- ICP: ${p.icp.title || 'Unknown'}${p.icp.companySize ? ` at ${p.icp.companySize} companies` : ''}
- Sales Motion: ${p.salesMotion || 'Unknown'}
- Channels: ${p.channels.length > 0 ? p.channels.join(', ') : 'Unknown'}
- Deal Size: ${p.avgDealSize || 'Unknown'}
- Sales Cycle: ${p.salesCycle || 'Unknown'}

SALES ENGINE:
- Process: ${p.salesProcess || 'Unknown'}
- Founder Involvement: ${p.founderInvolvement || 'Unknown'}
- Win Rate: ${p.winRate || 'Unknown'}
- Main Bottleneck: ${p.mainBottleneck || 'Unknown'}

DIAGNOSED ISSUES:
${p.diagnosedProblems.length > 0 ? p.diagnosedProblems.map((d, i) => `${i + 1}. ${d}`).join('\n') : '- Not yet diagnosed'}

USER VALIDATED:
${p.userValidatedProblems.length > 0 ? p.userValidatedProblems.join(', ') : '- Pending validation'}

══════════════════════════════════════════════════════════════
QUESTIONS ALREADY ASKED (DO NOT REPEAT):
${session.questionsAsked.length > 0 ? session.questionsAsked.map(q => `- ${q}`).join('\n') : '- None yet'}

QUESTIONS ANSWERED:
${session.questionsAnswered.length > 0 ? session.questionsAnswered.map(q => `- ${q}`).join('\n') : '- None yet'}

KEY INSIGHTS FROM CONVERSATION:
${session.insights.length > 0 ? session.insights.slice(-10).map(i => `- ${i}`).join('\n') : '- None yet'}
══════════════════════════════════════════════════════════════
`;

  return summary;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: PHASE-SPECIFIC PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const PHASE_PROMPTS = {
  welcome: `
You are the Revenue Architect starting a new session.

YOUR TASK: Create a personalized welcome based on scraped data.

REQUIREMENTS:
1. Reference SPECIFIC data from the website (exact quotes from H1, H2, pricing)
2. Make 3-4 BOLD assumptions with evidence
3. Sound confident but open to correction
4. End with: "Did I get this right?"

OUTPUT JSON:
{
  "message": "Your welcome message...",
  "profile_updates": {
    "companyName": "extracted name",
    "industry": "detected industry",
    "stage": "estimated stage"
  },
  "assumptions": ["assumption 1", "assumption 2"],
  "next_question_topic": "confirmation"
}
`,

  company: `
You are the Revenue Architect in COMPANY DISCOVERY phase.

YOUR TASK: Understand the company fundamentals.

TOPICS TO COVER (ask ONE at a time):
- Company stage (pre-revenue → $1M+)
- Revenue specifics (MRR/ARR, growth rate)
- Team composition (size, roles)

RULES:
1. NEVER repeat a question already asked (check the list)
2. Ask ONE specific question
3. Include a real-world example or comparison
4. Provide 4-5 specific button options

OUTPUT JSON:
{
  "message": "Your response with insight + ONE question...",
  "question_asked": "brief description of the question",
  "profile_updates": { "field": "value learned" },
  "insight": "key insight from this turn",
  "options": [{"key": "x", "label": "Specific option"}],
  "phase_complete": false
}

Set phase_complete: true when you have stage + revenue + team info.
`,

  gtm: `
You are the Revenue Architect in GTM DISCOVERY phase.

YOUR TASK: Understand go-to-market strategy.

TOPICS TO COVER (ask ONE at a time):
- ICP (who buys, what title, what size company)
- Sales motion (inbound/outbound/PLG)
- Channels (what's working, what's not)

RULES:
1. NEVER repeat a question already asked
2. Build on company context already gathered
3. Include GTM-specific examples
4. Ask ONE question per turn

OUTPUT JSON:
{
  "message": "Your response + ONE question...",
  "question_asked": "brief description",
  "profile_updates": { "icp": {}, "salesMotion": "", "channels": [] },
  "insight": "key insight",
  "options": [{"key": "x", "label": "option"}],
  "phase_complete": false
}

Set phase_complete: true when you have ICP + motion + channels.
`,

  sales: `
You are the Revenue Architect in SALES DISCOVERY phase.

YOUR TASK: Understand the sales engine and find bottlenecks.

TOPICS TO COVER:
- Current sales process
- Founder involvement level
- Where deals get stuck
- Main bottleneck

RULES:
1. NEVER repeat questions
2. Look for "Founder-Led Sales Trap" pattern
3. Probe for specifics, not generalities
4. ONE question per turn

OUTPUT JSON:
{
  "message": "Your response + ONE question...",
  "question_asked": "brief description",
  "profile_updates": { "salesProcess": "", "founderInvolvement": "", "mainBottleneck": "" },
  "insight": "key insight",
  "options": [{"key": "x", "label": "option"}],
  "phase_complete": false
}

Set phase_complete: true when you have process + founder role + bottleneck.
`,

  diagnosis: `
You are the Revenue Architect in DIAGNOSIS phase.

YOUR TASK: Synthesize everything and present your diagnosis.

YOU HAVE ENOUGH CONTEXT. NOW:
1. Identify the top 2-3 revenue blockers
2. Explain the root cause for each
3. Present your hypothesis
4. Ask user to validate

DO NOT ask more discovery questions. PRESENT YOUR FINDINGS.

OUTPUT JSON:
{
  "message": "Your diagnosis presentation...",
  "diagnosed_problems": [
    {"name": "Problem 1", "root_cause": "Why", "impact": "Revenue impact"},
    {"name": "Problem 2", "root_cause": "Why", "impact": "Revenue impact"}
  ],
  "main_hypothesis": "Your core hypothesis",
  "profile_updates": { "diagnosedProblems": [], "rootCauses": [] },
  "options": [
    {"key": "validate_yes", "label": "Yes, that resonates"},
    {"key": "validate_partial", "label": "Partially right"},
    {"key": "validate_no", "label": "Not quite right"}
  ],
  "phase_complete": false
}

Set phase_complete: true after user validates.
`,

  pre_finish: `
You are the Revenue Architect ready to generate the report.

YOUR TASK: Present final summary and offer report generation.

REQUIREMENTS:
1. Summarize the full diagnosis
2. List top 3 priorities
3. Preview what the report will contain
4. Offer to generate

OUTPUT JSON:
{
  "message": "Final summary with report preview...",
  "summary": {
    "company_snapshot": "...",
    "top_problems": ["1", "2", "3"],
    "core_recommendation": "..."
  },
  "profile_updates": {},
  "options": [
    {"key": "generate_report", "label": "📥 Generate Strategic Growth Plan"},
    {"key": "add_more", "label": "Wait, I want to add something"}
  ],
  "phase_complete": true
}
`
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, msg, data = null) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${emoji} ${msg}`, data ? JSON.stringify(data).slice(0, 200) : '');
}

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
    
    // Extract key elements
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
    const description = (html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i) ||
                        html.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"/i))?.[1]?.trim() || '';
    
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
      .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
      .filter(t => t.length > 0 && t.length < 200);
    
    const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
      .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
      .filter(t => t.length > 0 && t.length < 150)
      .slice(0, 6);
    
    const pricing = [...new Set(html.match(/(\$|€|£)\s*\d+[,.]?\d*/g) || [])].slice(0, 5);
    
    const socialProof = [
      ...(html.match(/(\d+[,.]?\d*[kK]?\+?)\s*(customers?|users?|companies|clients)/gi) || []),
      ...(html.match(/trusted by[^<]{0,100}/gi) || [])
    ].slice(0, 3);
    
    log('✅', `Scraped: ${title}`);
    
    return { title, description, h1s, h2s, pricing, socialProof };
  } catch (e) {
    log('⚠️', `Scrape failed: ${e.message}`);
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
        query: `"${slug}" site:linkedin.com company employees`,
        search_depth: "advanced",
        max_results: 3,
        include_answer: true
      })
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    
    const employees = data.answer?.match(/(\d+[\-–]?\d*)\s*(employees?|people)/i)?.[0] || '';
    const industry = data.answer?.match(/(?:industry|sector):\s*([^.]+)/i)?.[1]?.trim() || '';
    
    log('✅', `LinkedIn: ${employees || 'unknown size'}`);
    
    return {
      companyName: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      employees,
      industry,
      description: data.answer?.slice(0, 400) || ''
    };
  } catch (e) {
    log('⚠️', `LinkedIn failed: ${e.message}`);
    return null;
  }
}

function determineNextPhase(session) {
  const { currentPhase, turnCount, profile, confidence } = session;
  
  // Force progression based on turns to prevent infinite loops
  if (turnCount >= 12) return 'pre_finish';
  if (turnCount >= 10 && confidence.diagnosis >= 15) return 'pre_finish';
  if (turnCount >= 9 && currentPhase === 'diagnosis') return 'pre_finish';
  
  // Normal progression
  switch (currentPhase) {
    case 'welcome':
      return 'company';
    
    case 'company':
      // Move on if we have basics OR spent 3+ turns here
      if ((profile.stage && profile.revenueRange) || 
          session.questionsAsked.filter(q => q.startsWith('company_')).length >= 3) {
        return 'gtm';
      }
      return 'company';
    
    case 'gtm':
      if ((profile.icp.title && profile.salesMotion) ||
          session.questionsAsked.filter(q => q.startsWith('gtm_')).length >= 3) {
        return 'sales';
      }
      return 'gtm';
    
    case 'sales':
      if ((profile.mainBottleneck && profile.founderInvolvement) ||
          session.questionsAsked.filter(q => q.startsWith('sales_')).length >= 3) {
        return 'diagnosis';
      }
      return 'sales';
    
    case 'diagnosis':
      if (profile.userValidatedProblems.length > 0 || 
          session.questionsAsked.filter(q => q.startsWith('diagnosis_')).length >= 2) {
        return 'pre_finish';
      }
      return 'diagnosis';
    
    case 'pre_finish':
      return 'finish';
    
    default:
      return 'company';
  }
}

function updateConfidence(session) {
  const p = session.profile;
  
  // Company (max 25)
  let company = 0;
  if (p.stage) company += 8;
  if (p.revenueRange || p.revenueExact) company += 10;
  if (p.teamSize) company += 7;
  
  // GTM (max 25)
  let gtm = 0;
  if (p.icp.title) gtm += 8;
  if (p.salesMotion) gtm += 10;
  if (p.channels.length > 0) gtm += 7;
  
  // Diagnosis (max 30)
  let diagnosis = 0;
  if (p.mainBottleneck) diagnosis += 10;
  if (p.diagnosedProblems.length > 0) diagnosis += 12;
  if (p.userValidatedProblems.length > 0) diagnosis += 8;
  
  // Solution (max 20)
  let solution = 0;
  if (p.userValidatedProblems.length > 0) solution += 12;
  if (p.priorityOrder.length > 0) solution += 8;
  
  session.confidence = {
    company: Math.min(25, company),
    gtm: Math.min(25, gtm),
    diagnosis: Math.min(30, diagnosis),
    solution: Math.min(20, solution),
    total: Math.min(100, company + gtm + diagnosis + solution)
  };
}

function getNextUnansweredQuestion(session, phase) {
  const asked = new Set(session.questionsAsked);
  
  const phaseQuestions = {
    company: [
      { key: 'company_stage', topic: 'company stage and maturity' },
      { key: 'company_revenue', topic: 'revenue range and growth' },
      { key: 'company_team', topic: 'team size and composition' }
    ],
    gtm: [
      { key: 'gtm_icp', topic: 'ideal customer profile' },
      { key: 'gtm_motion', topic: 'sales motion (inbound/outbound/PLG)' },
      { key: 'gtm_channels', topic: 'acquisition channels' }
    ],
    sales: [
      { key: 'sales_process', topic: 'current sales process' },
      { key: 'sales_founder', topic: 'founder involvement in sales' },
      { key: 'sales_bottleneck', topic: 'main sales bottleneck' }
    ],
    diagnosis: [
      { key: 'diagnosis_validate', topic: 'validating diagnosed problems' },
      { key: 'diagnosis_priority', topic: 'priority confirmation' }
    ]
  };
  
  const questions = phaseQuestions[phase] || [];
  return questions.find(q => !asked.has(q.key)) || null;
}

async function callGemini(messages, geminiKey, options = {}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: options.temperature || 0.7,
          responseMimeType: "application/json",
          maxOutputTokens: options.maxTokens || 2000
        }
      })
    }
  );
  
  if (!response.ok) throw new Error(`Gemini API: ${response.status}`);
  
  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  
  text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(text);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: PHASE EXECUTORS
// ═══════════════════════════════════════════════════════════════════════════════

async function executeWelcomePhase(session, contextData, geminiKey, tavilyKey) {
  // Scrape data
  if (contextData?.website) {
    session.scrapedData.website = await scrapeWebsite(contextData.website);
    session.profile.website = contextData.website;
  }
  if (contextData?.linkedin) {
    session.scrapedData.linkedin = await scrapeLinkedIn(contextData.linkedin, tavilyKey);
  }
  if (contextData?.description) {
    session.profile.companyName = contextData.description.split(' ').slice(0, 3).join(' ');
  }
  
  // Build context for LLM
  const scrapedContext = `
SCRAPED WEBSITE DATA:
${session.scrapedData.website ? `
- Title: ${session.scrapedData.website.title}
- Description: ${session.scrapedData.website.description}
- H1 Headlines: ${session.scrapedData.website.h1s?.join(' | ') || 'None'}
- H2 Sections: ${session.scrapedData.website.h2s?.join(' | ') || 'None'}
- Pricing Found: ${session.scrapedData.website.pricing?.join(', ') || 'None'}
- Social Proof: ${session.scrapedData.website.socialProof?.join(' | ') || 'None'}
` : 'No website data'}

LINKEDIN DATA:
${session.scrapedData.linkedin ? `
- Company: ${session.scrapedData.linkedin.companyName}
- Employees: ${session.scrapedData.linkedin.employees}
- Industry: ${session.scrapedData.linkedin.industry}
` : 'No LinkedIn data'}

USER DESCRIPTION:
${contextData?.description || 'None provided'}
`;

  const messages = [
    { role: 'user', parts: [{ text: PHASE_PROMPTS.welcome }] },
    { role: 'model', parts: [{ text: 'Understood. I will create a personalized welcome.' }] },
    { role: 'user', parts: [{ text: `[CONTEXT]\n${scrapedContext}\n\nGenerate the welcome message now.` }] }
  ];
  
  try {
    const llmResponse = await callGemini(messages, geminiKey);
    
    // Update profile
    if (llmResponse.profile_updates) {
      Object.assign(session.profile, llmResponse.profile_updates);
    }
    
    session.currentPhase = 'company';
    session.phaseOrder = 2;
    
    return {
      step_id: 'welcome',
      message: llmResponse.message,
      mode: 'mixed',
      options: [
        { key: 'confirm_correct', label: 'Yes, that\'s accurate' },
        { key: 'partially_correct', label: 'Close, but let me clarify' },
        { key: 'mostly_wrong', label: 'Actually quite different' }
      ],
      allow_text: true
    };
  } catch (e) {
    log('❌', `Welcome error: ${e.message}`);
    return getErrorResponse();
  }
}

async function executeDiscoveryPhase(session, choice, history, geminiKey) {
  const phase = session.currentPhase;
  const profileSummary = buildProfileSummary(session);
  
  // Get next unanswered question for this phase
  const nextQuestion = getNextUnansweredQuestion(session, phase);
  
  const phasePrompt = PHASE_PROMPTS[phase];
  
  const userMessage = `
${profileSummary}

CURRENT PHASE: ${phase.toUpperCase()}
TURN COUNT: ${session.turnCount}

USER'S LAST INPUT: "${choice}"

${nextQuestion ? `
NEXT TOPIC TO ASK ABOUT: ${nextQuestion.topic}
(Question key for tracking: ${nextQuestion.key})
` : `
All questions for this phase have been asked. 
Set phase_complete: true and summarize what you learned.
`}

IMPORTANT:
- DO NOT ask about topics already covered (check the profile)
- If user said "all of the above" or similar, acknowledge all options
- Include a real-world example in your response
- Ask exactly ONE new question (unless phase complete)

Generate your response now.
`;

  // Build conversation history
  const messages = [
    { role: 'user', parts: [{ text: phasePrompt }] },
    { role: 'model', parts: [{ text: `Understood. I am in ${phase} phase. I will not repeat questions.` }] }
  ];
  
  // Add recent history (last 6 turns)
  const recentHistory = history.slice(-6);
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
  
  try {
    const llmResponse = await callGemini(messages, geminiKey);
    
    // Track question asked
    if (llmResponse.question_asked && nextQuestion) {
      session.questionsAsked.push(nextQuestion.key);
    }
    
    // Track insight
    if (llmResponse.insight) {
      session.insights.push(llmResponse.insight);
    }
    
    // Update profile
    if (llmResponse.profile_updates) {
      deepMergeProfile(session.profile, llmResponse.profile_updates);
    }
    
    // Mark question as answered based on profile updates
    if (llmResponse.profile_updates) {
      const keys = Object.keys(llmResponse.profile_updates);
      if (keys.length > 0) {
        session.questionsAnswered.push(`${phase}_${keys[0]}`);
      }
    }
    
    // Check phase completion
    if (llmResponse.phase_complete) {
      session.currentPhase = determineNextPhase(session);
      session.phaseOrder = PHASES[session.currentPhase.toUpperCase()]?.order || session.phaseOrder + 1;
    }
    
    // Update confidence
    updateConfidence(session);
    
    return {
      step_id: 'discovery',
      message: llmResponse.message,
      mode: 'mixed',
      options: validateOptions(llmResponse.options, phase),
      allow_text: true
    };
    
  } catch (e) {
    log('❌', `${phase} error: ${e.message}`);
    return getErrorResponse();
  }
}

async function executeDiagnosisPhase(session, choice, history, geminiKey) {
  const profileSummary = buildProfileSummary(session);
  
  const userMessage = `
${profileSummary}

CURRENT PHASE: DIAGNOSIS
TURN COUNT: ${session.turnCount}

USER'S LAST INPUT: "${choice}"

YOU HAVE ENOUGH INFORMATION. DO NOT ASK MORE DISCOVERY QUESTIONS.

YOUR TASK:
1. Present your TOP 2-3 diagnosed revenue problems
2. Explain the root cause for each
3. State your main hypothesis
4. Ask user to validate: "Does this resonate?"

Generate your diagnosis now.
`;

  const messages = [
    { role: 'user', parts: [{ text: PHASE_PROMPTS.diagnosis }] },
    { role: 'model', parts: [{ text: 'Understood. I will present my diagnosis, not ask more questions.' }] },
    { role: 'user', parts: [{ text: userMessage }] }
  ];
  
  try {
    const llmResponse = await callGemini(messages, geminiKey);
    
    // Update diagnosed problems
    if (llmResponse.diagnosed_problems) {
      session.profile.diagnosedProblems = llmResponse.diagnosed_problems.map(p => p.name);
      session.profile.rootCauses = llmResponse.diagnosed_problems.map(p => p.root_cause);
    }
    
    session.questionsAsked.push('diagnosis_validate');
    
    // Check if user validated
    const validationKeywords = ['yes', 'correct', 'right', 'resonates', 'accurate', 'sì', 'esatto'];
    if (validationKeywords.some(k => choice.toLowerCase().includes(k))) {
      session.profile.userValidatedProblems = session.profile.diagnosedProblems;
      session.currentPhase = 'pre_finish';
    }
    
    updateConfidence(session);
    
    return {
      step_id: 'discovery',
      message: llmResponse.message,
      mode: 'mixed',
      options: llmResponse.options || [
        { key: 'validate_yes', label: 'Yes, that resonates strongly' },
        { key: 'validate_partial', label: 'Partially - let me clarify' },
        { key: 'validate_no', label: 'Not quite - the issue is different' }
      ],
      allow_text: true
    };
    
  } catch (e) {
    log('❌', `Diagnosis error: ${e.message}`);
    return getErrorResponse();
  }
}

async function executePreFinishPhase(session, geminiKey) {
  const profileSummary = buildProfileSummary(session);
  
  const messages = [
    { role: 'user', parts: [{ text: PHASE_PROMPTS.pre_finish }] },
    { role: 'model', parts: [{ text: 'Understood. I will present the final summary.' }] },
    { role: 'user', parts: [{ text: `${profileSummary}\n\nGenerate the pre-finish summary now.` }] }
  ];
  
  try {
    const llmResponse = await callGemini(messages, geminiKey);
    
    session.currentPhase = 'finish';
    updateConfidence(session);
    
    return {
      step_id: 'pre_finish',
      message: llmResponse.message,
      mode: 'buttons',
      options: [
        { key: 'generate_report', label: '📥 Generate Strategic Growth Plan' },
        { key: 'add_context', label: 'Wait, I want to add something' },
        { key: 'correct_diagnosis', label: 'One finding isn\'t quite right' }
      ],
      allow_text: false
    };
    
  } catch (e) {
    log('❌', `Pre-finish error: ${e.message}`);
    return {
      step_id: 'pre_finish',
      message: "I've completed the diagnosis. Ready to generate your Strategic Growth Plan?",
      mode: 'buttons',
      options: [
        { key: 'generate_report', label: '📥 Generate Report' },
        { key: 'add_context', label: 'Add more context' }
      ],
      allow_text: false
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function deepMergeProfile(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMergeProfile(target[key], source[key]);
    } else if (Array.isArray(source[key])) {
      if (!target[key]) target[key] = [];
      target[key] = [...new Set([...target[key], ...source[key]])];
    } else if (source[key]) {
      target[key] = source[key];
    }
  }
}

function validateOptions(options, phase) {
  if (!options || options.length < 3) {
    const defaults = {
      company: [
        { key: 'early_stage', label: 'Pre-revenue or under $100K' },
        { key: 'growth_stage', label: '$100K - $1M ARR' },
        { key: 'scaling_stage', label: 'Over $1M ARR' },
        { key: 'explain_more', label: 'Let me explain our situation' }
      ],
      gtm: [
        { key: 'inbound', label: 'Mostly inbound (content, SEO)' },
        { key: 'outbound', label: 'Mostly outbound (cold outreach)' },
        { key: 'plg', label: 'Product-led (free trial, freemium)' },
        { key: 'mixed', label: 'Mix of channels' }
      ],
      sales: [
        { key: 'founder_heavy', label: 'Founder closes most deals' },
        { key: 'team_sells', label: 'Sales team handles it' },
        { key: 'no_process', label: 'No formal process yet' },
        { key: 'other', label: 'Something else' }
      ],
      diagnosis: [
        { key: 'validate_yes', label: 'Yes, that resonates' },
        { key: 'validate_partial', label: 'Partially correct' },
        { key: 'validate_no', label: 'Not quite right' }
      ]
    };
    return defaults[phase] || defaults.company;
  }
  return options.slice(0, 5);
}

function getErrorResponse() {
  return {
    step_id: 'error',
    message: "Let me refocus. What's the single biggest revenue challenge you're facing right now?",
    mode: 'mixed',
    options: [
      { key: 'not_enough_leads', label: 'Not enough qualified leads' },
      { key: 'leads_not_converting', label: 'Leads not converting' },
      { key: 'cant_scale_sales', label: 'Can\'t scale beyond founder selling' },
      { key: 'churn', label: 'Losing customers too fast' }
    ],
    allow_text: true
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { 
      choice, 
      history = [], 
      contextData = null, 
      sessionData = null 
    } = req.body;

    const geminiKey = process.env.GEMINI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!geminiKey) {
      return res.status(200).json(getErrorResponse());
    }

    // Initialize or restore session
    let session = sessionData || createFreshSession();
    session.turnCount = history.filter(h => h.role === 'user').length;

    log('🎯', `Phase: ${session.currentPhase}, Turn: ${session.turnCount}, Choice: ${choice?.slice(0, 40)}...`);

    // Handle correction requests - go back to appropriate phase
    const correctionKeywords = ['add_context', 'correct', 'wrong', 'not right', 'clarify'];
    if (correctionKeywords.some(k => choice.toLowerCase().includes(k))) {
      // Don't reset completely, just allow more input
      session.questionsAsked = session.questionsAsked.filter(q => !q.startsWith(session.currentPhase));
      log('🔄', `Correction requested, allowing re-input for ${session.currentPhase}`);
    }

    // Force phase progression based on turns (anti-loop)
    if (session.turnCount >= 12 && session.currentPhase !== 'pre_finish' && session.currentPhase !== 'finish') {
      log('⏩', 'Forcing pre_finish due to turn count');
      session.currentPhase = 'pre_finish';
    }

    // Execute appropriate phase
    let response;
    
    switch (session.currentPhase) {
      case 'welcome':
        response = await executeWelcomePhase(session, contextData, geminiKey, tavilyKey);
        break;
      
      case 'company':
      case 'gtm':
      case 'sales':
        response = await executeDiscoveryPhase(session, choice, history, geminiKey);
        break;
      
      case 'diagnosis':
        response = await executeDiagnosisPhase(session, choice, history, geminiKey);
        break;
      
      case 'pre_finish':
      case 'finish':
        response = await executePreFinishPhase(session, geminiKey);
        break;
      
      default:
        session.currentPhase = 'company';
        response = await executeDiscoveryPhase(session, choice, history, geminiKey);
    }

    // Check if ready for finish
    if (session.confidence.total >= 70 && session.turnCount >= 8) {
      if (session.currentPhase !== 'pre_finish' && session.currentPhase !== 'finish') {
        session.currentPhase = determineNextPhase(session);
      }
    }

    // Attach session data to response
    response.session_data = session;
    response.confidence_state = session.confidence;
    response.current_phase = session.currentPhase;
    response.turn_count = session.turnCount;

    log('✅', `Response: phase=${session.currentPhase}, confidence=${session.confidence.total}`);
    
    return res.status(200).json(response);

  } catch (error) {
    console.error('[FATAL]', error);
    return res.status(200).json(getErrorResponse());
  }
}
