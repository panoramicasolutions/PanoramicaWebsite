// ═══════════════════════════════════════════════════════════════════════════════
// REVENUE ARCHITECT - v9.0
// 
// Fixes from v8:
// 1. State machine: explicit step transitions with guard clauses
// 2. LLM prompts: deeply technical, framework-driven (MEDDPICC, Bow-Tie, etc.)
// 3. Conversation context: full replay with structured summaries
// 4. Add-context loop: clean re-entry with proper state tracking
// 5. Profile extraction: smarter parsing of user free-text responses
// 6. Scraping: graceful degradation with proxy fallback
// 7. Options: strictly from step definition, never LLM-generated
// 8. Error recovery: per-step fallback messages instead of generic errors
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: CONVERSATION SCRIPT — Each step is a discrete state
// ═══════════════════════════════════════════════════════════════════════════════

const STEPS = {
  // ── WELCOME ──
  welcome: {
    phase: 'welcome', nextStep: 'company_model',
    instruction: `You are starting a diagnostic conversation. Create a WELCOME message.

YOU MUST:
1. Greet the user and name their company (extract from scraped data or URL)
2. Reference 3-4 SPECIFIC things you found on their website — actual page titles, headlines, product names, pricing tiers, testimonials, feature descriptions. Quote them.
3. Make 3 bold, specific assumptions:
   - Their primary revenue model (subscription, usage-based, services, etc.)
   - Their target buyer persona (job title, company size)
   - Their likely growth stage and approximate revenue band
4. End with a direct validation question: "Did I get this right? What should I correct?"

TONE: Confident but not arrogant. Like a senior consultant who did their homework before the meeting.
Be SPECIFIC — generic statements like "you seem to have an interesting product" are useless.
MINIMUM 8 sentences. Reference actual scraped content.`,
    options: [
      { key: 'correct', label: 'Yes, that\'s mostly correct' },
      { key: 'partial', label: 'Partially — let me clarify a few things' },
      { key: 'wrong', label: 'Actually quite different — let me explain' }
    ],
    mode: 'mixed'
  },

  // ── COMPANY SECTION ──
  company_model: {
    phase: 'company', nextStep: 'company_stage',
    instruction: `Ask about their BUSINESS MODEL. You MUST:

1. First, acknowledge what they just said (correct/partial/wrong) with 2 specific sentences.
2. If they corrected something, explicitly note the correction: "Got it — so [X], not [Y]."
3. Share an observation: "From your website I noticed [specific detail], which suggests [inference about their model]."
4. Ask ONE clear question: "What's your core revenue model? Recurring SaaS subscription, usage-based, professional services, marketplace with take-rate, or a hybrid?"
5. Add context why this matters: "This determines your unit economics and which growth playbook applies — a SaaS company at $50K MRR needs a very different approach than a services firm at the same revenue."

MINIMUM 5 sentences. Be precise about what you observed on their site.`,
    options: [
      { key: 'saas_subscription', label: 'SaaS — recurring subscription' },
      { key: 'saas_usage', label: 'SaaS — usage-based pricing' },
      { key: 'services', label: 'Professional services / consulting' },
      { key: 'marketplace', label: 'Marketplace / platform' },
      { key: 'hybrid', label: 'Hybrid / other model' }
    ],
    mode: 'mixed'
  },

  company_stage: {
    phase: 'company', nextStep: 'company_team',
    instruction: `Ask about STAGE and REVENUE. You MUST:

1. Acknowledge their business model with a smart insight: "A [their model] business has specific unit economics — your gross margins should be [X%] if you're running it well."
2. Provide a relevant benchmark: "For [their model] companies, the typical progression is: $0-10K MRR = finding PMF, $10-50K = repeatable sales, $50-200K = scaling GTM, $200K+ = optimizing efficiency."
3. Ask ONE clear question: "Where are you on that spectrum? What's your current MRR or ARR?"
4. Explain why this shapes the strategy: "At pre-revenue, we'd focus on PMF validation. At $30K MRR, it's about making your sales motion repeatable. Very different playbooks."

Use the T2D3 framework reference where applicable (triple, triple, double, double, double for SaaS growth).
MINIMUM 5 sentences.`,
    options: [
      { key: 'pre_revenue', label: 'Pre-revenue — still building' },
      { key: 'early', label: '€0-€10K MRR — early traction' },
      { key: 'growing', label: '€10K-€50K MRR — growing' },
      { key: 'scaling', label: '€50K-€200K MRR — scaling' },
      { key: 'mature', label: '€200K+ MRR — optimizing' }
    ],
    mode: 'mixed'
  },

  company_team: {
    phase: 'company', nextStep: 'company_funding',
    instruction: `Ask about TEAM structure. You MUST:

1. Contextualize with a benchmark: "At [their MRR], the SaaStr benchmark for a [their model] company is roughly [X] people: typically [breakdown]. Companies that over-hire before repeatable revenue average 18 months to burn through their runway."
2. Reference the ratio: "The engineering-to-revenue ratio matters — David Sacks suggests ~$200K ARR per engineer as a healthy target for growth-stage SaaS."
3. Ask ONE clear question: "How many people on your team? What's the split between product/engineering, sales/marketing, and operations?"
4. Note why composition matters: "A 10-person team that's 8 engineers and 2 founders usually means you're building, not selling. We need to know if the team structure matches your growth stage."

MINIMUM 5 sentences. Use real benchmarks.`,
    options: [
      { key: 'solo', label: 'Solo founder / 1-2 people' },
      { key: 'small', label: '3-5 people, mostly technical' },
      { key: 'growing_team', label: '5-15, mixed roles' },
      { key: 'mid', label: '15-50, structured departments' },
      { key: 'large', label: '50+ employees' }
    ],
    mode: 'mixed'
  },

  company_funding: {
    phase: 'company', nextStep: 'gtm_icp',
    instruction: `Ask about FUNDING and RUNWAY. You MUST:

1. Acknowledge team info with an insight connecting team size to their stage.
2. Explain the strategic implication: "Funding determines your growth tempo. Bootstrapped profitable means you optimize for efficiency — every dollar of CAC must pay back in <12 months. VC-backed with $2M in the bank means you can invest ahead of revenue, but you need to show 3x growth for your next round."
3. Ask ONE clear question: "Are you bootstrapped or funded? If funded, what stage and how much runway?"
4. Connect to the plan: "This shapes whether we recommend a capital-efficient or blitz-scaling approach."

MINIMUM 4 sentences.`,
    options: [
      { key: 'bootstrapped_profit', label: 'Bootstrapped and profitable' },
      { key: 'bootstrapped_burn', label: 'Bootstrapped, burning cash' },
      { key: 'seed', label: 'Pre-seed or seed funded' },
      { key: 'series_a', label: 'Series A or later' },
      { key: 'other_funding', label: 'Other (grants, revenue-based, etc.)' }
    ],
    mode: 'mixed'
  },

  // ── GTM SECTION ──
  gtm_icp: {
    phase: 'gtm', nextStep: 'gtm_motion',
    instruction: `TRANSITION to Go-to-Market analysis.

1. Start with: "Good — I now have a clear picture of your company DNA. Let me summarize before we map your GTM:"
2. Give a 3-sentence company summary using REAL data from the profile (model, stage, revenue, team, funding).
3. Explain: "A well-defined ICP is the #1 predictor of sales efficiency. Companies with a tight ICP convert 2-3x better than those selling to anyone with a pulse. As April Dunford says, positioning is about 'who is this for and why should they care?'"
4. Ask ONE clear question: "Who is your ideal customer? Specifically: what job title is the buyer, what company size (employees or revenue), and what industry or vertical?"
5. Push for specificity: "I need the tightest possible definition. Not 'marketing people' but 'VP Marketing at B2B SaaS companies with 50-200 employees.'"

MINIMUM 6 sentences.`,
    options: [
      { key: 'smb', label: 'SMB owners / small teams (<50 employees)' },
      { key: 'mid_market', label: 'Mid-market managers/directors (50-500)' },
      { key: 'enterprise', label: 'Enterprise VP/C-level (500+)' },
      { key: 'developers', label: 'Developers / technical users' },
      { key: 'unclear_icp', label: 'Not clearly defined yet' }
    ],
    mode: 'mixed'
  },

  gtm_motion: {
    phase: 'gtm', nextStep: 'gtm_metrics',
    instruction: `Ask about SALES MOTION and CHANNELS. You MUST:

1. Acknowledge their ICP with a strategic insight: "Selling to [their ICP] typically means [specific implications for sales approach]. These buyers are reached through [typical channels] and have a decision-making process that's [fast/slow/committee]."
2. Reference the sales complexity matrix: "With [their deal size/ICP], you're in [low-touch/mid-touch/high-touch] territory. Jason Lemkin's framework suggests [X] for this segment."
3. Ask ONE clear question: "What's your primary go-to-market motion? Inbound (content, SEO, referrals), outbound (cold email, LinkedIn, calls), product-led (free trial, freemium), paid (ads, sponsorships), or a combination?"
4. Ask a follow-up: "Which single channel drives most of your pipeline today?"

MINIMUM 5 sentences. Reference relevant GTM frameworks.`,
    options: [
      { key: 'inbound_content', label: 'Inbound — content, SEO, referrals' },
      { key: 'outbound_cold', label: 'Outbound — cold email, LinkedIn, calls' },
      { key: 'plg', label: 'Product-led — free trial, freemium' },
      { key: 'paid', label: 'Paid — ads, sponsorships' },
      { key: 'mixed_channels', label: 'Mix of multiple channels' },
      { key: 'figuring_out', label: 'Still figuring out what works' }
    ],
    mode: 'mixed'
  },

  gtm_metrics: {
    phase: 'gtm', nextStep: 'sales_process',
    instruction: `Ask about KEY METRICS. You MUST:

1. Provide context-specific benchmarks: "For a [their model] company selling to [their ICP] with a [their motion] approach, the typical metrics are: ACV of [X], sales cycle of [Y weeks/months], CAC of [Z], and a healthy LTV:CAC ratio of 3:1+."
2. Reference the SaaS metrics framework: "The 'magic number' (net new ARR / sales & marketing spend) should be >0.75 for efficient growth. Below that, you're spending too much to acquire."
3. Ask ONE compound question: "What's your average deal size (ACV), typical sales cycle length, and do you know your customer acquisition cost?"
4. If they likely don't track: "Even rough estimates help — how many deals closed last quarter and what was total new revenue?"

Push for real numbers. MINIMUM 5 sentences.`,
    options: [
      { key: 'low_touch', label: '<€1K ACV, <2 week cycle' },
      { key: 'mid_touch', label: '€1K-€10K ACV, 1-3 month cycle' },
      { key: 'high_touch', label: '€10K+ ACV, 3-6+ month cycle' },
      { key: 'dont_track', label: 'Don\'t track these yet' },
      { key: 'varies', label: 'Varies significantly' }
    ],
    mode: 'mixed'
  },

  // ── SALES SECTION ──
  sales_process: {
    phase: 'sales', nextStep: 'sales_who_closes',
    instruction: `TRANSITION to Sales Engine analysis.

1. Start: "Let me summarize your GTM picture before we dig into the sales engine."
2. Give a 3-sentence GTM summary with REAL data (ICP, motion, channels, metrics).
3. Frame the section: "A repeatable, documented sales process is what separates companies that hit $1M ARR from those that stall at $300K. Mark Roberge (HubSpot CRO) calls it the 'Sales Acceleration Formula' — you need a process before you can optimize it."
4. Ask: "Walk me through what happens from first contact to signed deal. How many stages? Is this documented anywhere, or is it mostly in people's heads?"
5. Reference MEDDPICC or another framework: "I'll be evaluating your process against frameworks like MEDDPICC (Metrics, Economic Buyer, Decision Process, Decision Criteria, Paper Process, Identify Pain, Champion, Competition) to find gaps."

MINIMUM 6 sentences.`,
    options: [
      { key: 'no_process', label: 'No formal process — ad hoc' },
      { key: 'basic', label: 'Basic: demo → proposal → close' },
      { key: 'documented', label: 'Multi-stage documented pipeline' },
      { key: 'enterprise_proc', label: 'Complex enterprise with procurement' },
      { key: 'self_serve', label: 'Mostly self-serve / PLG' }
    ],
    mode: 'mixed'
  },

  sales_who_closes: {
    phase: 'sales', nextStep: 'sales_bottleneck',
    instruction: `Ask WHO CLOSES DEALS. You MUST:

1. Acknowledge their process and rate it: "A [basic/documented/etc.] process at your stage is [ahead of/typical for/behind] where you should be."
2. Present the founder-sales trap: "If the founder closes >60% of deals, you have a scaling ceiling. The company's revenue is capped by the founder's calendar. Bob Tinker (author of Survival to Thrival) calls this the 'founder-led sales trap' — you need to hire your first AE before you think you're ready."
3. Ask ONE clear question: "Who is actually closing deals today? What percentage is founder vs. team?"
4. Connect to their data: "With [their team size] and [their revenue], the math says each closer should carry [X] in quota."

MINIMUM 5 sentences.`,
    options: [
      { key: 'founder_all', label: 'Founder closes everything (100%)' },
      { key: 'founder_most', label: 'Founder 60-90%, team assists' },
      { key: 'split', label: 'About 50/50 founder and team' },
      { key: 'team_mostly', label: 'Team mostly, founder on big deals' },
      { key: 'no_sales', label: 'No dedicated sales team yet' }
    ],
    mode: 'mixed'
  },

  sales_bottleneck: {
    phase: 'sales', nextStep: 'sales_tools',
    instruction: `Ask about BOTTLENECKS. You MUST:

1. Based on everything learned so far, make a SPECIFIC hypothesis: "Based on your [model] selling to [ICP] via [motion] at [stage], with [who closes], I suspect your primary bottleneck is [specific problem] because [specific reasoning]."
2. Reference the "Bow Tie" funnel: "Looking at the full revenue lifecycle — awareness → acquisition → activation → revenue → retention → expansion — where do deals get stuck?"
3. Ask ONE clear question: "Where do deals die? What's your approximate win rate? And what's your churn — monthly or annual?"
4. Push on the uncomfortable question: "Be honest — what's the real reason deals don't close? Is it product gaps, pricing, competition, urgency, or something else?"

MINIMUM 6 sentences. Your hypothesis should be specific and bold.`,
    options: [
      { key: 'not_enough_leads', label: 'Not enough qualified leads (top of funnel)' },
      { key: 'leads_cold', label: 'Leads go cold — slow follow-up' },
      { key: 'stuck_deal', label: 'Deals stall in negotiation/evaluation' },
      { key: 'price_issue', label: 'Price objection is the main blocker' },
      { key: 'no_urgency', label: 'No urgency — they go dark' },
      { key: 'churn_kills', label: 'We close deals but churn kills growth' }
    ],
    mode: 'mixed'
  },

  sales_tools: {
    phase: 'sales', nextStep: 'diagnosis_present',
    instruction: `Ask about TOOLS and TECH STACK. You MUST:

1. Acknowledge the bottleneck with empathy and insight: "The [their bottleneck] problem is [common/unusual] for companies at your stage. Here's why it matters: [quantified impact]."
2. Frame the tools question: "Your tech stack should solve specific problems, not add complexity. At [their stage] selling [their model] to [their ICP], the essential stack is: [specific recommendations with tool names]."
3. Ask ONE question: "What tools do you use today? CRM, email/sequence automation, analytics, call recording, proposal software?"
4. Give a specific recommendation: "At your stage, I'd recommend [specific stack] because [reason]. That costs roughly [estimate] per month."

Reference specific tools: HubSpot, Pipedrive, Apollo.io, Outreach, Gong, PandaDoc, Stripe, ChartMogul, etc.
MINIMUM 5 sentences.`,
    options: [
      { key: 'spreadsheets', label: 'Spreadsheets / manual tracking' },
      { key: 'basic_crm', label: 'Basic CRM (HubSpot Free, Pipedrive)' },
      { key: 'full_stack', label: 'Full stack: CRM + automation + analytics' },
      { key: 'too_many', label: 'Too many disconnected tools' },
      { key: 'need_recs', label: 'Minimal — need recommendations' }
    ],
    mode: 'mixed'
  },

  // ── DIAGNOSIS SECTION ──
  diagnosis_present: {
    phase: 'diagnosis', nextStep: 'diagnosis_validate',
    instruction: `PRESENT YOUR DIAGNOSIS. This is the most important message. Do NOT ask discovery questions.

STRUCTURE YOUR RESPONSE EXACTLY:

1. Opening: "Based on our conversation, here is my diagnostic assessment of [Company]'s revenue engine:"

2. COMPANY DNA (3 sentences):
   - "[Company] is a [model] company at [stage] with [revenue], [team], and [funding]."
   - "They sell to [ICP] via [motion], with [deal size] deals and [cycle] cycles."
   - "[Observation about their unique situation]."

3. TOP 3 REVENUE PROBLEMS — for each:
   - **Problem name** (bold, specific)
   - Root cause: why this exists (2 sentences with specifics)
   - Revenue impact: quantified estimate of money left on the table
   - Industry benchmark: what "good" looks like with a source
   - Severity: Critical / High / Medium

4. CORE HYPOTHESIS (1 sentence, bold):
   "The central issue is [X] which creates a cascade effect on [Y] and [Z]."

5. End with: "Does this diagnosis resonate with what you're experiencing? What did I get right, and what did I miss?"

This MUST be your LONGEST response. MINIMUM 15 sentences.
Use REAL data from the profile. EVERY claim must reference something the user told you.
Be bold and specific — not vague consulting-speak.`,
    options: [
      { key: 'resonates', label: '🎯 Spot on — this resonates strongly' },
      { key: 'mostly_right', label: 'Mostly right, a few adjustments' },
      { key: 'missed_issue', label: 'You missed an important issue' },
      { key: 'wrong_causes', label: 'Right problems, but wrong root causes' }
    ],
    mode: 'mixed'
  },

  diagnosis_validate: {
    phase: 'diagnosis', nextStep: 'pre_finish',
    instruction: `User responded to your diagnosis.

If they agreed (resonates/mostly_right):
1. Validate: "Good — this gives us a strong foundation for the growth plan."
2. Prioritize: "Of the three problems, which is your #1 priority for the next 90 days? And critically: what have you already tried to fix it?"
3. Explain why order matters: "In my experience, tackling [suggested order] in sequence creates compounding returns because [reason]."

If they disagreed (missed_issue/wrong_causes):
1. Ask: "Tell me what I got wrong or what I missed. This is crucial — a plan built on wrong assumptions wastes everyone's time."
2. Show openness: "I'd rather be corrected now than build a plan that misses the mark."

Reference their SPECIFIC feedback. MINIMUM 5 sentences.`,
    options: [
      { key: 'priority_1', label: 'Problem #1 is my top priority' },
      { key: 'priority_2', label: 'Problem #2 is most urgent' },
      { key: 'priority_3', label: 'Problem #3 matters most' },
      { key: 'different', label: 'My priority is different — let me explain' }
    ],
    mode: 'mixed'
  },

  // ── PRE-FINISH ──
  pre_finish: {
    phase: 'pre_finish', nextStep: null,
    instruction: `FINAL SUMMARY before report generation.

STRUCTURE:
1. "Here's the complete picture before I generate your strategic plan:"

2. COMPANY SNAPSHOT (use REAL data — every field should be specific):
   - Company, model, stage, revenue, team, funding
   
3. THE 3 DIAGNOSED PROBLEMS (1 sentence each, extremely specific):
   - Problem 1: [name] — [impact]
   - Problem 2: [name] — [impact]
   - Problem 3: [name] — [impact]

4. PRIORITY ORDER based on their input: "Based on your feedback, we'll focus on [X] first, then [Y], then [Z]."

5. REPORT PREVIEW: "Your Strategic Growth Plan will include:
   - Executive summary with company DNA
   - Detailed diagnostic findings with root cause analysis
   - 90-day phased roadmap with weekly actions
   - Key metrics dashboard with current vs. target
   - Tool stack recommendations with costs
   - Risk mitigation plan"

6. "Ready to generate?"

MINIMUM 10 sentences. Make it feel like a premium deliverable is coming.`,
    options: [
      { key: 'generate_report', label: '📥 Generate Strategic Growth Plan' },
      { key: 'add_context', label: 'Wait — I want to add important context' },
      { key: 'adjust', label: 'I want to adjust a finding first' }
    ],
    mode: 'buttons'
  },

  // ── ADD CONTEXT (re-entrant loop) ──
  add_context_ask: {
    phase: 'add_context', nextStep: 'add_context_receive',
    instruction: `The user wants to add or correct something before the report.

Say: "Of course — this is exactly the right time to add context. A better input means a better plan."
Then: "What would you like to add or correct? Take your time."

Do NOT mention the report button. Do NOT rush them.
MINIMUM 3 sentences. Be welcoming and patient.`,
    options: [
      { key: 'about_team', label: 'About our team / org structure' },
      { key: 'about_market', label: 'About our market / competition' },
      { key: 'about_product', label: 'About our product / roadmap' },
      { key: 'about_challenges', label: 'Additional challenges we face' },
      { key: 'correct_diagnosis', label: 'Correct something in the diagnosis' }
    ],
    mode: 'mixed'
  },

  add_context_receive: {
    phase: 'add_context', nextStep: 'add_context_done',
    instruction: `The user just shared additional context. You MUST:

1. Acknowledge SPECIFICALLY what they said — paraphrase it back to show you processed it.
2. Explain how this changes your understanding: "This is significant because [reason]. It means [implication for the diagnosis]."
3. If it changes a finding: "This shifts my assessment of Problem [X] — the root cause is actually [updated cause]."
4. Ask: "Anything else to add? Or shall I update the analysis and prepare the report?"

MINIMUM 5 sentences. Demonstrate that you actually internalized their input.`,
    options: [
      { key: 'more_to_add', label: 'I have more to add' },
      { key: 'done_adding', label: 'That\'s everything — update and continue' }
    ],
    mode: 'mixed'
  },

  add_context_done: {
    phase: 'add_context', nextStep: null,
    instruction: `Present UPDATED findings after incorporating new context.

1. "Here's my updated assessment incorporating what you just shared:"
2. WHAT CHANGED: Be explicit about what shifted vs. the original diagnosis
3. UPDATED PRIORITY ORDER
4. Repeat the report preview
5. "Ready to generate the updated plan?"

MINIMUM 7 sentences. Show the delta clearly.`,
    options: [
      { key: 'generate_report', label: '📥 Generate Updated Strategic Growth Plan' },
      { key: 'add_more', label: 'Actually, one more thing...' }
    ],
    mode: 'buttons'
  }
};

