// ═══════════════════════════════════════════════════════════════════════════════
// REVENUE ARCHITECT v11 — DEFINITIVE BACKEND
//
// Root causes of v10 bugs:
// 1. Context loss: LLM received frontend `history` (stringified JSON blobs)
//    instead of a clean human-readable transcript → NOW we build a clean
//    transcript server-side in session.transcript[]
// 2. Duplicate questions: LLM couldn't see its OWN previous message →
//    NOW the full transcript is injected, including AI messages
// 3. Phase too fast: threshold was N-1 items → NOW requires ALL items
//    PLUS minimum turn counts per phase
// 4. Confidence jumped to 40% in 3 turns → NOW scaled across 20+ fields
//    with weighted scoring
// 5. Conversation too short: only ~12 steps → NOW each phase has mandatory
//    depth questions that go beyond surface-level answers
//
// Architecture:
// - session.transcript[] = clean array of {role, text} pairs
// - Each LLM call gets the FULL transcript as readable text
// - Phase advancement: ALL checklist items + min turns + explicit gate
// - LLM generates buttons but system validates them
// - Profile updates extracted by LLM, validated by system
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// PHASES — each has a checklist, minimum turns, and depth topics
// ═══════════════════════════════════════════════════════════════════════════════

const PHASES = {
  welcome: {
    display: 'welcome', next: 'company', minTurns: 1,
    checklist: [],
    description: 'Present findings from website scan, make assumptions, get confirmation/correction.'
  },
  company: {
    display: 'company', next: 'gtm', minTurns: 4,
    checklist: ['businessModel', 'stage', 'revenue', 'teamSize', 'funding'],
    depthTopics: [
      'Pricing structure and packaging strategy',
      'Revenue growth trajectory and seasonality',
      'Team composition: engineering vs commercial ratio',
      'Competitive landscape and differentiation',
      'Runway and burn rate implications'
    ],
    description: 'Deep-dive into company DNA: model, revenue, team, funding, pricing, competitive position.'
  },
  gtm: {
    display: 'gtm', next: 'sales', minTurns: 4,
    checklist: ['icpTitle', 'salesMotion', 'channels', 'avgDealSize'],
    depthTopics: [
      'ICP specificity: buyer persona, decision-making unit, budget authority',
      'Channel effectiveness: which channel has best ROI and why',
      'Content/marketing strategy and lead generation',
      'Competitive positioning: why customers choose them over alternatives',
      'Sales cycle dynamics and deal qualification criteria'
    ],
    description: 'Map Go-to-Market: ICP depth, channels, positioning, lead gen, deal economics.'
  },
  sales: {
    display: 'sales', next: 'diagnosis', minTurns: 4,
    checklist: ['salesProcess', 'whoCloses', 'mainBottleneck'],
    depthTopics: [
      'Full sales process walkthrough: each stage and exit criteria',
      'Founder dependency and delegation readiness',
      'Win/loss analysis: why deals close or die',
      'Objection handling and competitive losses',
      'Tech stack and CRM/automation maturity',
      'Post-sale: onboarding, retention, expansion'
    ],
    description: 'Analyze Sales Engine: process, people, bottlenecks, tools, retention.'
  },
  diagnosis: {
    display: 'diagnosis', next: 'pre_finish', minTurns: 2,
    checklist: ['diagnosedProblems', 'userPriority'],
    description: 'Present diagnosis, validate with user, get priority and context on past attempts.'
  },
  pre_finish: {
    display: 'pre_finish', next: null, minTurns: 1,
    checklist: [],
    description: 'Final summary, offer report generation.'
  }
};

const PHASE_ORDER = ['welcome', 'company', 'gtm', 'sales', 'diagnosis', 'pre_finish'];

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════════════════════════════

