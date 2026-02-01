// ═══════════════════════════════════════════════════════════════════════════════
// REVENUE ARCHITECT - v7.0 SCRIPTED FLOW
// 
// Core change: The conversation flow is SCRIPTED, not improvised.
// Each turn has a SPECIFIC question ID. The LLM formats the message
// but CANNOT skip questions or invent its own flow.
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: THE CONVERSATION SCRIPT
// Each step defines exactly what to ask and what options to show.
// The LLM's job is to FORMAT the question with context, NOT to decide what to ask.
// ═══════════════════════════════════════════════════════════════════════════════

const SCRIPT = [
  // ── PHASE: WELCOME ──────────────────────────────────────────────────────────
  {
    id: 'welcome',
    phase: 'welcome',
    instruction: `You just scraped the user's website. Create a WELCOME message that:
1. Greets them and names their company
2. References 3-4 SPECIFIC things from their website (headlines, pricing, features)
3. Makes 3 bold assumptions about their business based on the data
4. Asks: "Did I get this right? What should I correct?"

Be confident, specific, reference exact quotes from the website.
Minimum 5 sentences.`,
    options: [
      { key: 'correct', label: 'Yes, that\'s mostly correct' },
      { key: 'partial', label: 'Partially right — let me clarify' },
      { key: 'wrong', label: 'Actually, our situation is quite different' }
    ],
    saves: ['companyName', 'industry', 'productDescription', 'pricingRange'],
    mode: 'mixed'
  },

  // ── PHASE: COMPANY ──────────────────────────────────────────────────────────
  {
    id: 'company_model',
    phase: 'company',
    instruction: `Based on what you know so far, ask about their BUSINESS MODEL.
    
Specifically ask:
- What is their business model? (SaaS, services, marketplace, agency, etc.)
- Is it B2B, B2C, or B2B2C?
- Subscription, one-time, usage-based?

Include a relevant insight: "Based on your website, it looks like [X]. Companies with this model typically [Y]."
Include a benchmark or reference when possible.
Ask ONE clear question. Minimum 4 sentences.`,
    options: [
      { key: 'saas_subscription', label: 'SaaS with monthly/annual subscription' },
      { key: 'saas_usage', label: 'SaaS with usage-based pricing' },
      { key: 'services', label: 'Professional services / consulting' },
      { key: 'marketplace', label: 'Marketplace / platform' },
      { key: 'other_model', label: 'Different model — let me explain' }
    ],
    saves: ['businessModel'],
    mode: 'mixed'
  },
  {
    id: 'company_stage',
    phase: 'company',
    instruction: `Now ask about their COMPANY STAGE and REVENUE.

Ask specifically:
- What stage are they at? (pre-revenue, early, growth, scaling)
- Current MRR or ARR?
- Monthly growth rate?

Include context: "Given that you're a [business model from previous answer], companies at different stages face very different challenges. For example, pre-PMF companies need [X] while post-PMF need [Y]."
Minimum 4 sentences. ONE clear question.`,
    options: [
      { key: 'pre_revenue', label: 'Pre-revenue — still building/validating' },
      { key: 'early_0_10k', label: '€0-€10K MRR — first customers' },
      { key: 'growing_10_50k', label: '€10K-€50K MRR — growing' },
      { key: 'scaling_50_200k', label: '€50K-€200K MRR — scaling' },
      { key: 'mature_200k_plus', label: '€200K+ MRR — optimizing' }
    ],
    saves: ['stage', 'revenue', 'revenueGrowth'],
    mode: 'mixed'
  },
  {
    id: 'company_team',
    phase: 'company',
    instruction: `Ask about their TEAM COMPOSITION.

Ask specifically:
- How many people on the team?
- How is the team split? (tech, sales, marketing, ops)
- Any key roles missing?

Include context: "At [their stage/revenue], the typical team structure for a [their model] is [X]. A common mistake is [Y]."
Reference like: "According to SaaStr data, companies at $X MRR typically have Y employees."
Minimum 4 sentences.`,
    options: [
      { key: 'solo', label: 'Solo founder or 1-2 people' },
      { key: 'small_3_5', label: '3-5 people, mostly technical' },
      { key: 'growing_5_15', label: '5-15 people, mixed roles' },
      { key: 'mid_15_50', label: '15-50 people, structured teams' },
      { key: 'large_50plus', label: '50+ people' }
    ],
    saves: ['teamSize', 'teamRoles'],
    mode: 'mixed'
  },
  {
    id: 'company_funding',
    phase: 'company',
    instruction: `Ask about FUNDING and FINANCIAL HEALTH.

Ask:
- Are you bootstrapped or funded?
- If funded, what round? How much runway?
- If bootstrapped, are you profitable?

Include: "This matters because it determines how aggressively you can invest in growth. Bootstrapped companies typically need [X approach] while VC-backed need [Y approach]."
Minimum 4 sentences.`,
    options: [
      { key: 'bootstrapped_profitable', label: 'Bootstrapped and profitable' },
      { key: 'bootstrapped_burning', label: 'Bootstrapped but burning cash' },
      { key: 'pre_seed', label: 'Pre-seed / seed funded' },
      { key: 'series_a_plus', label: 'Series A or later' },
      { key: 'other_funding', label: 'Other situation' }
    ],
    saves: ['funding'],
    mode: 'mixed'
  },

  // ── PHASE: GO-TO-MARKET ─────────────────────────────────────────────────────
  {
    id: 'gtm_icp',
    phase: 'gtm',
    instruction: `Transition to GO-TO-MARKET analysis. Start with ICP (Ideal Customer Profile).

First, summarize what you've learned about the company in 2 sentences.
Then ask about their ICP:
- Who is the ideal buyer? (Job title, seniority)
- What size companies? (SMB, mid-market, enterprise)
- What industry or vertical?
- What's their biggest pain point that your product solves?

Include: "A well-defined ICP is the foundation of scalable revenue. Without it, you're spreading resources too thin."
Reference a framework or resource (e.g., "The ICP framework from Winning by Design suggests...")
Minimum 5 sentences.`,
    options: [
      { key: 'smb_owner', label: 'SMB owners / solopreneurs' },
      { key: 'mid_manager', label: 'Mid-market managers/directors' },
      { key: 'enterprise_vp', label: 'Enterprise VP/C-level' },
      { key: 'technical_ic', label: 'Technical individual contributors' },
      { key: 'not_clear', label: 'Not clearly defined yet' }
    ],
    saves: ['icpTitle', 'icpCompanySize', 'icpIndustry', 'icpPainPoints'],
    mode: 'mixed'
  },
  {
    id: 'gtm_motion',
    phase: 'gtm',
    instruction: `Ask about their SALES MOTION and PRIMARY CHANNELS.

Ask:
- Is your go-to-market primarily inbound, outbound, product-led, or a mix?
- What are your top 3 acquisition channels?
- Which channel generates the most qualified leads?
- Are you running any paid acquisition? Budget?

Include: "For a [their model] selling to [their ICP], the most effective motion is typically [X]. Companies like [example] have scaled using [Y approach]."
Mention specific tools/platforms relevant to their motion.
Minimum 5 sentences.`,
    options: [
      { key: 'inbound_content', label: 'Inbound: content marketing, SEO, blog' },
      { key: 'inbound_paid', label: 'Inbound: paid ads (Google, Meta, LinkedIn)' },
      { key: 'outbound_cold', label: 'Outbound: cold email, LinkedIn prospecting' },
      { key: 'plg', label: 'Product-led: free trial, freemium, self-serve' },
      { key: 'referral_network', label: 'Referrals, partnerships, word of mouth' },
      { key: 'mixed', label: 'Mix of multiple channels' }
    ],
    saves: ['salesMotion', 'channels', 'bestChannel'],
    mode: 'mixed'
  },
  {
    id: 'gtm_metrics',
    phase: 'gtm',
    instruction: `Ask about their KEY GTM METRICS.

Ask:
- Average deal size (ACV)?
- Average sales cycle length?
- Conversion rate from lead to customer?
- Do you know your CAC (Customer Acquisition Cost)?

Include benchmarks: "For B2B [their model] at [their stage], typical benchmarks are: ACV of [X], sales cycle of [Y], CAC of [Z]. LTV:CAC should be >3x."
This data is critical for the diagnosis. Push for specifics, not vague answers.
Minimum 4 sentences.`,
    options: [
      { key: 'low_touch', label: 'Low touch: <€1K ACV, <2 week cycle' },
      { key: 'mid_touch', label: 'Mid touch: €1K-€10K ACV, 1-3 month cycle' },
      { key: 'high_touch', label: 'High touch: €10K+ ACV, 3-6+ month cycle' },
      { key: 'dont_know', label: 'Don\'t track these metrics yet' },
      { key: 'mixed_deals', label: 'Mix of deal sizes' }
    ],
    saves: ['avgDealSize', 'salesCycle', 'cac', 'ltv'],
    mode: 'mixed'
  },

  // ── PHASE: SALES ENGINE ─────────────────────────────────────────────────────
  {
    id: 'sales_process',
    phase: 'sales',
    instruction: `Transition to SALES ENGINE analysis.

Summarize GTM findings in 2 sentences first.
Then ask about their SALES PROCESS:
- What does the sales process look like from first contact to close?
- How many stages/steps?
- Is it documented or just "in the founder's head"?
- Do you use a CRM? Which one?

Include: "A documented, repeatable sales process is what separates companies that scale from those that stall. The 'Founder-Led Sales Trap' is when only the founder can close deals because the process isn't codified."
Minimum 5 sentences.`,
    options: [
      { key: 'no_process', label: 'No formal process — mostly ad hoc' },
      { key: 'basic_process', label: 'Basic process: demo → proposal → close' },
      { key: 'documented', label: 'Well-documented multi-stage pipeline' },
      { key: 'complex_enterprise', label: 'Complex enterprise with procurement' },
      { key: 'self_serve', label: 'Mostly self-serve / product-led' }
    ],
    saves: ['salesProcess', 'processDocumented', 'crm'],
    mode: 'mixed'
  },
  {
    id: 'sales_who_closes',
    phase: 'sales',
    instruction: `Ask WHO CLOSES DEALS and the FOUNDER'S ROLE in sales.

Ask:
- Who is closing deals right now? Founder, sales team, or self-serve?
- What percentage does the founder close vs. the team?
- Can deals close WITHOUT the founder being involved?
- If you have salespeople, what's their close rate vs. the founder's?

Include: "This is one of the most critical diagnostics. If the founder closes >60% of deals, you have a scaling ceiling. A client I worked with had the founder at 85% of closes — we had to build a sales playbook before anything else could scale."
Minimum 5 sentences. Push for specific percentages.`,
    options: [
      { key: 'founder_all', label: 'Founder closes 100% of deals' },
      { key: 'founder_most', label: 'Founder closes 60-90%, team assists' },
      { key: 'mixed_closing', label: 'Split ~50/50 between founder and team' },
      { key: 'team_closes', label: 'Sales team closes most, founder on big deals only' },
      { key: 'no_sales_team', label: 'No dedicated sales team yet' }
    ],
    saves: ['whoCloses', 'founderInvolvement'],
    mode: 'mixed'
  },
  {
    id: 'sales_bottleneck',
    phase: 'sales',
    instruction: `Ask about BOTTLENECKS and LOST DEALS.

Ask:
- Where do most deals get stuck or die in your pipeline?
- What are the top 3 reasons you lose deals?
- What's your win rate? (% of qualified opportunities that close)
- What's your current churn rate?

Include: "The #1 revenue leak for companies at your stage is usually [X]. Based on what you've told me about [their process/who closes], I'd guess the bottleneck might be [hypothesis]. Let me check..."
Be specific to their situation. Minimum 5 sentences.`,
    options: [
      { key: 'not_enough_leads', label: 'Not enough qualified leads entering pipeline' },
      { key: 'leads_go_cold', label: 'Leads go cold — slow follow-up or no nurture' },
      { key: 'stuck_negotiation', label: 'Deals stall in negotiation/procurement' },
      { key: 'price_objection', label: 'Price is the main objection' },
      { key: 'no_urgency', label: 'Prospects don\'t see enough urgency to buy' },
      { key: 'churn_problem', label: 'We close deals but churn is killing growth' }
    ],
    saves: ['mainBottleneck', 'winRate', 'lostDealReasons', 'churnRate'],
    mode: 'mixed'
  },
  {
    id: 'sales_tools',
    phase: 'sales',
    instruction: `Ask about their TECH STACK and OPERATIONAL SETUP.

Ask:
- What tools do you use for sales/marketing? (CRM, email, analytics)
- How do you track pipeline and forecasts?
- Do you have any automation set up?
- What data do you trust/not trust?

Include: "At [their stage], the essential stack is typically [X, Y, Z]. Common mistake: buying enterprise tools too early, or worse, running everything from spreadsheets."
Recommend specific tools relevant to their situation.
Minimum 4 sentences.`,
    options: [
      { key: 'spreadsheets', label: 'Mostly spreadsheets and manual tracking' },
      { key: 'basic_crm', label: 'Basic CRM (HubSpot Free, Pipedrive, etc.)' },
      { key: 'full_stack', label: 'Full stack: CRM + automation + analytics' },
      { key: 'too_many_tools', label: 'Too many tools, nothing connected' },
      { key: 'minimal', label: 'Minimal tooling — need recommendations' }
    ],
    saves: ['crm', 'tools'],
    mode: 'mixed'
  },

  // ── PHASE: DIAGNOSIS ────────────────────────────────────────────────────────
  {
    id: 'diagnosis_present',
    phase: 'diagnosis',
    instruction: `NOW PRESENT YOUR DIAGNOSIS. You have gathered enough information.

DO NOT ask another discovery question. Instead:

1. Start with: "Based on our conversation, here is my diagnosis."
2. Identify the TOP 3 revenue problems, ranked by impact
3. For EACH problem explain:
   - What the problem is (specific, not vague)
   - Root cause (WHY it's happening)
   - Revenue impact (quantify if possible)
   - What "good" looks like (benchmark)
4. State your CORE HYPOTHESIS in one sentence
5. End with: "Does this diagnosis resonate? What would you adjust?"

Use the FULL profile data. Be SPECIFIC — reference actual numbers they gave you.
This should be your longest message — minimum 8-10 sentences.
Include relevant links to frameworks or resources for each problem.`,
    options: [
      { key: 'resonates_strongly', label: '🎯 This resonates strongly — spot on' },
      { key: 'mostly_right', label: 'Mostly right but I\'d adjust the priority' },
      { key: 'missed_something', label: 'You missed an important issue' },
      { key: 'wrong_root_cause', label: 'Right problems, wrong root causes' }
    ],
    saves: ['diagnosedProblems', 'rootCauses'],
    mode: 'mixed'
  },
  {
    id: 'diagnosis_validate',
    phase: 'diagnosis',
    instruction: `The user just responded to your diagnosis. 

If they agreed: Confirm and move to priorities.
If they disagreed: Acknowledge, ask what's different, ADJUST your diagnosis.
If they added something: Incorporate it and present UPDATED diagnosis.

Then ask: "If you could only fix ONE of these problems in the next 90 days, which would it be? And what have you already tried?"

Minimum 5 sentences. Reference their specific feedback.`,
    options: [
      { key: 'fix_problem_1', label: 'Priority #1 from your diagnosis' },
      { key: 'fix_problem_2', label: 'Priority #2 from your diagnosis' },
      { key: 'fix_problem_3', label: 'Priority #3 from your diagnosis' },
      { key: 'different_priority', label: 'Actually, my top priority is different' }
    ],
    saves: ['validatedProblems', 'userPriority', 'pastAttempts'],
    mode: 'mixed'
  },

  // ── PHASE: PRE-FINISH ───────────────────────────────────────────────────────
  {
    id: 'pre_finish',
    phase: 'pre_finish',
    instruction: `Present the FINAL SUMMARY before report generation.

Structure:
1. "Here's the complete picture:" 
2. Company snapshot (3 sentences)
3. The 3 diagnosed problems (1 sentence each)
4. Your recommended priority order
5. Preview: "Your Strategic Growth Plan will include: executive summary, diagnostic findings, 90-day roadmap with weekly actions, metrics to track, and tool recommendations."
6. "Ready to generate?"

Make it feel like a premium deliverable is coming. Minimum 6 sentences.`,
    options: [
      { key: 'generate_report', label: '📥 Generate Strategic Growth Plan' },
      { key: 'add_context', label: 'Wait, I want to add important context first' },
      { key: 'adjust_diagnosis', label: 'I want to adjust one of the findings' }
    ],
    saves: [],
    mode: 'buttons'
  }
];

