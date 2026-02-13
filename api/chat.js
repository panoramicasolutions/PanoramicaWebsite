// ═══════════════════════════════════════════════════════════════════════════════
// REVENUE ARCHITECT - v10.0 — FLEXIBLE AI-DRIVEN CONVERSATION
//
// Architecture change from v9:
// - v9: Rigid step machine → LLM forced into pre-defined steps with hardcoded buttons
// - v10: Phase-guided AI → LLM drives conversation freely within phase guardrails
//
// How it works:
// 1. There are 5 PHASES: company, gtm, sales, diagnosis, finish
// 2. Each phase has a CHECKLIST of information to collect
// 3. The LLM decides WHAT to ask and HOW — including generating its own buttons
// 4. The system tracks what's been collected and tells the LLM what's missing
// 5. When a phase checklist is complete, the system advances to the next phase
// 6. Anti-hallucination: the report only uses data explicitly stored in the profile
//
// Bugs fixed:
// - No more duplicate questions (LLM sees what's already known)
// - No more stuck states (phase advances when checklist is filled)
// - No more rigid button mismatch (LLM generates contextual buttons)
// - Add-context works naturally (just reopens current phase)
// - Free text always accepted alongside buttons
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: PHASE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const PHASES = {
  welcome: {
    name: 'welcome',
    displayPhase: 'welcome',
    goal: 'Greet the user, present what you found on their website, and validate your assumptions.',
    nextPhase: 'company',
  },
  company: {
    name: 'company',
    displayPhase: 'company',
    goal: 'Understand the company DNA: business model, stage, revenue, team, and funding.',
    checklist: ['businessModel', 'stage', 'revenue', 'teamSize', 'funding'],
    nextPhase: 'gtm',
  },
  gtm: {
    name: 'gtm',
    displayPhase: 'gtm',
    goal: 'Map the Go-to-Market: ICP, sales motion, channels, and key metrics.',
    checklist: ['icpTitle', 'salesMotion', 'channels', 'avgDealSize'],
    nextPhase: 'sales',
  },
  sales: {
    name: 'sales',
    displayPhase: 'sales',
    goal: 'Analyze the Sales Engine: process, who closes, bottlenecks, tools.',
    checklist: ['salesProcess', 'whoCloses', 'mainBottleneck'],
    nextPhase: 'diagnosis',
  },
  diagnosis: {
    name: 'diagnosis',
    displayPhase: 'diagnosis',
    goal: 'Present your diagnosis of the top 3 revenue problems, validate with the user, and get their priority.',
    checklist: ['diagnosedProblems', 'userPriority'],
    nextPhase: 'pre_finish',
  },
  pre_finish: {
    name: 'pre_finish',
    displayPhase: 'pre_finish',
    goal: 'Summarize everything, preview the report, and offer to generate it.',
    checklist: [],
    nextPhase: null,
  }
};

const PHASE_ORDER = ['welcome', 'company', 'gtm', 'sales', 'diagnosis', 'pre_finish'];

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: SESSION
// ═══════════════════════════════════════════════════════════════════════════════