function createSession() {
  return {
    currentPhase: 'welcome',
    phaseTurns: 0,        // turns spent IN current phase
    totalTurns: 0,
    welcomeDone: false,
    diagnosisPresented: false,
    diagnosisValidated: false,
    // Clean transcript — the SINGLE SOURCE OF TRUTH for conversation context
    transcript: [],
    // Structured profile — what we've confirmed
    profile: {
      companyName: '', website: '', industry: '', businessModel: '', stage: '',
      revenue: '', revenueGrowth: '', teamSize: '', teamRoles: '', funding: '',
      runway: '', productDescription: '', pricingModel: '', pricingRange: '',
      competitiveLandscape: '', differentiator: '',
      icpTitle: '', icpCompanySize: '', icpIndustry: '', icpPainPoints: '',
      icpDecisionProcess: '', icpBudget: '',
      salesMotion: '', channels: '', bestChannel: '', channelROI: '',
      avgDealSize: '', salesCycle: '', cac: '', ltv: '',
      contentStrategy: '', leadGenMethod: '',
      salesProcess: '', processStages: '', processDocumented: '',
      whoCloses: '', founderInvolvement: '',
      winRate: '', lostDealReasons: '', mainObjections: '',
      mainBottleneck: '', secondaryBottleneck: '',
      churnRate: '', churnReasons: '', expansionRevenue: '',
      crm: '', tools: '', automationLevel: '',
      onboardingProcess: '', customerSuccess: '',
      diagnosedProblems: [], rootCauses: [], validatedProblems: [],
      userPriority: '', pastAttempts: '', constraints: '', additionalContext: ''
    },
    scrapedSummary: ''
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSCRIPT BUILDER — creates readable conversation for the LLM
// ═══════════════════════════════════════════════════════════════════════════════

function buildTranscript(session) {
  if (session.transcript.length === 0) return '(No conversation yet)';
  return session.transcript.map((t, i) => {
    const prefix = t.role === 'user' ? '👤 USER' : '🤖 REVENUE ARCHITECT';
    return `[Turn ${Math.floor(i / 2) + 1}] ${prefix}:\n${t.text}`;
  }).join('\n\n---\n\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE CONTEXT — what we know vs what we don't
// ═══════════════════════════════════════════════════════════════════════════════

function buildProfileContext(session) {
  const p = session.profile;
  const lines = [];

  const fields = [
    ['Company', p.companyName], ['Website', p.website], ['Industry', p.industry],
    ['Business Model', p.businessModel], ['Stage', p.stage], ['Revenue', p.revenue],
    ['Revenue Growth', p.revenueGrowth], ['Team Size', p.teamSize], ['Team Roles', p.teamRoles],
    ['Funding', p.funding], ['Runway', p.runway],
    ['Product', p.productDescription], ['Pricing', `${p.pricingModel || ''} ${p.pricingRange || ''}`.trim()],
    ['Competitive Landscape', p.competitiveLandscape], ['Differentiator', p.differentiator],
    ['ICP Buyer', p.icpTitle], ['ICP Company Size', p.icpCompanySize],
    ['ICP Industry', p.icpIndustry], ['ICP Pain Points', p.icpPainPoints],
    ['ICP Decision Process', p.icpDecisionProcess], ['ICP Budget', p.icpBudget],
    ['Sales Motion', p.salesMotion], ['Channels', p.channels],
    ['Best Channel', p.bestChannel], ['Channel ROI', p.channelROI],
    ['Deal Size', p.avgDealSize], ['Sales Cycle', p.salesCycle], ['CAC', p.cac], ['LTV', p.ltv],
    ['Content Strategy', p.contentStrategy], ['Lead Gen', p.leadGenMethod],
    ['Sales Process', p.salesProcess], ['Process Stages', p.processStages],
    ['Documented', p.processDocumented], ['Who Closes', p.whoCloses],
    ['Founder Role', p.founderInvolvement], ['Win Rate', p.winRate],
    ['Lost Deal Reasons', p.lostDealReasons], ['Objections', p.mainObjections],
    ['Main Bottleneck', p.mainBottleneck], ['Secondary Bottleneck', p.secondaryBottleneck],
    ['Churn Rate', p.churnRate], ['Churn Reasons', p.churnReasons],
    ['Expansion Revenue', p.expansionRevenue],
    ['CRM', p.crm], ['Tools', p.tools], ['Automation Level', p.automationLevel],
    ['Onboarding', p.onboardingProcess], ['Customer Success', p.customerSuccess],
    ['Diagnosed Problems', (p.diagnosedProblems || []).join('; ')],
    ['Root Causes', (p.rootCauses || []).join('; ')],
    ['User Priority', p.userPriority], ['Past Attempts', p.pastAttempts],
    ['Additional Context', p.additionalContext]
  ];

  const known = [];
  const missing = [];
  for (const [label, value] of fields) {
    const has = Array.isArray(value) ? value.length > 0 : (value && value.trim() !== '');
    if (has) known.push(`✅ ${label}: ${value}`);
  }

  // Missing for CURRENT phase
  const phase = PHASES[session.currentPhase];
  if (phase?.checklist) {
    for (const k of phase.checklist) {
      const v = p[k];
      const empty = Array.isArray(v) ? v.length === 0 : (!v || v.trim() === '');
      if (empty) missing.push(k);
    }
  }

  lines.push('CONFIRMED DATA:');
  if (known.length > 0) lines.push(known.join('\n'));
  else lines.push('(nothing yet)');

  if (missing.length > 0) {
    const labels = {
      businessModel: 'Business Model', stage: 'Stage', revenue: 'Revenue',
      teamSize: 'Team Size', funding: 'Funding', icpTitle: 'ICP/Buyer',
      salesMotion: 'Sales Motion', channels: 'Channels', avgDealSize: 'Deal Size',
      salesProcess: 'Sales Process', whoCloses: 'Who Closes',
      mainBottleneck: 'Bottleneck', diagnosedProblems: 'Diagnosis', userPriority: 'Priority'
    };
    lines.push('\nSTILL REQUIRED for ' + session.currentPhase.toUpperCase() + ':');
    missing.forEach(k => lines.push(`❓ ${labels[k] || k}`));
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

function canAdvancePhase(S) {
  const phase = PHASES[S.currentPhase];
  if (!phase) return false;

  // Minimum turns gate
  if (S.phaseTurns < phase.minTurns) return false;

  // Phase-specific gates
  if (S.currentPhase === 'welcome') return S.welcomeDone;
  if (S.currentPhase === 'pre_finish') return false;
  if (S.currentPhase === 'diagnosis') {
    return S.diagnosisPresented && S.diagnosisValidated && S.profile.userPriority !== '';
  }

  // Normal phases: ALL checklist items must be filled
  if (phase.checklist && phase.checklist.length > 0) {
    const p = S.profile;
    const allFilled = phase.checklist.every(k => {
      const v = p[k];
      return Array.isArray(v) ? v.length > 0 : (v && v.trim() !== '');
    });
    return allFilled;
  }

  return true;
}

function doAdvance(S) {
  const phase = PHASES[S.currentPhase];
  if (phase?.next) {
    S.currentPhase = phase.next;
    S.phaseTurns = 0;
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCRAPING
// ═══════════════════════════════════════════════════════════════════════════════

async function scrapeWebsite(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const c = new AbortController(); setTimeout(() => c.abort(), 15000);
    const r = await fetch(u.href, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: c.signal, redirect: 'follow'
    });
    const html = await r.text();
    const ex = (re) => (html.match(re) || [null, ''])[1]?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() || '';
    const exAll = (re, n = 8) => [...html.matchAll(re)].map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 2 && t.length < 300).slice(0, n);
    return {
      url: u.href, title: ex(/<title[^>]*>([^<]+)<\/title>/i),
      desc: ex(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i) || ex(/<meta[^>]*content="([^"]*)"[^>]*name="description"/i),
      h1s: exAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi),
      h2s: exAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, 12),
      paras: [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => m[1].replace(/<[^>]*>/g, '').trim()).filter(t => t.length > 30 && t.length < 600).slice(0, 6),
      prices: [...new Set(html.match(/(\$|€|£)\s*\d+[,.]?\d*/g) || [])].slice(0, 8),
      proof: [...(html.match(/(\d+[,.]?\d*[kK]?\+?)\s*(customers?|users?|companies|clients|teams?)/gi) || [])].slice(0, 4),
      ctas: [...html.matchAll(/<(?:a|button)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi)].map(m => m[1].replace(/<[^>]*>/g, '').trim()).filter(t => t.length > 3 && t.length < 50 && /(?:start|try|get|sign|book|demo|free|contact|buy|subscribe)/i.test(t)).slice(0, 5),
      navLinks: [...html.matchAll(/<nav[\s\S]*?<\/nav>/gi)].flatMap(m => [...m[0].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)]).map(m => m[1].replace(/<[^>]*>/g, '').trim()).filter(t => t.length > 1 && t.length < 40).slice(0, 10)
    };
  } catch (e) { console.error('[Scrape]', e.message); return null; }
}

async function scrapeLinkedIn(url, key) {
  if (!url || !key) return null;
  try {
    const slug = url.match(/linkedin\.com\/company\/([^\/\?]+)/i)?.[1];
    if (!slug) return null;
    const r = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: key, query: `"${slug}" site:linkedin.com company`, search_depth: "advanced", max_results: 3, include_answer: true }) });
    if (!r.ok) return null;
    const d = await r.json();
    return { name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), employees: d.answer?.match(/(\d+[\-–]?\d*)\s*(employees?|people)/i)?.[0] || '', industry: d.answer?.match(/(?:industry|sector):\s*([^.]+)/i)?.[1]?.trim() || '', desc: d.answer?.slice(0, 500) || '' };
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LLM CALL — sends transcript as readable text, NOT JSON history
// ═══════════════════════════════════════════════════════════════════════════════