// Step order for normal flow
const STEP_ORDER = [
  'welcome', 'company_model', 'company_stage', 'company_team', 'company_funding',
  'gtm_icp', 'gtm_motion', 'gtm_metrics',
  'sales_process', 'sales_who_closes', 'sales_bottleneck', 'sales_tools',
  'diagnosis_present', 'diagnosis_validate', 'pre_finish'
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: SESSION STATE
// ═══════════════════════════════════════════════════════════════════════════════

function createSession() {
  return {
    currentStep: 'welcome',
    turnCount: 0,
    previousStep: null,
    profile: {
      companyName: '', website: '', industry: '', businessModel: '', stage: '', revenue: '',
      revenueGrowth: '', teamSize: '', teamRoles: '', funding: '', runway: '',
      productDescription: '', pricingModel: '', pricingRange: '',
      icpTitle: '', icpCompanySize: '', icpIndustry: '', icpPainPoints: '',
      salesMotion: '', channels: '', bestChannel: '',
      avgDealSize: '', salesCycle: '', cac: '', ltv: '', magicNumber: '',
      salesProcess: '', processDocumented: '', whoCloses: '', founderInvolvement: '',
      winRate: '', mainObjections: '', lostDealReasons: '', crm: '', churnRate: '',
      mainBottleneck: '', tools: '',
      diagnosedProblems: [], rootCauses: [], validatedProblems: [],
      userPriority: '', pastAttempts: '', constraints: '', additionalContext: ''
    },
    scrapedSummary: '',
    turnLog: []
  };
}

function buildContext(session) {
  const p = session.profile;
  const lines = [];

  lines.push('═══ COMPLETE BUSINESS PROFILE (use this data in your response) ═══');
  const fields = [
    ['Company', p.companyName], ['Website', p.website], ['Industry', p.industry],
    ['Business Model', p.businessModel], ['Stage', p.stage], ['Revenue', p.revenue],
    ['Growth', p.revenueGrowth], ['Team Size', p.teamSize], ['Team Roles', p.teamRoles],
    ['Funding', p.funding], ['Runway', p.runway],
    ['Product', p.productDescription],
    ['Pricing', `${p.pricingModel} ${p.pricingRange}`.trim()],
    ['ICP Buyer Title', p.icpTitle], ['ICP Company Size', p.icpCompanySize],
    ['ICP Industry', p.icpIndustry], ['ICP Pain Points', p.icpPainPoints],
    ['Sales Motion', p.salesMotion], ['Channels', p.channels],
    ['Best Channel', p.bestChannel], ['Avg Deal Size (ACV)', p.avgDealSize],
    ['Sales Cycle', p.salesCycle], ['CAC', p.cac], ['LTV', p.ltv],
    ['Magic Number', p.magicNumber],
    ['Sales Process', p.salesProcess], ['Process Documented', p.processDocumented],
    ['Who Closes', p.whoCloses], ['Founder Involvement', p.founderInvolvement],
    ['Win Rate', p.winRate], ['Main Bottleneck', p.mainBottleneck],
    ['Lost Deal Reasons', p.lostDealReasons], ['Churn Rate', p.churnRate],
    ['CRM/Tools', p.crm || p.tools],
    ['Diagnosed Problems', (p.diagnosedProblems || []).join('; ')],
    ['Root Causes', (p.rootCauses || []).join('; ')],
    ['Validated Problems', (p.validatedProblems || []).join('; ')],
    ['User Priority', p.userPriority],
    ['Past Attempts', p.pastAttempts],
    ['Additional Context', p.additionalContext]
  ];
  for (const [k, v] of fields) {
    if (v && v.trim && v.trim() !== '') {
      lines.push(`  ${k}: ${v}`);
    } else if (Array.isArray(v) && v.length > 0) {
      lines.push(`  ${k}: ${v.join('; ')}`);
    }
  }

  if (session.scrapedSummary) {
    lines.push('\n═══ SCRAPED WEBSITE DATA (reference specific items from this) ═══');
    lines.push(session.scrapedSummary);
  }

  if (session.turnLog.length > 0) {
    lines.push('\n═══ CONVERSATION HISTORY (what was discussed so far) ═══');
    session.turnLog.forEach(e => lines.push('  ' + e));
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: SCRAPING
// ═══════════════════════════════════════════════════════════════════════════════

async function scrapeWebsite(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const c = new AbortController();
    setTimeout(() => c.abort(), 15000);
    const r = await fetch(u.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: c.signal,
      redirect: 'follow'
    });
    const html = await r.text();

    const ex = (re) => {
      const m = html.match(re);
      return m ? m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
    };
    const exAll = (re, n = 8) =>
      [...html.matchAll(re)]
        .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
        .filter(t => t.length > 2 && t.length < 300)
        .slice(0, n);

    return {
      url: u.href,
      title: ex(/<title[^>]*>([^<]+)<\/title>/i),
      desc: ex(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i) ||
            ex(/<meta[^>]*content="([^"]*)"[^>]*name="description"/i),
      ogDesc: ex(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i),
      h1s: exAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi),
      h2s: exAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, 12),
      h3s: exAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, 8),
      paras: [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map(m => m[1].replace(/<[^>]*>/g, '').trim())
        .filter(t => t.length > 30 && t.length < 600)
        .slice(0, 6),
      listItems: [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map(m => m[1].replace(/<[^>]*>/g, '').trim())
        .filter(t => t.length > 10 && t.length < 200)
        .slice(0, 10),
      prices: [...new Set(html.match(/(\$|€|£)\s*\d+[,.]?\d*/g) || [])].slice(0, 8),
      proof: [
        ...(html.match(/(\d+[,.]?\d*[kK]?\+?)\s*(customers?|users?|companies|clients|teams?)/gi) || []),
        ...(html.match(/trusted by[^<]{0,100}/gi) || []),
        ...(html.match(/used by[^<]{0,100}/gi) || [])
      ].slice(0, 6),
      ctas: [...html.matchAll(/<(?:a|button)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi)]
        .map(m => m[1].replace(/<[^>]*>/g, '').trim())
        .filter(t => t.length > 3 && t.length < 50 && /(?:start|try|get|sign|book|demo|free|contact|buy|subscribe)/i.test(t))
        .slice(0, 5),
      navLinks: [...html.matchAll(/<nav[\s\S]*?<\/nav>/gi)]
        .flatMap(m => [...m[0].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)])
        .map(m => m[1].replace(/<[^>]*>/g, '').trim())
        .filter(t => t.length > 1 && t.length < 40)
        .slice(0, 10)
    };
  } catch (e) {
    console.error('[Scrape error]', e.message);
    return null;
  }
}