function createSession() {
  return {
    currentPhase: 'welcome',
    turnCount: 0,
    welcomeDone: false,
    diagnosisPresented: false,
    diagnosisValidated: false,
    profile: {
      companyName: '', website: '', industry: '', businessModel: '', stage: '', revenue: '',
      revenueGrowth: '', teamSize: '', teamRoles: '', funding: '', runway: '',
      productDescription: '', pricingModel: '', pricingRange: '',
      icpTitle: '', icpCompanySize: '', icpIndustry: '', icpPainPoints: '',
      salesMotion: '', channels: '', bestChannel: '',
      avgDealSize: '', salesCycle: '', cac: '', ltv: '',
      salesProcess: '', processDocumented: '', whoCloses: '', founderInvolvement: '',
      winRate: '', mainObjections: '', lostDealReasons: '', crm: '', churnRate: '',
      mainBottleneck: '', tools: '',
      diagnosedProblems: [], rootCauses: [], validatedProblems: [],
      userPriority: '', pastAttempts: '', constraints: '', additionalContext: ''
    },
    scrapedSummary: '',
    conversationLog: []
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildContext(session) {
  const p = session.profile;
  const lines = [];

  lines.push('═══ WHAT WE KNOW (confirmed by user — DO NOT re-ask these) ═══');
  const allFields = [
    ['Company Name', p.companyName], ['Website', p.website], ['Industry', p.industry],
    ['Business Model', p.businessModel], ['Stage', p.stage], ['Revenue', p.revenue],
    ['Revenue Growth', p.revenueGrowth], ['Team Size', p.teamSize], ['Team Roles', p.teamRoles],
    ['Funding', p.funding], ['Runway', p.runway],
    ['Product Description', p.productDescription], ['Pricing Model', p.pricingModel],
    ['Pricing Range', p.pricingRange],
    ['ICP / Buyer Title', p.icpTitle], ['ICP Company Size', p.icpCompanySize],
    ['ICP Industry', p.icpIndustry], ['ICP Pain Points', p.icpPainPoints],
    ['Sales Motion', p.salesMotion], ['Channels', p.channels], ['Best Channel', p.bestChannel],
    ['Avg Deal Size', p.avgDealSize], ['Sales Cycle', p.salesCycle],
    ['CAC', p.cac], ['LTV', p.ltv],
    ['Sales Process', p.salesProcess], ['Process Documented', p.processDocumented],
    ['Who Closes Deals', p.whoCloses], ['Founder Involvement', p.founderInvolvement],
    ['Win Rate', p.winRate], ['Main Bottleneck', p.mainBottleneck],
    ['Main Objections', p.mainObjections], ['Lost Deal Reasons', p.lostDealReasons],
    ['Churn Rate', p.churnRate], ['CRM / Tools', p.crm || p.tools],
    ['Diagnosed Problems', (p.diagnosedProblems || []).join('; ')],
    ['Root Causes', (p.rootCauses || []).join('; ')],
    ['User Priority', p.userPriority],
    ['Past Attempts', p.pastAttempts],
    ['Additional Context', p.additionalContext]
  ];

  let knownCount = 0;
  for (const [k, v] of allFields) {
    const hasValue = Array.isArray(v) ? v.length > 0 : (v && v.trim() !== '');
    if (hasValue) { lines.push(`  ✅ ${k}: ${v}`); knownCount++; }
  }
  if (knownCount === 0) lines.push('  (nothing confirmed yet)');

  const phase = PHASES[session.currentPhase];
  if (phase?.checklist) {
    const missing = phase.checklist.filter(k => {
      const v = p[k]; return Array.isArray(v) ? v.length === 0 : (!v || v.trim() === '');
    });
    if (missing.length > 0) {
      lines.push(`\n═══ STILL NEEDED FOR ${phase.name.toUpperCase()} PHASE ═══`);
      const labels = {
        businessModel: 'Business Model', stage: 'Stage/Revenue Level', revenue: 'Revenue (MRR/ARR)',
        teamSize: 'Team Size', funding: 'Funding Status',
        icpTitle: 'ICP / Target Buyer', salesMotion: 'Sales Motion (inbound/outbound/PLG)',
        channels: 'Main Channels', avgDealSize: 'Average Deal Size',
        salesProcess: 'Sales Process', whoCloses: 'Who Closes Deals',
        mainBottleneck: 'Main Bottleneck', diagnosedProblems: 'Diagnosed Problems',
        userPriority: 'User Priority'
      };
      missing.forEach(k => lines.push(`  ❓ ${labels[k] || k}`));
    }
  }

  if (session.scrapedSummary) {
    lines.push('\n═══ SCRAPED WEBSITE DATA (reference specific items) ═══');
    lines.push(session.scrapedSummary);
  }

  if (session.conversationLog.length > 0) {
    lines.push('\n═══ CONVERSATION SO FAR ═══');
    session.conversationLog.slice(-24).forEach(e => lines.push(e));
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: PHASE ADVANCEMENT
// ═══════════════════════════════════════════════════════════════════════════════

function checkPhaseComplete(session) {
  const phase = PHASES[session.currentPhase];
  if (!phase) return false;
  if (session.currentPhase === 'welcome') return session.welcomeDone;
  if (session.currentPhase === 'pre_finish') return false;
  if (session.currentPhase === 'diagnosis') {
    return session.diagnosisPresented && session.diagnosisValidated && session.profile.userPriority !== '';
  }
  if (!phase.checklist || phase.checklist.length === 0) return false;
  const p = session.profile;
  const filled = phase.checklist.filter(k => {
    const v = p[k]; return Array.isArray(v) ? v.length > 0 : (v && v.trim() !== '');
  }).length;
  return filled >= Math.max(1, phase.checklist.length - 1);
}

function advancePhase(session) {
  const phase = PHASES[session.currentPhase];
  if (phase?.nextPhase && PHASES[phase.nextPhase]) {
    session.currentPhase = phase.nextPhase;
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: SCRAPING
// ═══════════════════════════════════════════════════════════════════════════════

async function scrapeWebsite(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const c = new AbortController(); setTimeout(() => c.abort(), 15000);
    const r = await fetch(u.href, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: c.signal, redirect: 'follow'
    });
    const html = await r.text();
    const ex = (re) => (html.match(re) || [null, ''])[1]?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() || '';
    const exAll = (re, n = 8) => [...html.matchAll(re)].map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 2 && t.length < 300).slice(0, n);
    return {
      url: u.href, title: ex(/<title[^>]*>([^<]+)<\/title>/i),
      desc: ex(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i) || ex(/<meta[^>]*content="([^"]*)"[^>]*name="description"/i),
      ogDesc: ex(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i),
      h1s: exAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi), h2s: exAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, 12),
      h3s: exAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, 8),
      paras: [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => m[1].replace(/<[^>]*>/g, '').trim()).filter(t => t.length > 30 && t.length < 600).slice(0, 6),
      prices: [...new Set(html.match(/(\$|€|£)\s*\d+[,.]?\d*/g) || [])].slice(0, 8),
      proof: [...(html.match(/(\d+[,.]?\d*[kK]?\+?)\s*(customers?|users?|companies|clients|teams?)/gi) || []), ...(html.match(/trusted by[^<]{0,100}/gi) || [])].slice(0, 6),
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
// SECTION 6: LLM CALL
// ═══════════════════════════════════════════════════════════════════════════════

async function callGemini(systemPrompt, history, key) {
  const msgs = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I will respond ONLY with valid JSON containing "message", "options", "profile_updates", and "phase_signals" fields. I will never repeat questions that are already answered and marked with ✅.' }] }
  ];
  for (const m of history.slice(-16)) {
    let c = m.content;
    if (m.role === 'assistant') { try { c = JSON.parse(c).message || c; } catch {} }
    msgs.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: c.slice(0, 3000) }] });
  }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: msgs, generationConfig: { temperature: 0.7, responseMimeType: "application/json", maxOutputTokens: 4000 } })
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const d = await r.json();
  let t = d.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!t) throw new Error("Empty LLM response");
  t = t.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(t);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: MAIN HANDLER
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
    if (!gKey) return res.status(200).json({ message: '⚠️ GEMINI_API_KEY not configured.', options: [{ key: 'restart', label: 'Retry' }], session_data: null, current_phase: 'error' });

    let S = input || createSession();
    S.turnCount++;

    // ── Special: generate report ──
    if (choice === 'generate_report' || choice === 'update_and_generate') {
      return res.status(200).json({
        step_id: 'GENERATE', message: 'Generating...', mode: 'buttons', options: [],
        allow_text: false, session_data: S, current_phase: 'finish',
        turn_count: S.turnCount, confidence_state: calcConf(S)
      });
    }

    // ── INIT: scrape and start ──
    if (choice === 'SNAPSHOT_INIT') {
      S.currentPhase = 'welcome';
      if (contextData) {
        S.profile.website = contextData.website || '';
        if (contextData.description) S.profile.productDescription = contextData.description;
        const [web, li] = await Promise.all([
          contextData.website ? scrapeWebsite(contextData.website) : null,
          contextData.linkedin ? scrapeLinkedIn(contextData.linkedin, tKey) : null
        ]);
        let sc = '';
        if (contextData.description) sc += `USER SELF-DESCRIPTION: "${contextData.description}"\n`;
        if (web) {
          sc += `\nWEBSITE URL: ${web.url}\nPAGE TITLE: ${web.title}\nMETA DESCRIPTION: ${web.desc}\n`;
          if (web.ogDesc) sc += `OG DESCRIPTION: ${web.ogDesc}\n`;
          sc += `NAVIGATION: ${web.navLinks?.join(' | ') || 'none'}\nH1: ${web.h1s?.join(' | ') || 'none'}\nH2: ${web.h2s?.join(' | ') || 'none'}\nH3: ${web.h3s?.join(' | ') || 'none'}\n`;
          sc += `PARAGRAPHS:\n${web.paras?.map((p, i) => `  ${i + 1}. ${p}`).join('\n') || 'none'}\n`;
          sc += `PRICING: ${web.prices?.join(', ') || 'none'}\nSOCIAL PROOF: ${web.proof?.join(' | ') || 'none'}\nCTAs: ${web.ctas?.join(' | ') || 'none'}\n`;
          if (web.title) { const n = web.title.split(/[|\-–—:]/)[0].trim(); if (n.length > 1 && n.length < 50) S.profile.companyName = n; }
          if (web.prices?.length) S.profile.pricingRange = web.prices.join(', ');
        }
        if (li) {
          sc += `\nLINKEDIN: ${li.name}, ${li.employees || '?'} employees, ${li.industry || '?'}\nLINKEDIN DESC: ${li.desc}\n`;
          if (li.name) S.profile.companyName = li.name;
          if (li.industry) S.profile.industry = li.industry;
          if (li.employees) S.profile.teamSize = li.employees;
        }
        S.scrapedSummary = sc;
      }
    } else {
      S.conversationLog.push(`[USER turn ${S.turnCount}]: "${choice}"`);
    }

    // ── Check phase advancement BEFORE generating response ──
    if (choice !== 'SNAPSHOT_INIT' && choice !== 'add_context' && choice !== 'adjust') {
      if (checkPhaseComplete(S)) { advancePhase(S); console.log(`[v10] → Phase advanced to: ${S.currentPhase}`); }
    }

    // ── Build prompt ──
    const phase = PHASES[S.currentPhase];
    const ctx = buildContext(S);
    const phaseGuidance = getPhaseGuidance(S);

    const prompt = `You are the Revenue Architect, a world-class B2B revenue strategist. You have deep knowledge of MEDDPICC, Bow-Tie funnel, T2D3, SaaStr benchmarks, April Dunford positioning, Pirate Metrics (AARRR), and David Sacks efficiency metrics.

═══ LANGUAGE RULE ═══
Respond in the SAME language the user writes. Italian → all Italian. English → all English.

═══ CURRENT PHASE: ${S.currentPhase.toUpperCase()} ═══
Phase goal: ${phase.goal}

${ctx}

═══ YOUR INSTRUCTIONS FOR THIS TURN ═══
${phaseGuidance}

═══ USER JUST SAID ═══
"${choice}"

═══ RESPOND AS JSON ═══
{
  "message": "Your markdown response. Min 4 sentences. Reference real data. Be specific.",
  "options": [
    {"key": "short_key", "label": "Button label user sees (max 60 chars)"}
  ],
  "profile_updates": {
    "fieldName": "value extracted from user input"
  },
  "phase_signals": {
    "welcome_done": false,
    "diagnosis_presented": false,
    "diagnosis_validated": false
  }
}

═══ ABSOLUTE RULES ═══
1. NEVER re-ask about ✅ fields. They are confirmed. Asking again frustrates the user.
2. Generate 2-5 options that MATCH your question. If asking about revenue → revenue range buttons. If asking about ICP → ICP type buttons.
3. For profile_updates, extract info from user's response. Valid fields: ${Object.keys(S.profile).join(', ')}
4. For array fields (diagnosedProblems, rootCauses, validatedProblems), provide string arrays.
5. phase_signals: set welcome_done=true ONLY after user responded to welcome. Set diagnosis_presented=true when YOU present diagnosis. Set diagnosis_validated=true when user confirms/adjusts.
6. ALWAYS acknowledge user's input first, THEN ask next question.
7. You CAN combine related questions naturally (e.g. team size + roles in one turn).
8. Use real benchmarks, name real tools, cite frameworks. No vague advice.
9. NEVER say "interesting", "great question", "that's helpful", or generic filler.
10. NEVER invent numbers or facts the user didn't share. Only reference ✅ data or scraped data.
11. In diagnosis phase: if you have enough data, PRESENT the diagnosis. Don't keep asking.
12. In pre_finish: ALWAYS include {"key":"generate_report","label":"📥 Generate Strategic Growth Plan"}.
13. Keep options concise — max 60 characters per label.`;

    // ── Call LLM ──
    let llm;
    try {
      llm = await callGemini(prompt, history, gKey);
    } catch (e) {
      console.error(`[v10] LLM error:`, e.message);
      llm = buildFallbackResponse(S);
    }

    // ── Update profile ──
    if (llm.profile_updates && typeof llm.profile_updates === 'object') {
      for (const [k, v] of Object.entries(llm.profile_updates)) {
        if (v == null || !S.profile.hasOwnProperty(k)) continue;
        if (Array.isArray(S.profile[k])) {
          const items = Array.isArray(v) ? v : [v];
          S.profile[k] = [...new Set([...S.profile[k], ...items.filter(Boolean)])];
        } else if (typeof v === 'string' && v.trim()) {
          S.profile[k] = v.trim();
        }
      }
    }

    // ── Process phase signals ──
    if (llm.phase_signals && typeof llm.phase_signals === 'object') {
      if (llm.phase_signals.welcome_done === true) S.welcomeDone = true;
      if (llm.phase_signals.diagnosis_presented === true) S.diagnosisPresented = true;
      if (llm.phase_signals.diagnosis_validated === true) S.diagnosisValidated = true;
    }

    // Log AI
    S.conversationLog.push(`[AI turn ${S.turnCount}]: "${(llm.message || '').slice(0, 200).replace(/\n/g, ' ')}"`);

    // ── Check advancement AFTER profile updates ──
    if (checkPhaseComplete(S)) { advancePhase(S); }

    // ── Sanitize options ──
    let options = sanitizeOptions(llm.options, S);
    const isPreFinish = S.currentPhase === 'pre_finish';
    const hasGen = options.some(o => o.key === 'generate_report');
    const mode = (isPreFinish && hasGen) ? 'buttons' : 'mixed';

    console.log(`[v10] Turn ${S.turnCount} | Phase: ${S.currentPhase} | Opts: ${options.length} | Conf: ${calcConf(S).total}%`);

    return res.status(200).json({
      step_id: S.currentPhase,
      message: llm.message || 'Let me continue the analysis.',
      mode, options,
      allow_text: mode !== 'buttons',
      session_data: S,
      current_phase: PHASES[S.currentPhase]?.displayPhase || S.currentPhase,
      turn_count: S.turnCount,
      confidence_state: calcConf(S)
    });

  } catch (e) {
    console.error('[v10 FATAL]', e);
    return res.status(200).json({
      step_id: 'error', message: `Something went wrong. What's your biggest revenue challenge?`,
      mode: 'mixed', options: [
        { key: 'not_enough_leads', label: 'Not enough leads' }, { key: 'conversion_problem', label: 'Leads don\'t convert' },
        { key: 'cant_scale', label: 'Can\'t scale sales' }, { key: 'churn_issue', label: 'Churn hurts growth' }
      ], allow_text: true, session_data: null, current_phase: 'welcome'
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: PHASE GUIDANCE (what the LLM should do in each phase)
// ═══════════════════════════════════════════════════════════════════════════════

function getPhaseGuidance(S) {
  const p = S.profile;

  switch (S.currentPhase) {
    case 'welcome':
      return `Welcome the user. Reference 3-4 SPECIFIC things from scraped data (actual headlines, features, pricing).
Make 3 bold assumptions: revenue model, target customer, growth stage.
Ask: "Did I get this right? What should I correct?"
Options: confirmation/correction buttons.
Set phase_signals.welcome_done = true ONLY when responding to a user who already saw the welcome (i.e., NOT on the first turn, but on the second turn of this phase).`;

    case 'company':
      return `Gather company DNA. STILL MISSING: ${getMissing(p, ['businessModel', 'stage', 'revenue', 'teamSize', 'funding'])}
${p.businessModel ? '' : '- Ask about business model: SaaS/services/marketplace/hybrid'}
${p.stage || p.revenue ? '' : '- Ask about stage and revenue: pre-revenue, early, growing, scaling, mature'}
${p.teamSize ? '' : '- Ask about team size and composition'}
${p.funding ? '' : '- Ask about funding: bootstrapped/seed/series/other'}
You may combine 2 related questions if natural (e.g., stage+revenue, team+funding).
Provide benchmarks: T2D3 for SaaS, SaaStr team sizing, typical burn rates.
Generate options matching your specific question.`;

    case 'gtm':
      return `Map Go-to-Market. STILL MISSING: ${getMissing(p, ['icpTitle', 'salesMotion', 'channels', 'avgDealSize'])}
Company context: ${p.businessModel || '?'} at ${p.stage || '?'} stage, ${p.revenue || '?'} revenue, ${p.teamSize || '?'} team.
${p.icpTitle ? '' : '- Ask about ICP: buyer title, company size, industry. Push for specificity.'}
${p.salesMotion ? '' : '- Ask about sales motion: inbound/outbound/PLG/paid/mix'}
${p.channels ? '' : '- Ask about channels: which ones work, which is best'}
${p.avgDealSize ? '' : '- Ask about deal size, sales cycle, CAC if known'}
Reference April Dunford positioning, Jobs-to-be-Done framework.
Start by summarizing what you know about the company, then transition.`;

    case 'sales':
      return `Analyze Sales Engine. STILL MISSING: ${getMissing(p, ['salesProcess', 'whoCloses', 'mainBottleneck'])}
Context: selling to ${p.icpTitle || '?'} via ${p.salesMotion || '?'}, ${p.avgDealSize || '?'} deals.
${p.salesProcess ? '' : '- Ask about sales process: stages from first contact to close, documented?'}
${p.whoCloses ? '' : '- Ask who closes: founder %, sales team %, self-serve %'}
${p.mainBottleneck ? '' : '- Ask about bottleneck with a HYPOTHESIS: "I suspect [X] because [Y]". Also ask about tools/CRM.'}
Reference MEDDPICC. Mention founder-sales trap if relevant.
Be bold in your hypotheses — based on what you know, predict where the bottleneck is.`;

    case 'diagnosis':
      if (!S.diagnosisPresented) {
        return `PRESENT YOUR DIAGNOSIS NOW. You have enough data. Do NOT ask more discovery questions.
Structure:
1. "Here is my diagnostic assessment of ${p.companyName || 'your company'}:"
2. Company summary (3 sentences using ONLY ✅ confirmed data)
3. TOP 3 PROBLEMS — each with: bold name, root cause (reference what user told you), revenue impact (estimate from their numbers), benchmark, severity
4. Core hypothesis connecting the 3 problems (1 bold sentence)
5. "Does this resonate?"

ANTI-HALLUCINATION: every claim MUST reference ✅ data. Do NOT invent metrics.
Set profile_updates.diagnosedProblems = ["Problem 1", "Problem 2", "Problem 3"]
Set profile_updates.rootCauses = ["Cause 1", "Cause 2", "Cause 3"]
Set phase_signals.diagnosis_presented = true
Options: resonates / mostly right / missed something / wrong causes`;
      }
      if (!S.diagnosisValidated) {
        return `User responded to diagnosis. Acknowledge their feedback specifically.
If agreed: ask their #1 priority for next 90 days. Suggest an order.
If disagreed: ask what's wrong, adjust. Don't be defensive.
Set phase_signals.diagnosis_validated = true once they confirm.
Extract userPriority from their answer.`;
      }
      return `Diagnosis validated. Summarize and transition to pre_finish.`;

    case 'pre_finish':
      return `Final summary. Use ONLY ✅ confirmed data.
1. Company snapshot
2. The 3 diagnosed problems with priority
3. Report preview
4. MUST include option: {"key":"generate_report","label":"📥 Generate Strategic Growth Plan"}
Also offer: {"key":"add_context","label":"I want to add context first"}`;

    default:
      return 'Continue naturally.';
  }
}

function getMissing(profile, fields) {
  const labels = { businessModel: 'Business Model', stage: 'Stage', revenue: 'Revenue', teamSize: 'Team Size', funding: 'Funding', icpTitle: 'ICP', salesMotion: 'Sales Motion', channels: 'Channels', avgDealSize: 'Deal Size', salesProcess: 'Sales Process', whoCloses: 'Who Closes', mainBottleneck: 'Bottleneck', diagnosedProblems: 'Diagnosis', userPriority: 'Priority' };
  const missing = fields.filter(k => { const v = profile[k]; return Array.isArray(v) ? v.length === 0 : (!v || v.trim() === ''); });
  return missing.length > 0 ? missing.map(k => labels[k] || k).join(', ') : 'ALL COLLECTED ✅';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: OPTIONS SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function sanitizeOptions(raw, S) {
  if (!Array.isArray(raw) || raw.length === 0) return getDefaults(S);
  const valid = raw.filter(o => o && typeof o.key === 'string' && typeof o.label === 'string')
    .map(o => ({ key: o.key.slice(0, 100).replace(/[^a-zA-Z0-9_\-àèìòùáéíóúñü]/g, '_'), label: o.label.slice(0, 120) }))
    .slice(0, 6);
  return valid.length > 0 ? valid : getDefaults(S);
}

function getDefaults(S) {
  if (S.currentPhase === 'welcome') return [{ key: 'correct', label: 'Yes, correct' }, { key: 'partial', label: 'Partially' }, { key: 'wrong', label: 'Not quite' }];
  if (S.currentPhase === 'pre_finish') return [{ key: 'generate_report', label: '📥 Generate Strategic Growth Plan' }, { key: 'add_context', label: 'Add context first' }];
  return [{ key: 'continue', label: 'Continue →' }];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: FALLBACK
// ═══════════════════════════════════════════════════════════════════════════════

function buildFallbackResponse(S) {
  const p = S.profile;
  const phase = PHASES[S.currentPhase];
  if (!phase?.checklist) return { message: "Let's continue. Tell me more about your business.", options: [{ key: 'continue', label: 'Continue →' }], profile_updates: {}, phase_signals: {} };

  const missing = phase.checklist.filter(k => { const v = p[k]; return Array.isArray(v) ? v.length === 0 : (!v || v.trim() === ''); });
  const q = missing[0];
  const fallbacks = {
    businessModel: { msg: "What's your business model?", opts: [{ key: 'saas', label: 'SaaS subscription' }, { key: 'services', label: 'Services' }, { key: 'marketplace', label: 'Marketplace' }, { key: 'hybrid', label: 'Hybrid' }] },
    stage: { msg: "What stage are you at?", opts: [{ key: 'pre', label: 'Pre-revenue' }, { key: 'early', label: '€0-10K MRR' }, { key: 'growing', label: '€10-50K MRR' }, { key: 'scaling', label: '€50K+ MRR' }] },
    revenue: { msg: "What's your current MRR?", opts: [{ key: 'u5k', label: 'Under €5K' }, { key: '5_20k', label: '€5K-€20K' }, { key: '20_100k', label: '€20K-€100K' }, { key: 'o100k', label: '€100K+' }] },
    teamSize: { msg: "How large is your team?", opts: [{ key: 'solo', label: '1-2' }, { key: 'small', label: '3-10' }, { key: 'mid', label: '10-50' }, { key: 'large', label: '50+' }] },
    funding: { msg: "Funding situation?", opts: [{ key: 'boot', label: 'Bootstrapped' }, { key: 'seed', label: 'Seed' }, { key: 'series', label: 'Series A+' }, { key: 'other', label: 'Other' }] },
    icpTitle: { msg: "Who's your ideal customer?", opts: [{ key: 'smb', label: 'SMB owners' }, { key: 'mid', label: 'Mid-market' }, { key: 'ent', label: 'Enterprise' }, { key: 'dev', label: 'Developers' }] },
    salesMotion: { msg: "What's your sales motion?", opts: [{ key: 'in', label: 'Inbound' }, { key: 'out', label: 'Outbound' }, { key: 'plg', label: 'Product-led' }, { key: 'mix', label: 'Mixed' }] },
    channels: { msg: "Which channels work best?", opts: [{ key: 'content', label: 'Content/SEO' }, { key: 'social', label: 'Social' }, { key: 'paid', label: 'Paid ads' }, { key: 'ref', label: 'Referrals' }] },
    avgDealSize: { msg: "Average deal size?", opts: [{ key: 'u1k', label: '<€1K' }, { key: '1_10k', label: '€1K-€10K' }, { key: '10_50k', label: '€10K-€50K' }, { key: 'o50k', label: '€50K+' }] },
    salesProcess: { msg: "Describe your sales process.", opts: [{ key: 'none', label: 'No formal process' }, { key: 'basic', label: 'Basic' }, { key: 'doc', label: 'Documented' }, { key: 'plg', label: 'Self-serve' }] },
    whoCloses: { msg: "Who closes deals?", opts: [{ key: 'founder', label: 'Founder 100%' }, { key: 'mostly_f', label: 'Founder mostly' }, { key: 'team', label: 'Sales team' }, { key: 'self', label: 'Self-serve' }] },
    mainBottleneck: { msg: "Where's the bottleneck?", opts: [{ key: 'leads', label: 'Not enough leads' }, { key: 'conv', label: 'Low conversion' }, { key: 'churn', label: 'High churn' }, { key: 'scale', label: "Can't scale" }] }
  };
  const fb = fallbacks[q] || { msg: 'Tell me more.', opts: [{ key: 'continue', label: 'Continue →' }] };
  return { message: fb.msg, options: fb.opts, profile_updates: {}, phase_signals: {} };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: CONFIDENCE
// ═══════════════════════════════════════════════════════════════════════════════

function calcConf(S) {
  const p = S.profile;
  const all = ['companyName', 'businessModel', 'stage', 'revenue', 'teamSize', 'funding', 'icpTitle', 'salesMotion', 'channels', 'avgDealSize', 'salesProcess', 'whoCloses', 'mainBottleneck'];
  let filled = all.filter(k => { const v = p[k]; return Array.isArray(v) ? v.length > 0 : (v && v.trim() !== ''); }).length;
  if (p.diagnosedProblems?.length > 0) filled++;
  if (p.userPriority) filled++;
  return { total: Math.min(100, Math.round((filled / (all.length + 2)) * 100)) };
}