async function callGemini(prompt, key) {
  // Single-turn call with full context in the prompt itself
  // This avoids the multi-turn confusion where Gemini loses track
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.75,
          responseMimeType: "application/json",
          maxOutputTokens: 4000
        }
      })
    }
  );
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text().catch(() => '?')}`);
  const d = await r.json();
  let t = d.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!t) throw new Error("Empty response from Gemini");
  t = t.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(t);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE-SPECIFIC INSTRUCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getPhasePrompt(S) {
  const p = S.profile;
  const phase = PHASES[S.currentPhase];
  const turnsLeft = (phase.minTurns || 1) - S.phaseTurns;

  switch (S.currentPhase) {
    case 'welcome':
      return `PHASE: WELCOME (Turn ${S.phaseTurns + 1})

YOUR TASK:
- Reference 3-4 SPECIFIC things from their website data (headlines, pricing, features, CTAs — quote them)
- Make 3 bold assumptions about: (a) their revenue model, (b) their target customer, (c) their growth stage
- Ask them to validate: "Ho capito bene? Cosa devo correggere?" / "Did I get this right?"
- Generate confirmation buttons

AFTER this turn, set phase_signals.welcome_done=true in your next response (when the user replies).
This is your first impression — make it count. Show you did your homework.`;

    case 'company':
      return `PHASE: COMPANY DNA (Turn ${S.phaseTurns + 1} of minimum ${phase.minTurns})