// ── ADD CONTEXT STEPS (separate flow) ───────────────────────────────────────
const ADD_CONTEXT_STEPS = [
  {
    id: 'add_context_ask',
    phase: 'add_context',
    instruction: `The user wants to ADD MORE CONTEXT or CORRECT something.

Ask them: "Of course! What would you like to add or correct? You can:
- Add context about a specific area (team, product, market, etc.)
- Correct something I got wrong in the diagnosis
- Share additional challenges or constraints

Tell me everything that's relevant."

Be welcoming and open. Do NOT offer the report again yet.
Minimum 3 sentences.`,
    options: [
      { key: 'add_about_team', label: 'More about our team/org structure' },
      { key: 'add_about_market', label: 'More about our market/competition' },
      { key: 'add_about_product', label: 'More about our product/roadmap' },
      { key: 'add_about_challenges', label: 'Additional challenges we face' },
      { key: 'correct_finding', label: 'Correct something in the diagnosis' }
    ],
    saves: [],
    mode: 'mixed'
  },
  {
    id: 'add_context_process',
    phase: 'add_context',
    instruction: `The user just shared additional context. 

1. Acknowledge SPECIFICALLY what they said (quote them)
2. Explain how this changes or enriches your understanding
3. If it changes the diagnosis, explain how
4. Ask: "Is there anything else you'd like to add, or shall I update the diagnosis and generate your report?"

Be thorough. This information matters. Minimum 5 sentences.`,
    options: [
      { key: 'more_to_add', label: 'I have more to add' },
      { key: 'update_and_generate', label: '📥 Update diagnosis and generate report' },
      { key: 'show_updated_diagnosis', label: 'Show me the updated diagnosis first' }
    ],
    saves: [],
    mode: 'mixed'
  },
  {
    id: 'add_context_updated_diagnosis',
    phase: 'add_context',
    instruction: `Present an UPDATED diagnosis incorporating the new context.

1. "Based on the additional context you've shared, here's my updated assessment:"
2. Present updated top 3 problems (adjusted if needed)
3. Highlight what CHANGED from the original diagnosis
4. "Ready to generate the updated Strategic Growth Plan?"

Minimum 6 sentences. Show that the new info actually mattered.`,
    options: [
      { key: 'generate_report', label: '📥 Generate Updated Strategic Growth Plan' },
      { key: 'more_changes', label: 'One more adjustment needed' }
    ],
    saves: ['diagnosedProblems', 'rootCauses'],
    mode: 'buttons'
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

function createSession() {
  return {
    currentStepIndex: 0,
    currentPhase: 'welcome',
    isInAddContext: false,
    addContextStepIndex: 0,
    turnCount: 0,
    
    profile: {
      companyName: '', website: '', industry: '', businessModel: '',
      stage: '', revenue: '', revenueGrowth: '',
      teamSize: '', teamRoles: '', funding: '', founded: '',
      productDescription: '', productStage: '', keyFeatures: '',
      pricingModel: '', pricingRange: '',
      icpTitle: '', icpCompanySize: '', icpIndustry: '', icpPainPoints: '',
      salesMotion: '', channels: '', bestChannel: '',
      avgDealSize: '', salesCycle: '', cac: '', ltv: '',
      salesProcess: '', processDocumented: '',
      whoCloses: '', founderInvolvement: '',
      winRate: '', mainObjections: '', lostDealReasons: '',
      crm: '', churnRate: '', mainBottleneck: '', tools: '',
      diagnosedProblems: [], rootCauses: [], validatedProblems: [],
      userPriority: '', pastAttempts: '', constraints: '',
      additionalContext: ''
    },
    
    scrapedSummary: '',
    conversationLog: [],
    allUserInputs: []
  };
}

function buildFullContext(session) {
  const p = session.profile;
  const lines = [];
  
  lines.push('════════════════════════════════════════════════════');
  lines.push('FULL BUSINESS PROFILE (everything learned so far)');
  lines.push('════════════════════════════════════════════════════');
  
  const sections = {
    'COMPANY': [
      ['Company Name', p.companyName],
      ['Website', p.website],
      ['Industry', p.industry],
      ['Business Model', p.businessModel],
      ['Stage', p.stage],
      ['Revenue', p.revenue],
      ['Growth Rate', p.revenueGrowth],
      ['Team Size', p.teamSize],
      ['Team Roles', p.teamRoles],
      ['Funding', p.funding],
    ],
    'PRODUCT': [
      ['Description', p.productDescription],
      ['Pricing Model', p.pricingModel],
      ['Pricing Range', p.pricingRange],
    ],
    'GO-TO-MARKET': [
      ['ICP (Buyer)', p.icpTitle],
      ['ICP Company Size', p.icpCompanySize],
      ['ICP Industry', p.icpIndustry],
      ['ICP Pain Points', p.icpPainPoints],
      ['Sales Motion', p.salesMotion],
      ['Channels', p.channels],
      ['Best Channel', p.bestChannel],
      ['Avg Deal Size', p.avgDealSize],
      ['Sales Cycle', p.salesCycle],
      ['CAC', p.cac],
      ['LTV', p.ltv],
    ],
    'SALES ENGINE': [
      ['Sales Process', p.salesProcess],
      ['Documented?', p.processDocumented],
      ['Who Closes', p.whoCloses],
      ['Founder Role', p.founderInvolvement],
      ['Win Rate', p.winRate],
      ['Main Bottleneck', p.mainBottleneck],
      ['Lost Deal Reasons', p.lostDealReasons],
      ['Churn Rate', p.churnRate],
      ['CRM/Tools', p.crm || p.tools],
    ],
    'DIAGNOSIS': [
      ['Problems', (p.diagnosedProblems || []).join(' | ')],
      ['Root Causes', (p.rootCauses || []).join(' | ')],
      ['Validated', (p.validatedProblems || []).join(' | ')],
      ['User Priority', p.userPriority],
      ['Past Attempts', p.pastAttempts],
      ['Constraints', p.constraints],
      ['Additional Context', p.additionalContext],
    ]
  };
  
  for (const [section, fields] of Object.entries(sections)) {
    lines.push(`\n── ${section} ──`);
    for (const [label, value] of fields) {
      const v = Array.isArray(value) ? (value.length > 0 ? value.join(', ') : '') : (value || '');
      lines.push(`  ${label}: ${v || '❓ UNKNOWN'}`);
    }
  }
  
  if (session.scrapedSummary) {
    lines.push('\n── SCRAPED DATA ──');
    lines.push(session.scrapedSummary);
  }
  
  if (session.conversationLog.length > 0) {
    lines.push('\n── CONVERSATION HISTORY ──');
    session.conversationLog.forEach((entry, i) => {
      lines.push(`  Turn ${i + 1}: ${entry}`);
    });
  }
  
  lines.push('\n════════════════════════════════════════════════════');
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: SCRAPING
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
    
    const extract = (regex) => (html.match(regex) || [null, ''])[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const extractAll = (regex, limit = 6) =>
      [...html.matchAll(regex)].map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 2 && t.length < 200).slice(0, limit);

    return {
      title: extract(/<title[^>]*>([^<]+)<\/title>/i),
      description: extract(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i) ||
                   extract(/<meta[^>]*content="([^"]*)"[^>]*name="description"/i),
      h1s: extractAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi),
      h2s: extractAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, 8),
      paragraphs: [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
        .filter(t => t.length > 40 && t.length < 500).slice(0, 4),
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

async function scrapeLinkedIn(url, tavilyKey) {
  if (!url || !tavilyKey) return null;
  try {
    const slug = url.match(/linkedin\.com\/company\/([^\/\?]+)/i)?.[1];
    if (!slug) return null;
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: tavilyKey, query: `"${slug}" site:linkedin.com company`, search_depth: "advanced", max_results: 3, include_answer: true })
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      companyName: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      employees: data.answer?.match(/(\d+[\-–]?\d*)\s*(employees?|people)/i)?.[0] || '',
      industry: data.answer?.match(/(?:industry|sector):\s*([^.]+)/i)?.[1]?.trim() || '',
      description: data.answer?.slice(0, 400) || ''
    };
  } catch (e) { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: LLM CALL
// ═══════════════════════════════════════════════════════════════════════════════

async function callLLM(systemPrompt, history, geminiKey) {
  const messages = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I will follow the instructions exactly and output valid JSON.' }] }
  ];
  
  // Add last 14 history entries for context
  const recent = history.slice(-14);
  for (const msg of recent) {
    let content = msg.content;
    if (msg.role === 'assistant') {
      try { content = JSON.parse(content).message || content; } catch {}
    }
    messages.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: content.slice(0, 2000) }]
    });
  }
  
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
          maxOutputTokens: 3000
        }
      })
    }
  );
  
  if (!resp.ok) throw new Error(`Gemini: ${resp.status}`);
  const data = await resp.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response");
  text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(text);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { choice, history = [], contextData, sessionData: inputSession } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!geminiKey) return res.status(200).json({ message: 'API key missing', options: [], session_data: null });

    let session = inputSession || createSession();
    session.turnCount++;
    
    // ─── INITIAL SCRAPE ───────────────────────────────────────────────
    if (choice === 'SNAPSHOT_INIT' && contextData) {
      session.profile.website = contextData.website || '';
      if (contextData.description) session.profile.productDescription = contextData.description;
      
      const websiteData = contextData.website ? await scrapeWebsite(contextData.website) : null;
      const linkedinData = contextData.linkedin ? await scrapeLinkedIn(contextData.linkedin, tavilyKey) : null;
      
      let scraped = '';
      if (contextData.description) scraped += `USER DESCRIPTION: "${contextData.description}"\n`;
      if (websiteData) {
        scraped += `WEBSITE: ${websiteData.title}\n`;
        scraped += `  Meta: ${websiteData.description}\n`;
        scraped += `  H1: ${websiteData.h1s?.join(' | ')}\n`;
        scraped += `  H2: ${websiteData.h2s?.join(' | ')}\n`;
        scraped += `  Content: ${websiteData.paragraphs?.join(' ')}\n`;
        scraped += `  Pricing: ${websiteData.pricing?.join(', ') || 'none found'}\n`;
        scraped += `  Social proof: ${websiteData.socialProof?.join(' | ') || 'none'}\n`;
        if (websiteData.pricing?.length > 0) session.profile.pricingRange = websiteData.pricing.join(', ');
      }
      if (linkedinData) {
        scraped += `LINKEDIN: ${linkedinData.companyName}, ${linkedinData.employees || '?'} employees, ${linkedinData.industry || '?'}\n`;
        if (linkedinData.companyName) session.profile.companyName = linkedinData.companyName;
        if (linkedinData.industry) session.profile.industry = linkedinData.industry;
        if (linkedinData.employees) session.profile.teamSize = linkedinData.employees;
      }
      session.scrapedSummary = scraped;
    }

    // ─── HANDLE "ADD CONTEXT" ─────────────────────────────────────────
    if (choice === 'add_context' || choice === 'adjust_diagnosis' || choice === 'correct_finding' || choice === 'more_changes') {
      session.isInAddContext = true;
      session.addContextStepIndex = 0;
    }
    
    if (choice === 'more_to_add') {
      session.addContextStepIndex = 0; // Reset to ask again
    }
    
    if (choice === 'show_updated_diagnosis') {
      session.addContextStepIndex = 2; // Jump to updated diagnosis
    }
    
    if (choice === 'update_and_generate' || (choice === 'generate_report' && session.isInAddContext)) {
      session.isInAddContext = false;
      // Return generate signal
      return res.status(200).json({
        step_id: 'FINISH',
        message: '📥 Generating your Strategic Growth Plan...',
        mode: 'buttons',
        options: [{ key: 'generate_report', label: '📥 Generating...' }],
        allow_text: false,
        session_data: session,
        current_phase: 'finish',
        turn_count: session.turnCount,
        confidence_state: calculateConfidence(session)
      });
    }

    // ─── STORE USER INPUT ─────────────────────────────────────────────
    if (choice !== 'SNAPSHOT_INIT') {
      session.allUserInputs.push(choice);
      session.conversationLog.push(`User: "${choice.slice(0, 100)}"`);
      
      // Store additional context if in add_context mode
      if (session.isInAddContext && !['add_context', 'adjust_diagnosis', 'correct_finding', 'more_to_add', 'show_updated_diagnosis', 'more_changes'].includes(choice)) {
        session.profile.additionalContext = (session.profile.additionalContext || '') + '\n' + choice;
      }
    }

    // ─── GET CURRENT STEP ─────────────────────────────────────────────
    let currentStep;
    if (session.isInAddContext) {
      currentStep = ADD_CONTEXT_STEPS[Math.min(session.addContextStepIndex, ADD_CONTEXT_STEPS.length - 1)];
      session.addContextStepIndex++;
    } else {
      // Normal flow
      if (choice !== 'SNAPSHOT_INIT' && session.currentStepIndex > 0) {
        // Advance to next step (unless we're at welcome which auto-advances)
        session.currentStepIndex = Math.min(session.currentStepIndex + 1, SCRIPT.length - 1);
      } else if (choice === 'SNAPSHOT_INIT') {
        session.currentStepIndex = 0;
      }
      currentStep = SCRIPT[session.currentStepIndex];
      // Advance step index for next call
      if (choice === 'SNAPSHOT_INIT') {
        session.currentStepIndex = 1; // Next call will be company_model
      }
    }

    session.currentPhase = currentStep.phase;
    
    console.log(`[v7] Step: ${currentStep.id} | Phase: ${currentStep.phase} | Turn: ${session.turnCount}`);

    // ─── BUILD LLM PROMPT ─────────────────────────────────────────────
    const fullContext = buildFullContext(session);
    
    const prompt = `
You are the Revenue Architect, a senior B2B revenue strategist.

LANGUAGE RULE: Respond in the SAME language the user uses. If they write in Italian, respond entirely in Italian. If English, respond in English.

${fullContext}

════════════════════════════════════════════════════
CURRENT STEP: ${currentStep.id}
PHASE: ${currentStep.phase}
════════════════════════════════════════════════════

YOUR INSTRUCTION FOR THIS TURN:
${currentStep.instruction}

USER'S LAST INPUT: "${choice}"

OUTPUT FORMAT (strict JSON):
{
  "message": "Your response in markdown. MINIMUM 4 sentences. Include examples and benchmarks.",
  "profile_updates": { "fieldName": "value learned from user's input" }
}

RULES:
1. Output ONLY the JSON object above
2. In "message": follow the instruction EXACTLY
3. In "profile_updates": extract ANY new info from the user's input and map to profile fields
4. Be SPECIFIC — use actual numbers, names, data
5. NEVER say "interesting" or "great question" — add value instead
6. Include at least one benchmark, example, or reference per response
7. The message MUST be at least 4 sentences long
`;

    // ─── CALL LLM ────────────────────────────────────────────────────
    let llmResponse;
    try {
      llmResponse = await callLLM(prompt, history, geminiKey);
    } catch (e) {
      console.error(`[v7] LLM error: ${e.message}`);
      llmResponse = {
        message: "Let me continue our analysis. Could you tell me more about your current situation?",
        profile_updates: {}
      };
    }

    // ─── UPDATE PROFILE ───────────────────────────────────────────────
    if (llmResponse.profile_updates) {
      for (const [key, value] of Object.entries(llmResponse.profile_updates)) {
        if (value && session.profile.hasOwnProperty(key)) {
          if (Array.isArray(session.profile[key])) {
            const newItems = Array.isArray(value) ? value : [value];
            session.profile[key] = [...new Set([...session.profile[key], ...newItems])];
          } else if (typeof value === 'string' && value.trim()) {
            session.profile[key] = value;
          }
        }
      }
    }
    
    // Log what the AI said
    session.conversationLog.push(`AI (${currentStep.id}): Asked about ${currentStep.phase}`);

    // ─── BUILD RESPONSE ───────────────────────────────────────────────
    const confidence = calculateConfidence(session);
    
    const response = {
      step_id: currentStep.id,
      message: llmResponse.message || "Let's continue our analysis.",
      mode: currentStep.mode || 'mixed',
      options: currentStep.options,
      allow_text: currentStep.mode !== 'buttons',
      session_data: session,
      current_phase: currentStep.phase,
      turn_count: session.turnCount,
      confidence_state: confidence
    };
    
    return res.status(200).json(response);

  } catch (error) {
    console.error('[v7 FATAL]', error);
    return res.status(200).json({
      step_id: 'error',
      message: "Something went wrong. Let's continue — what's your biggest revenue challenge right now?",
      mode: 'mixed',
      options: [
        { key: 'lead_gen', label: 'Not enough qualified leads' },
        { key: 'conversion', label: 'Leads don\'t convert to customers' },
        { key: 'scaling', label: 'Can\'t scale beyond founder-led sales' },
        { key: 'churn', label: 'Customer churn is too high' }
      ],
      allow_text: true,
      session_data: null
    });
  }
}

function calculateConfidence(session) {
  const p = session.profile;
  let filled = 0;
  const important = ['companyName','businessModel','stage','revenue','teamSize','icpTitle','salesMotion','channels','salesProcess','whoCloses','mainBottleneck','diagnosedProblems'];
  
  for (const key of important) {
    const v = p[key];
    if (Array.isArray(v) ? v.length > 0 : (v && v !== '')) filled++;
  }
  
  const total = Math.round((filled / important.length) * 100);
  
  return {
    total,
    company: ['companyName','businessModel','stage','revenue','teamSize','funding'].filter(k => p[k] && p[k] !== '').length * 4,
    gtm: ['icpTitle','salesMotion','channels','avgDealSize'].filter(k => p[k] && p[k] !== '').length * 6,
    diagnosis: (['mainBottleneck'].filter(k => p[k] && p[k] !== '').length + (p.diagnosedProblems?.length > 0 ? 1 : 0) + (p.validatedProblems?.length > 0 ? 1 : 0)) * 10,
    solution: p.validatedProblems?.length > 0 ? 15 : 0
  };
}