async function scrapeLinkedIn(url, key) {
  if (!url || !key) return null;
  try {
    const slug = url.match(/linkedin\.com\/company\/([^\/\?]+)/i)?.[1];
    if (!slug) return null;
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query: `"${slug}" site:linkedin.com company`,
        search_depth: "advanced",
        max_results: 3,
        include_answer: true
      })
    });
    if (!r.ok) return null;
    const d = await r.json();
    return {
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      employees: d.answer?.match(/(\d+[\-–]?\d*)\s*(employees?|people)/i)?.[0] || '',
      industry: d.answer?.match(/(?:industry|sector):\s*([^.]+)/i)?.[1]?.trim() || '',
      desc: d.answer?.slice(0, 500) || ''
    };
  } catch (e) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: LLM CALL
// ═══════════════════════════════════════════════════════════════════════════════

async function callGemini(prompt, history, key) {
  const msgs = [
    { role: 'user', parts: [{ text: prompt }] },
    { role: 'model', parts: [{ text: 'Understood. I will output ONLY valid JSON with "message" (markdown string) and "profile_updates" (object) fields. I will follow the instruction exactly and be specific.' }] }
  ];

  // Add conversation history (last 16 turns for more context)
  for (const m of history.slice(-16)) {
    let c = m.content;
    if (m.role === 'assistant') {
      try { c = JSON.parse(c).message || c; } catch {}
    }
    msgs.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: c.slice(0, 3000) }]
    });
  }

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: msgs,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
          maxOutputTokens: 4000
        }
      })
    }
  );

  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const d = await r.json();
  let t = d.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!t) throw new Error("Empty LLM response");

  t = t.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(t);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: MAIN REQUEST HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { choice, history = [], contextData, sessionData: input } = req.body;
    const gKey = process.env.GEMINI_API_KEY;
    const tKey = process.env.TAVILY_API_KEY;

    if (!gKey) {
      return res.status(200).json({
        message: '⚠️ API key not configured. Please set GEMINI_API_KEY.',
        options: [{ key: 'restart', label: 'Retry' }],
        session_data: null, current_phase: 'error'
      });
    }

    let S = input || createSession();
    S.turnCount++;

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: DETERMINE WHICH STEP TO EXECUTE (state machine)
    // ═══════════════════════════════════════════════════════════════════

    let stepToExecute = S.currentStep;
    let userInput = choice;

    // === INIT: Scrape website and start at welcome ===
    if (choice === 'SNAPSHOT_INIT') {
      S.currentStep = 'welcome';
      stepToExecute = 'welcome';

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
          sc += `\nWEBSITE URL: ${web.url}\n`;
          sc += `PAGE TITLE: ${web.title}\n`;
          sc += `META DESCRIPTION: ${web.desc}\n`;
          if (web.ogDesc) sc += `OG DESCRIPTION: ${web.ogDesc}\n`;
          sc += `NAVIGATION: ${web.navLinks?.join(' | ') || 'none'}\n`;
          sc += `H1 HEADLINES: ${web.h1s?.join(' | ') || 'none'}\n`;
          sc += `H2 SECTIONS: ${web.h2s?.join(' | ') || 'none'}\n`;
          sc += `H3 SUBSECTIONS: ${web.h3s?.join(' | ') || 'none'}\n`;
          sc += `KEY PARAGRAPHS:\n${web.paras?.map((p, i) => `  ${i + 1}. ${p}`).join('\n') || 'none'}\n`;
          sc += `FEATURE LIST ITEMS: ${web.listItems?.join(' | ') || 'none'}\n`;
          sc += `PRICING FOUND: ${web.prices?.join(', ') || 'none'}\n`;
          sc += `SOCIAL PROOF: ${web.proof?.join(' | ') || 'none'}\n`;
          sc += `CTAs: ${web.ctas?.join(' | ') || 'none'}\n`;

          // Extract company name from title
          if (web.title) {
            const name = web.title.split(/[|\-–—]/)[0].trim();
            if (name && name.length < 40) S.profile.companyName = name;
          }
          if (web.prices?.length) S.profile.pricingRange = web.prices.join(', ');
        }
        if (li) {
          sc += `\nLINKEDIN: ${li.name}, ${li.employees || '?'} employees, ${li.industry || '?'}\n`;
          sc += `LINKEDIN DESCRIPTION: ${li.desc}\n`;
          if (li.name) S.profile.companyName = li.name;
          if (li.industry) S.profile.industry = li.industry;
          if (li.employees) S.profile.teamSize = li.employees;
        }
        S.scrapedSummary = sc;
      }
    }
    // === ADD CONTEXT triggers ===
    else if (['add_context', 'adjust', 'correct_diagnosis'].includes(choice)) {
      S.previousStep = S.currentStep;
      stepToExecute = 'add_context_ask';
      S.currentStep = 'add_context_ask';
    }
    // === ADD MORE loops back ===
    else if (choice === 'add_more' || choice === 'more_to_add') {
      stepToExecute = 'add_context_ask';
      S.currentStep = 'add_context_ask';
    }
    // === DONE ADDING → show updated diagnosis ===
    else if (choice === 'done_adding') {
      stepToExecute = 'add_context_done';
      S.currentStep = 'add_context_done';
    }
    // === GENERATE REPORT (handled client-side, but return ack) ===
    else if (choice === 'generate_report' || choice === 'update_and_generate') {
      return res.status(200).json({
        step_id: 'GENERATE', message: 'Generating your report...',
        mode: 'buttons', options: [],
        allow_text: false, session_data: S,
        current_phase: 'finish', turn_count: S.turnCount,
        confidence_state: calcConf(S)
      });
    }
    // === NORMAL: advance to next step ===
    else {
      const currentDef = STEPS[S.currentStep];
      if (currentDef?.nextStep) {
        stepToExecute = currentDef.nextStep;
        S.currentStep = currentDef.nextStep;
      } else {
        // At pre_finish or terminal — stay
        stepToExecute = S.currentStep;
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: LOG USER INPUT
    // ═══════════════════════════════════════════════════════════════════

    if (choice !== 'SNAPSHOT_INIT') {
      S.turnLog.push(`Turn ${S.turnCount}: [step:${S.currentStep}] User responded: "${choice.slice(0, 200)}"`);

      // Store free-text in add_context
      if (S.currentStep.startsWith('add_context') &&
        !['add_context', 'adjust', 'correct_diagnosis', 'more_to_add', 'add_more', 'done_adding',
          'about_team', 'about_market', 'about_product', 'about_challenges'].includes(choice)) {
        S.profile.additionalContext = ((S.profile.additionalContext || '') + ' | ' + choice).slice(0, 2000);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: GET STEP DEFINITION
    // ═══════════════════════════════════════════════════════════════════

    const step = STEPS[stepToExecute];
    if (!step) {
      return res.status(200).json({
        step_id: 'error',
        message: 'Something went wrong with the conversation flow. Let\'s start fresh.',
        mode: 'buttons',
        options: [{ key: 'restart', label: 'Start Over' }],
        allow_text: false, session_data: S, current_phase: 'error'
      });
    }

    console.log(`[v9] Turn ${S.turnCount} | Step: ${stepToExecute} | Phase: ${step.phase} | Input: "${choice.slice(0, 60)}"`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: CALL LLM
    // ═══════════════════════════════════════════════════════════════════

    const ctx = buildContext(S);
    const prompt = `You are the Revenue Architect, a world-class B2B revenue strategist with 20 years of experience scaling companies from $0 to $50M+ ARR. You combine the analytical rigor of a McKinsey consultant with the practical knowledge of someone who has built and sold startups.

Your frameworks include: MEDDPICC for sales qualification, Bow-Tie funnel for full lifecycle, T2D3 for SaaS growth benchmarks, the SaaStr operating model, Jobs-to-be-Done for ICP, April Dunford's positioning framework, and the Pirate Metrics (AARRR). You reference real benchmarks from OpenView, Bessemer Cloud Index, and KeyBanc SaaS surveys.

LANGUAGE RULE: Respond in the SAME language the user writes in. If they write Italian, respond entirely in Italian. If English, respond in English. Match their language exactly.

═══ KNOWN DATA ABOUT THIS COMPANY ═══
${ctx}

═══ CURRENT STEP: ${stepToExecute} ═══
═══ PHASE: ${step.phase} ═══

YOUR TASK FOR THIS TURN:
${step.instruction}

THE USER JUST SAID/CHOSE: "${userInput}"

RESPOND AS JSON:
{
  "message": "Your markdown-formatted response. FOLLOW THE INSTRUCTION ABOVE EXACTLY. Be specific and reference real data.",
  "profile_updates": { "fieldName": "extracted value from user input" }
}

CRITICAL RULES:
1. FOLLOW the instruction EXACTLY — do not skip steps or add extra questions beyond what's specified
2. ALWAYS acknowledge what the user just said before asking your question
3. For profile_updates, extract ANY useful information from the user's response. Use ONLY these field names: ${Object.keys(S.profile).join(', ')}
4. Your message MUST end with a clear QUESTION (unless this is the diagnosis or pre_finish step)
5. Use REAL numbers, names, tools, and benchmarks — never be vague
6. NEVER say "interesting", "great question", "that's helpful" or similar filler phrases
7. Be confident and direct — you're a senior consultant, not a junior analyst
8. Reference specific things from the scraped data and conversation history
9. MINIMUM response length as specified in the instruction`;

    let llm;
    try {
      llm = await callGemini(prompt, history, gKey);
    } catch (e) {
      console.error(`[v9] LLM error at step ${stepToExecute}:`, e.message);
      // Fallback: use the step instruction as a basis
      llm = {
        message: `Let's continue with the analysis. ${step.instruction.split('\n').filter(l => l.includes('Ask')).join(' ').slice(0, 300)}`,
        profile_updates: {}
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: UPDATE PROFILE from LLM extractions
    // ═══════════════════════════════════════════════════════════════════

    if (llm.profile_updates && typeof llm.profile_updates === 'object') {
      for (const [k, v] of Object.entries(llm.profile_updates)) {
        if (!v || !S.profile.hasOwnProperty(k)) continue;
        if (Array.isArray(S.profile[k])) {
          const items = Array.isArray(v) ? v : [v];
          S.profile[k] = [...new Set([...S.profile[k], ...items.filter(Boolean)])];
        } else if (typeof v === 'string' && v.trim()) {
          S.profile[k] = v.trim();
        }
      }
    }

    S.turnLog.push(`Turn ${S.turnCount}: [step:${stepToExecute}] AI asked about ${step.phase}`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 6: RESPOND — options are ALWAYS from step definition
    // ═══════════════════════════════════════════════════════════════════

    const conf = calcConf(S);

    return res.status(200).json({
      step_id: stepToExecute,
      message: llm.message || 'Let me continue the analysis.',
      mode: step.mode || 'mixed',
      options: step.options,
      allow_text: step.mode !== 'buttons',
      session_data: S,
      current_phase: step.phase,
      turn_count: S.turnCount,
      confidence_state: conf
    });

  } catch (e) {
    console.error('[v9 FATAL]', e);
    return res.status(200).json({
      step_id: 'error',
      message: `An error occurred: ${e.message}. Let's try to continue.`,
      mode: 'mixed',
      options: [
        { key: 'leads', label: 'My biggest challenge is lead generation' },
        { key: 'conversion', label: 'Leads don\'t convert to customers' },
        { key: 'scaling', label: 'I can\'t scale beyond founder-led sales' },
        { key: 'churn', label: 'Customer churn is killing growth' }
      ],
      allow_text: true, session_data: null, current_phase: 'welcome'
    });
  }
}

function calcConf(S) {
  const p = S.profile;
  const important = [
    'companyName', 'businessModel', 'stage', 'revenue', 'teamSize',
    'icpTitle', 'salesMotion', 'channels', 'salesProcess', 'whoCloses', 'mainBottleneck'
  ];
  let filled = important.filter(k => {
    const v = p[k];
    return Array.isArray(v) ? v.length > 0 : v && v !== '';
  }).length;
  if (p.diagnosedProblems?.length > 0) filled++;
  if (p.additionalContext) filled += 0.5;
  return { total: Math.min(100, Math.round((filled / (important.length + 1)) * 100)) };
}