${turnsLeft > 0 ? `You need at least ${turnsLeft} more turn(s) in this phase. Take your time.` : 'You can transition soon if all checklist items are filled.'}

TOPICS TO EXPLORE (one or two per turn, go deep):
${phase.depthTopics.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

CHECKLIST STATUS:
${phase.checklist.map(k => {
  const v = p[k]; const has = v && v.trim();
  return has ? `  ✅ ${k}: ${v} (DONE — don't re-ask)` : `  ❓ ${k}: NOT YET COLLECTED`;
}).join('\n')}

STRATEGY:
- Ask about ONE missing checklist item per turn
- But ALSO go deeper on something already answered — ask follow-up questions
- Example: if they said "SaaS subscription", ask about pricing tiers, packaging, annual vs monthly split
- Example: if they said "€20K MRR", ask about growth rate, best/worst months, cohort trends
- Provide benchmarks from SaaStr, T2D3, OpenView for context
- Always connect your question to WHY it matters for revenue strategy

DO NOT rush. This phase should feel like a thorough discovery call.`;

    case 'gtm':
      return `PHASE: GO-TO-MARKET (Turn ${S.phaseTurns + 1} of minimum ${phase.minTurns})
${turnsLeft > 0 ? `At least ${turnsLeft} more turn(s) needed.` : 'Can transition if checklist complete.'}

COMPANY CONTEXT FOR YOUR REFERENCE:
Model: ${p.businessModel || '?'} | Stage: ${p.stage || '?'} | Revenue: ${p.revenue || '?'} | Team: ${p.teamSize || '?'}

TOPICS TO EXPLORE:
${phase.depthTopics.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

CHECKLIST:
${phase.checklist.map(k => {
  const v = p[k]; const has = v && v.trim();
  return has ? `  ✅ ${k}: ${v} (DONE)` : `  ❓ ${k}: NEEDED`;
}).join('\n')}

STRATEGY:
- Start this phase with a brief transition: summarize company DNA, then pivot to GTM
- For ICP: push for specificity. Not "marketing people" but "Head of Demand Gen at B2B SaaS, 50-200 employees, Series A funded"
- For channels: don't just ask WHICH channels — ask about PERFORMANCE. "Which channel brings the highest quality leads? What's the conversion rate from each?"
- Reference April Dunford positioning framework, Jobs-to-be-Done
- Ask about competitive wins/losses: "When you lose a deal, who do you lose to and why?"`;

    case 'sales':
      return `PHASE: SALES ENGINE (Turn ${S.phaseTurns + 1} of minimum ${phase.minTurns})
${turnsLeft > 0 ? `At least ${turnsLeft} more turn(s) needed.` : 'Can transition if checklist complete.'}

CONTEXT:
Model: ${p.businessModel || '?'} | ICP: ${p.icpTitle || '?'} | Motion: ${p.salesMotion || '?'} | Deal: ${p.avgDealSize || '?'}

TOPICS TO EXPLORE:
${phase.depthTopics.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

CHECKLIST:
${phase.checklist.map(k => {
  const v = p[k]; const has = v && v.trim();
  return has ? `  ✅ ${k}: ${v} (DONE)` : `  ❓ ${k}: NEEDED`;
}).join('\n')}

STRATEGY:
- Ask for a WALKTHROUGH: "Take me through a recent deal from first touch to signature"
- For bottleneck: make a HYPOTHESIS first, then ask: "Based on everything, I suspect [X] because [Y]. Am I right?"
- Ask about post-sale: onboarding, churn, expansion — this is often overlooked but critical
- Ask about tools: CRM, sequences, analytics. Be specific: "Do you use HubSpot, Pipedrive, Salesforce?"
- Reference MEDDPICC for process evaluation
- This is the last discovery phase before diagnosis — make it count`;

    case 'diagnosis':
      if (!S.diagnosisPresented) {
        return `PHASE: DIAGNOSIS — PRESENT YOUR FINDINGS

You have gathered enough data. NOW present your diagnostic.

STRUCTURE (follow exactly):
1. Opening: "Ecco la mia diagnosi" / "Here is my diagnostic assessment"
2. COMPANY SNAPSHOT: 4-5 sentences summarizing everything using ONLY ✅ confirmed data
3. THREE REVENUE PROBLEMS — for each:
   - **Bold problem name**
   - Why it exists (root cause — reference what USER told you specifically)
   - Revenue impact (estimate with reasoning)
   - Benchmark (what good looks like)
   - Severity: 🔴 Critical / 🟡 High / 🟢 Medium
4. CORE HYPOTHESIS: one bold sentence connecting all three problems
5. Ask: "Does this resonate? What did I get right, and what did I miss?"

Set phase_signals.diagnosis_presented = true
Set profile_updates.diagnosedProblems = ["Problem 1 name", "Problem 2 name", "Problem 3 name"]
Set profile_updates.rootCauses = ["Cause 1", "Cause 2", "Cause 3"]

THIS MUST BE YOUR LONGEST MESSAGE. At least 15 sentences.
ONLY reference confirmed data. DO NOT invent metrics.`;
      }
      if (!S.diagnosisValidated) {
        return `PHASE: DIAGNOSIS — VALIDATION

User responded to your diagnosis. React to their feedback:
- If they agreed: validate, suggest priority order, ask which is #1
- If they disagreed: ask what's wrong, adjust, show flexibility
- Ask: "Which problem is your #1 priority? And what have you already tried to fix it?"

Set phase_signals.diagnosis_validated = true when they confirm
Extract userPriority from their response`;
      }
      return `Diagnosis complete. Transition to final summary.`;

    case 'pre_finish':
      return `PHASE: FINAL SUMMARY

Present complete picture using ONLY confirmed data:
1. Company snapshot
2. Three diagnosed problems in priority order
3. Preview: "Your Strategic Growth Plan will include: executive summary, diagnostic findings, 90-day roadmap, metrics, tool recommendations"
4. Ask: "Ready to generate?"

MUST include button: {"key":"generate_report","label":"📥 Generate Strategic Growth Plan"}
Also: {"key":"add_context","label":"I want to add more context first"}`;

    default:
      return 'Continue the conversation naturally.';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { choice, history = [], contextData, sessionData: input } = req.body;
    const gKey = process.env.GEMINI_API_KEY;
    const tKey = process.env.TAVILY_API_KEY;
    if (!gKey) return res.status(200).json({ message: '⚠️ GEMINI_API_KEY missing.', options: [{ key: 'restart', label: 'Retry' }], session_data: null, current_phase: 'error' });

    let S = input || createSession();
    S.totalTurns++;
    S.phaseTurns++;

    // ══════════════════════════════════════════════════
    // SPECIAL ACTIONS
    // ══════════════════════════════════════════════════

    if (choice === 'generate_report' || choice === 'update_and_generate') {
      return res.status(200).json({
        step_id: 'GENERATE', message: 'Generating...', mode: 'buttons', options: [],
        allow_text: false, session_data: S, current_phase: 'finish',
        turn_count: S.totalTurns, confidence_state: calcConf(S)
      });
    }

    // ══════════════════════════════════════════════════
    // INIT: SCRAPE + WELCOME
    // ══════════════════════════════════════════════════

    if (choice === 'SNAPSHOT_INIT') {
      S.currentPhase = 'welcome';
      S.phaseTurns = 0;

      if (contextData) {
        S.profile.website = contextData.website || '';
        if (contextData.description) S.profile.productDescription = contextData.description;

        const [web, li] = await Promise.all([
          contextData.website ? scrapeWebsite(contextData.website) : null,
          contextData.linkedin ? scrapeLinkedIn(contextData.linkedin, tKey) : null
        ]);

        let sc = '';
        if (contextData.description) sc += `USER DESCRIPTION: "${contextData.description}"\n`;
        if (web) {
          sc += `WEBSITE: ${web.url}\nTITLE: ${web.title}\nDESCRIPTION: ${web.desc}\n`;
          sc += `NAV: ${web.navLinks?.join(' | ') || '-'}\nH1: ${web.h1s?.join(' | ') || '-'}\nH2: ${web.h2s?.join(' | ') || '-'}\n`;
          sc += `CONTENT:\n${web.paras?.map((p, i) => `  ${i + 1}. ${p}`).join('\n') || '-'}\n`;
          sc += `PRICING: ${web.prices?.join(', ') || 'none'}\nPROOF: ${web.proof?.join(' | ') || 'none'}\nCTAs: ${web.ctas?.join(' | ') || '-'}\n`;
          if (web.title) { const n = web.title.split(/[|\-–—:]/)[0].trim(); if (n.length > 1 && n.length < 50) S.profile.companyName = n; }
          if (web.prices?.length) S.profile.pricingRange = web.prices.join(', ');
        }
        if (li) {
          sc += `LINKEDIN: ${li.name}, ${li.employees || '?'} empl, ${li.industry || '?'}\nLI DESC: ${li.desc}\n`;
          if (li.name) S.profile.companyName = li.name;
          if (li.industry) S.profile.industry = li.industry;
          if (li.employees) S.profile.teamSize = li.employees;
        }
        S.scrapedSummary = sc;
      }
    } else {
      // Record user message in transcript
      S.transcript.push({ role: 'user', text: choice });

      // Handle welcome_done on user's REPLY to welcome
      if (S.currentPhase === 'welcome' && S.phaseTurns >= 1) {
        S.welcomeDone = true;
      }

      // Handle add_context — just let them keep talking, don't change phase
      if (choice === 'add_context' || choice === 'adjust') {
        // Stay in current phase, AI will respond naturally
      }
    }

    // ══════════════════════════════════════════════════
    // CHECK PHASE ADVANCEMENT
    // ══════════════════════════════════════════════════

    if (choice !== 'SNAPSHOT_INIT') {
      if (canAdvancePhase(S)) {
        doAdvance(S);
        console.log(`[v11] Phase → ${S.currentPhase}`);
      }
    }

    // ══════════════════════════════════════════════════
    // BUILD THE FULL PROMPT
    // ══════════════════════════════════════════════════

    const transcript = buildTranscript(S);
    const profileCtx = buildProfileContext(S);
    const phasePrompt = getPhasePrompt(S);

    const fullPrompt = `You are the REVENUE ARCHITECT, a senior B2B revenue strategist (20+ years). You conduct deep discovery calls with founders and revenue leaders. Your style is direct, analytical, and specific — like a top-tier consultant who has seen hundreds of companies.

You know: MEDDPICC, Bow-Tie funnel, T2D3, SaaStr benchmarks, April Dunford positioning, Pirate Metrics (AARRR), David Sacks metrics (Burn Multiple, Magic Number, Rule of 40). You reference these naturally.

═══ LANGUAGE ═══
Match the user's language exactly. If they write Italian, respond 100% in Italian. English → English.

═══ CONVERSATION TRANSCRIPT (read this carefully — your FULL conversation so far) ═══
${transcript}

═══ CONFIRMED PROFILE DATA ═══
${profileCtx}

═══ WEBSITE SCAN DATA ═══
${S.scrapedSummary || '(none)'}

═══ CURRENT STATE ═══
Phase: ${S.currentPhase} | Phase turn: ${S.phaseTurns} | Total turns: ${S.totalTurns}

═══ YOUR INSTRUCTIONS ═══
${phasePrompt}

${choice !== 'SNAPSHOT_INIT' ? `═══ USER'S LATEST MESSAGE ═══\n"${choice}"` : '═══ This is the FIRST message — welcome them ═══'}

═══ RESPONSE FORMAT (valid JSON) ═══
{
  "message": "Your markdown response. Thorough and specific.",
  "options": [
    {"key": "short_key", "label": "Button text (max 60 chars)"}
  ],
  "profile_updates": {
    "fieldName": "value you extracted from the user's latest message"
  },
  "phase_signals": {
    "welcome_done": false,
    "diagnosis_presented": false,
    "diagnosis_validated": false
  }
}

═══ RULES ═══
1. READ THE TRANSCRIPT. Never ask something that was already discussed. If the transcript shows you already asked about revenue and the user answered, DO NOT ask about revenue again.
2. Acknowledge the user's SPECIFIC answer before moving on. "You said [X] — that tells me [Y]."
3. Go DEEP, not wide. Don't rush through a checklist. Ask follow-ups.
4. Generate 3-5 buttons that match YOUR question — not generic options.
5. profile_updates: extract facts from the user's latest message. Use these field names: ${Object.keys(S.profile).join(', ')}
6. For arrays (diagnosedProblems, rootCauses): provide ["item1", "item2"]
7. phase_signals: only set to true when the event ACTUALLY happened this turn.
8. Never invent data. Only reference ✅ confirmed data or scraped website data.
9. Minimum 5 sentences per response. This is a premium consulting experience.
10. Never use filler: "interesting", "great", "that's helpful", "let me understand", "tell me more".
11. Every turn should teach the user something — a benchmark, a framework, an insight about their business.`;

    // ══════════════════════════════════════════════════
    // CALL LLM
    // ══════════════════════════════════════════════════

    let llm;
    try {
      llm = await callGemini(fullPrompt, gKey);
    } catch (e) {
      console.error(`[v11] LLM error:`, e.message);
      llm = buildFallback(S);
    }

    // ══════════════════════════════════════════════════
    // UPDATE PROFILE
    // ══════════════════════════════════════════════════

    if (llm.profile_updates && typeof llm.profile_updates === 'object') {
      for (const [k, v] of Object.entries(llm.profile_updates)) {
        if (v == null || !S.profile.hasOwnProperty(k)) continue;
        if (Array.isArray(S.profile[k])) {
          const items = Array.isArray(v) ? v : [v];
          S.profile[k] = [...new Set([...S.profile[k], ...items.filter(i => i && String(i).trim())])];
        } else if (typeof v === 'string' && v.trim()) {
          S.profile[k] = v.trim();
        }
      }
    }

    // Process signals
    if (llm.phase_signals) {
      if (llm.phase_signals.welcome_done === true) S.welcomeDone = true;
      if (llm.phase_signals.diagnosis_presented === true) S.diagnosisPresented = true;
      if (llm.phase_signals.diagnosis_validated === true) S.diagnosisValidated = true;
    }

    // Record AI message in transcript
    const aiMsg = llm.message || '';
    S.transcript.push({ role: 'assistant', text: aiMsg });

    // Post-update phase check
    if (canAdvancePhase(S)) { doAdvance(S); }

    // ══════════════════════════════════════════════════
    // SANITIZE + RESPOND
    // ══════════════════════════════════════════════════

    const options = sanitizeOptions(llm.options, S);
    const isFinish = S.currentPhase === 'pre_finish';
    const hasGen = options.some(o => o.key === 'generate_report');
    const mode = (isFinish && hasGen) ? 'buttons' : 'mixed';

    console.log(`[v11] T${S.totalTurns} phase:${S.currentPhase} pt:${S.phaseTurns} opts:${options.length} conf:${calcConf(S).total}%`);

    return res.status(200).json({
      step_id: S.currentPhase,
      message: aiMsg,
      mode, options,
      allow_text: mode !== 'buttons',
      session_data: S,
      current_phase: PHASES[S.currentPhase]?.display || S.currentPhase,
      turn_count: S.totalTurns,
      confidence_state: calcConf(S)
    });

  } catch (e) {
    console.error('[v11 FATAL]', e);
    return res.status(200).json({
      step_id: 'error', message: 'Something went wrong. Tell me about your business.',
      mode: 'mixed', options: [{ key: 'restart', label: 'Start over' }],
      allow_text: true, session_data: null, current_phase: 'welcome'
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIONS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function sanitizeOptions(raw, S) {
  if (!Array.isArray(raw) || raw.length === 0) return getDefaults(S);
  const valid = raw.filter(o => o && typeof o.key === 'string' && typeof o.label === 'string' && o.key.length > 0 && o.label.length > 0)
    .map(o => ({ key: o.key.slice(0, 80), label: o.label.slice(0, 120) }))
    .slice(0, 6);
  return valid.length >= 2 ? valid : getDefaults(S);
}

function getDefaults(S) {
  if (S.currentPhase === 'welcome') return [{ key: 'correct', label: 'Yes, mostly correct' }, { key: 'partial', label: 'Partially — let me clarify' }, { key: 'wrong', label: 'Not quite right' }];
  if (S.currentPhase === 'pre_finish') return [{ key: 'generate_report', label: '📥 Generate Strategic Growth Plan' }, { key: 'add_context', label: 'Add more context first' }];
  return [{ key: 'continue', label: 'Continue →' }, { key: 'explain', label: 'Let me explain in detail' }];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK (when LLM fails)
// ═══════════════════════════════════════════════════════════════════════════════

function buildFallback(S) {
  const p = S.profile;
  const checks = PHASES[S.currentPhase]?.checklist || [];
  const missing = checks.find(k => { const v = p[k]; return Array.isArray(v) ? v.length === 0 : (!v || v.trim() === ''); });
  const fb = {
    businessModel: { m: "Let's talk about your revenue model. How do you charge customers?", o: [{ key: 'saas', label: 'SaaS subscription' }, { key: 'services', label: 'Services' }, { key: 'marketplace', label: 'Marketplace' }, { key: 'other', label: 'Other' }] },
    stage: { m: "What growth stage are you at?", o: [{ key: 'pre', label: 'Pre-revenue' }, { key: 'early', label: 'Early (< €10K MRR)' }, { key: 'growing', label: 'Growing (€10-50K)' }, { key: 'scaling', label: 'Scaling (€50K+)' }] },
    revenue: { m: "What's your current monthly recurring revenue?", o: [{ key: 'low', label: '< €5K MRR' }, { key: 'mid', label: '€5-20K MRR' }, { key: 'high', label: '€20-100K MRR' }, { key: 'top', label: '€100K+ MRR' }] },
    teamSize: { m: "How large is your team?", o: [{ key: 'solo', label: '1-2 people' }, { key: 'small', label: '3-10' }, { key: 'mid', label: '10-50' }, { key: 'large', label: '50+' }] },
    funding: { m: "What's your funding status?", o: [{ key: 'boot', label: 'Bootstrapped' }, { key: 'seed', label: 'Seed' }, { key: 'a', label: 'Series A+' }, { key: 'other', label: 'Other' }] },
    icpTitle: { m: "Who is your ideal buyer?", o: [{ key: 'smb', label: 'SMB owners' }, { key: 'mid', label: 'Mid-market' }, { key: 'ent', label: 'Enterprise' }, { key: 'dev', label: 'Technical' }] },
    salesMotion: { m: "How do you sell?", o: [{ key: 'in', label: 'Inbound' }, { key: 'out', label: 'Outbound' }, { key: 'plg', label: 'Product-led' }, { key: 'mix', label: 'Mix' }] },
    channels: { m: "Which channels work best?", o: [{ key: 'seo', label: 'Content/SEO' }, { key: 'social', label: 'LinkedIn' }, { key: 'paid', label: 'Paid ads' }, { key: 'ref', label: 'Referrals' }] },
    avgDealSize: { m: "What's your average deal size?", o: [{ key: 's', label: '< €1K' }, { key: 'm', label: '€1-10K' }, { key: 'l', label: '€10-50K' }, { key: 'xl', label: '€50K+' }] },
    salesProcess: { m: "Describe your sales process.", o: [{ key: 'none', label: 'No process' }, { key: 'basic', label: 'Basic' }, { key: 'doc', label: 'Documented' }, { key: 'self', label: 'Self-serve' }] },
    whoCloses: { m: "Who closes deals?", o: [{ key: 'f', label: 'Founder' }, { key: 'fm', label: 'Mostly founder' }, { key: 't', label: 'Sales team' }, { key: 's', label: 'Self-serve' }] },
    mainBottleneck: { m: "Where's the biggest bottleneck?", o: [{ key: 'l', label: 'Lead gen' }, { key: 'c', label: 'Conversion' }, { key: 'ch', label: 'Churn' }, { key: 'sc', label: 'Scaling' }] }
  };
  const f = fb[missing] || { m: 'Tell me more about your business.', o: [{ key: 'c', label: 'Continue' }] };
  return { message: f.m, options: f.o, profile_updates: {}, phase_signals: {} };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE — weighted across all fields, scales properly to ~15-20 turns
// ═══════════════════════════════════════════════════════════════════════════════

function calcConf(S) {
  const p = S.profile;
  // Weighted: core fields worth more, depth fields worth less
  const core = ['companyName', 'businessModel', 'stage', 'revenue', 'teamSize', 'funding',
    'icpTitle', 'salesMotion', 'channels', 'avgDealSize',
    'salesProcess', 'whoCloses', 'mainBottleneck']; // 13 items, 4 pts each = 52
  const depth = ['teamRoles', 'pricingModel', 'revenueGrowth', 'competitiveLandscape',
    'icpCompanySize', 'icpPainPoints', 'bestChannel', 'salesCycle',
    'winRate', 'lostDealReasons', 'churnRate', 'crm', 'tools']; // 13 items, 2 pts each = 26
  const milestones = ['diagnosedProblems', 'userPriority']; // 2 items, 6 pts each = 12
  // Total possible: 52 + 26 + 12 = 90 pts → normalized to 100%

  let score = 0;
  for (const k of core) { const v = p[k]; if (v && v.trim()) score += 4; }
  for (const k of depth) { const v = p[k]; if (v && v.trim()) score += 2; }
  for (const k of milestones) {
    const v = p[k];
    if (Array.isArray(v) ? v.length > 0 : (v && v.trim())) score += 6;
  }

  return { total: Math.min(100, Math.round((score / 90) * 100)) };
}
