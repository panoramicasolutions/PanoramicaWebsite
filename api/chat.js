// ═══════════════════════════════════════════════════════════════════════════════
// REVENUE ARCHITECT - MULTI-AGENT ARCHITECTURE v4.0
// Complete Backend with Orchestrator + Specialized Agents
// Single file deployment - Copy and paste ready
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const AGENT_TYPES = {
  CONTEXT: 'context',
  COMPANY: 'company',
  GTM: 'gtm',
  SALES: 'sales',
  OPERATIONS: 'operations',
  DIAGNOSIS: 'diagnosis',
  REPORT: 'report'
};

const CONVERSATION_STATES = {
  INIT: 'init',
  CONTEXT_GATHERING: 'context_gathering',
  DISCOVERY_COMPANY: 'discovery_company',
  DISCOVERY_GTM: 'discovery_gtm',
  DISCOVERY_SALES: 'discovery_sales',
  DIAGNOSIS: 'diagnosis',
  PRE_FINISH: 'pre_finish',
  REPORT_GENERATION: 'report_generation'
};

const CONFIDENCE_THRESHOLDS = {
  MIN_FOR_REPORT: 70,
  MIN_TURNS: 8,
  MIN_DIAGNOSIS_SCORE: 20
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: AGENT PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const AGENT_PROMPTS = {
  // ─────────────────────────────────────────────────────────────────────────────
  // ORCHESTRATOR SYSTEM PROMPT
  // ─────────────────────────────────────────────────────────────────────────────
  orchestrator: `
You are the Orchestrator of the Revenue Architect system. Your role is to:
1. Analyze the current state of the conversation
2. Determine which specialized agent should handle the next interaction
3. Ensure smooth transitions between agents
4. Maintain conversation coherence

You DO NOT interact directly with users. You only make routing decisions.
`,

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTEXT AGENT - Initial Analysis & Corrections
  // ─────────────────────────────────────────────────────────────────────────────
  context: `
═══════════════════════════════════════════════════════════════════════════════
CONTEXT AGENT - Revenue Architect System
═══════════════════════════════════════════════════════════════════════════════

You are the CONTEXT AGENT, responsible for initial business analysis and context corrections.

YOUR RESPONSIBILITIES:
1. Analyze scraped website data, LinkedIn data, and user descriptions
2. Create a comprehensive first impression of the business
3. Make SPECIFIC, BOLD assumptions that can be corrected
4. Handle corrections when users say the context was wrong

PERSONALITY:
- Confident but open to correction
- Specific - always cite data points
- Professional yet warm
- Direct - no fluff

LANGUAGE RULE:
Always respond in the SAME language the user writes in.

OUTPUT FORMAT (JSON):
{
  "message": "Your detailed welcome message...",
  "extracted_data": {
    "company_name": "",
    "likely_stage": "",
    "likely_icp": "",
    "likely_revenue_range": "",
    "key_observations": []
  },
  "assumptions": [
    "Assumption 1 with evidence",
    "Assumption 2 with evidence"
  ],
  "confidence_scores": {
    "stage": 0-10,
    "revenue": 0-8,
    "team": 0-7
  }
}

WELCOME MESSAGE STRUCTURE:
1. Greeting with company name
2. What you found on their website (specific quotes/data)
3. What LinkedIn tells you (if available)
4. 3-4 bold assumptions with reasoning
5. Confirmation request

EXAMPLE:
"**Welcome to Revenue Architect.**

I've analyzed **[Company]** and here's what I found:

**From your website:**
- Your main value prop: '[exact H1 text]'
- You offer: [services from H2s]
- Pricing signals: [X/mo] suggests [model assumption]
- Social proof: '[exact quote]' indicates [traction level]

**From LinkedIn:**
- Team size: ~[X] employees
- Industry: [industry]

**My assumptions:**
1. You're likely at [stage] because [evidence]
2. Your ICP appears to be [target] since [evidence]
3. Sales motion is probably [type] given [evidence]
4. Main challenge might be [challenge] based on [evidence]

Did I get this right, or should I recalibrate?"
`,

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPANY DISCOVERY AGENT
  // ─────────────────────────────────────────────────────────────────────────────
  company: `
═══════════════════════════════════════════════════════════════════════════════
COMPANY DISCOVERY AGENT - Revenue Architect System
═══════════════════════════════════════════════════════════════════════════════

You are the COMPANY DISCOVERY AGENT, focused on understanding company fundamentals.

YOUR FOCUS AREAS:
1. Company stage (pre-revenue, $0-100K, $100K-500K, $500K-1M, $1M+)
2. Revenue details (MRR/ARR, growth rate, trajectory)
3. Team composition (size, roles, founder involvement)
4. Business model (SaaS, services, hybrid)
5. Funding status (bootstrapped, seed, Series A+)

DISCOVERY TECHNIQUES:
- Ask ONE question at a time
- Use real-world comparisons: "Companies at your stage typically..."
- Provide context for why you're asking
- Offer specific options, not vague ones

REAL-WORLD EXAMPLES TO USE:
- "At $300K ARR with 4 people, you're in what I call the 'Founder Capacity Crunch'"
- "Most B2B SaaS at your stage have 60-70% gross margins. Where do you land?"
- "The jump from $500K to $1M is usually about systems, not just more sales"

OUTPUT FORMAT (JSON):
{
  "message": "Your response with real-world example...",
  "question_focus": "stage|revenue|team|model|funding",
  "options": [
    {"key": "option_key", "label": "Specific option text"}
  ],
  "data_extracted": {
    "field": "value learned"
  },
  "confidence_update": {
    "stage": 0-10,
    "revenue": 0-8,
    "team": 0-7
  },
  "context_note": "What was learned this turn"
}

NEVER ASK:
- Generic questions like "Tell me more"
- Multiple questions in one message
- Questions already answered in context
`,

  // ─────────────────────────────────────────────────────────────────────────────
  // GTM DISCOVERY AGENT
  // ─────────────────────────────────────────────────────────────────────────────
  gtm: `
═══════════════════════════════════════════════════════════════════════════════
GTM (GO-TO-MARKET) DISCOVERY AGENT - Revenue Architect System
═══════════════════════════════════════════════════════════════════════════════

You are the GTM DISCOVERY AGENT, focused on understanding how the company acquires customers.

YOUR FOCUS AREAS:
1. ICP (Ideal Customer Profile)
   - Job titles that buy
   - Company size/type
   - Specific pain points
   - Budget authority

2. Sales Motion
   - Inbound vs Outbound vs PLG
   - Self-serve vs Sales-assisted vs Enterprise
   - Average deal size
   - Sales cycle length

3. Channels
   - Primary acquisition channels
   - What's working vs not working
   - Cost per acquisition
   - Channel mix

4. Positioning
   - Painkiller vs Vitamin
   - Competitive differentiation
   - Pricing model

REAL-WORLD EXAMPLES TO USE:
- "Basecamp is a classic 'Painkiller' - they sell 'get organized' to teams drowning in chaos"
- "At $5K ACV with 30-day cycles, you're in the sweet spot for inside sales"
- "If LinkedIn outbound is your main channel, you're probably seeing 2-5% reply rates"
- "Product-led companies typically need 1000+ signups to get 10 paying customers"

OUTPUT FORMAT (JSON):
{
  "message": "Your response with GTM insight...",
  "question_focus": "icp|motion|channels|positioning",
  "options": [
    {"key": "option_key", "label": "Specific option text"}
  ],
  "data_extracted": {
    "icp_title": "",
    "sales_motion": "",
    "primary_channel": ""
  },
  "confidence_update": {
    "motion": 0-10,
    "icp": 0-8,
    "channels": 0-7
  },
  "context_note": "What was learned this turn"
}

DISCOVERY PATTERNS:
- If they say "we sell to everyone" → dig deeper, that's a red flag
- If sales cycle > 90 days → explore if ICP is right
- If CAC > 1/3 of first year value → flag unit economics concern
`,

  // ─────────────────────────────────────────────────────────────────────────────
  // SALES DISCOVERY AGENT
  // ─────────────────────────────────────────────────────────────────────────────
  sales: `
═══════════════════════════════════════════════════════════════════════════════
SALES DISCOVERY AGENT - Revenue Architect System
═══════════════════════════════════════════════════════════════════════════════

You are the SALES DISCOVERY AGENT, focused on understanding the sales engine.

YOUR FOCUS AREAS:
1. Sales Process
   - Current sales stages
   - Qualification criteria
   - Handoff points
   - Documentation level

2. Team & Roles
   - Who sells (founder, AEs, SDRs)
   - Win rates by person
   - Capacity utilization
   - Training/enablement

3. Bottlenecks
   - Where deals stall
   - Common objections
   - Lost deal reasons
   - Founder dependency

4. Metrics
   - Pipeline coverage
   - Win rate
   - Average deal size
   - Time to close

REAL-WORLD EXAMPLES TO USE:
- "The 'Founder-Led Sales Trap' killed a client's growth for 18 months. Founder closed at 40%, reps at 8%"
- "I worked with a $400K ARR SaaS - founder closed 90% because reps couldn't articulate technical value"
- "Most B2B sales teams need 3x pipeline coverage. Under 2x and you're always scrambling"
- "If your best rep does 3x your worst rep, you have a process problem, not a people problem"

OUTPUT FORMAT (JSON):
{
  "message": "Your response with sales insight...",
  "question_focus": "process|team|bottlenecks|metrics",
  "options": [
    {"key": "option_key", "label": "Specific option text"}
  ],
  "data_extracted": {
    "sales_process": "",
    "founder_involvement": "",
    "main_bottleneck": ""
  },
  "confidence_update": {
    "pain_point": 0-12,
    "root_cause": 0-10,
    "factors": 0-8
  },
  "context_note": "What was learned this turn"
}

RED FLAGS TO PROBE:
- Founder closes >70% of deals → scalability issue
- No documented process → tribal knowledge risk
- "We don't track win rate" → flying blind
- "Sales cycle varies a lot" → ICP or qualification issue
`,

  // ─────────────────────────────────────────────────────────────────────────────
  // DIAGNOSIS AGENT
  // ─────────────────────────────────────────────────────────────────────────────
  diagnosis: `
═══════════════════════════════════════════════════════════════════════════════
DIAGNOSIS AGENT - Revenue Architect System
═══════════════════════════════════════════════════════════════════════════════

You are the DIAGNOSIS AGENT, responsible for synthesizing insights and identifying root causes.

YOUR RESPONSIBILITIES:
1. Pattern Recognition
   - Match symptoms to known revenue problems
   - Identify compound issues
   - Spot hidden connections

2. Root Cause Analysis
   - Go beyond symptoms to causes
   - Distinguish correlation from causation
   - Prioritize by impact

3. Hypothesis Validation
   - Test assumptions with user
   - Confirm or reject diagnoses
   - Refine understanding

4. Priority Setting
   - Rank problems by revenue impact
   - Identify quick wins vs long-term fixes
   - Create logical sequence

COMMON REVENUE PATTERNS:
1. **Founder-Led Sales Trap**: Revenue capped by founder's time
2. **ICP Drift**: Taking any customer, diluting focus
3. **Leaky Bucket**: Acquiring but churning
4. **Pricing Confusion**: Leaving money on table or losing deals
5. **Channel Dependency**: Over-reliance on one source
6. **Manual Hell**: Drowning in operational tasks
7. **Metrics Blindness**: Flying without instruments

DIAGNOSIS FRAMEWORK:
For each problem identified:
- What's the symptom? (what user feels)
- What's the cause? (why it happens)
- What's the impact? (revenue cost)
- What's the fix? (high-level solution)

OUTPUT FORMAT (JSON):
{
  "message": "Your diagnosis with validation questions...",
  "diagnosed_problems": [
    {
      "name": "Problem Name",
      "symptom": "What they're experiencing",
      "root_cause": "Why it's happening",
      "impact": "Revenue impact estimate",
      "priority": "critical|high|medium|low"
    }
  ],
  "hypothesis": "Your main hypothesis to validate",
  "validation_question": "Question to confirm/reject hypothesis",
  "options": [
    {"key": "option_key", "label": "Specific option text"}
  ],
  "confidence_update": {
    "pain_point": 0-12,
    "root_cause": 0-10,
    "factors": 0-8
  },
  "context_note": "Diagnosis summary"
}

VALIDATION TECHNIQUE:
- State your hypothesis clearly
- Ask user if it resonates
- Listen for "yes, but..." (indicates partial match)
- Be willing to pivot if wrong
`,

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORT AGENT
  // ─────────────────────────────────────────────────────────────────────────────
  report: `
═══════════════════════════════════════════════════════════════════════════════
REPORT AGENT - Revenue Architect System
═══════════════════════════════════════════════════════════════════════════════

You are the REPORT AGENT, responsible for generating the final strategic report.

YOUR RESPONSIBILITIES:
1. Synthesize all session data into coherent narrative
2. Prioritize recommendations by impact
3. Create actionable 90-day roadmap
4. Provide specific, measurable next steps

REPORT STRUCTURE:
1. Executive Summary (2-3 sentences)
2. Company Snapshot
3. Current State Assessment
4. Diagnosed Problems (prioritized)
5. Strategic Recommendations
6. 90-Day Action Plan
7. Key Metrics to Track

OUTPUT FORMAT (JSON):
{
  "message": "Pre-report summary for user confirmation...",
  "report_data": {
    "executive_summary": "",
    "company_snapshot": {},
    "problems": [],
    "recommendations": [],
    "action_plan": {
      "days_1_30": [],
      "days_31_60": [],
      "days_61_90": []
    },
    "metrics": []
  },
  "ready_for_generation": true
}
`
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(emoji, message, data = null) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] ${emoji} ${message}`, data || '');
}

function analyzeWebsiteHTML(html) {
  const analysis = {
    title: '',
    description: '',
    h1: [],
    h2: [],
    paragraphs: [],
    pricing_signals: [],
    social_proof: [],
    technologies: []
  };

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) analysis.title = titleMatch[1].trim();

  // Meta Description
  const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || 
                    html.match(/<meta\s+content="([^"]*)"\s+name="description"/i);
  if (metaMatch) analysis.description = metaMatch[1].trim();

  // H1s
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  analysis.h1 = h1Matches
    .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .filter(t => t.length > 0 && t.length < 200);

  // H2s
  const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  analysis.h2 = h2Matches
    .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .filter(t => t.length > 0 && t.length < 150)
    .slice(0, 8);

  // Key paragraphs
  const pMatches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  analysis.paragraphs = pMatches
    .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .filter(t => t.length > 50 && t.length < 500)
    .slice(0, 5);

  // Pricing signals
  const pricingMatches = html.match(/(\$|€|£)\s*\d+[,.]?\d*/g) || [];
  analysis.pricing_signals = [...new Set(pricingMatches)].slice(0, 5);

  // Social proof
  const socialPatterns = [
    /(\d+[,.]?\d*[kK]?\+?)\s*(customers?|users?|companies|businesses|clients)/gi,
    /trusted by\s+([^<]+)/gi,
    /used by\s+([^<]+)/gi
  ];
  socialPatterns.forEach(pattern => {
    const matches = html.match(pattern);
    if (matches) analysis.social_proof.push(...matches.slice(0, 3));
  });

  // Tech stack
  const techPatterns = {
    'React/Next.js': /__react|react-dom|_next|nextjs/i,
    'Vue.js': /vue\.js|vuejs|__vue/i,
    'Shopify': /shopify|myshopify/i,
    'WordPress': /wordpress|wp-content/i,
    'HubSpot': /hubspot|hs-scripts/i,
    'Salesforce': /salesforce|pardot/i,
    'Intercom': /intercom/i,
    'Stripe': /stripe/i,
    'Google Analytics': /google-analytics|gtag|UA-\d+/i
  };
  
  Object.entries(techPatterns).forEach(([name, pattern]) => {
    if (pattern.test(html)) analysis.technologies.push(name);
  });
  
  return analysis;
}

async function scrapeWebsite(url) {
  log('🌐', `Scraping website: ${url}`);
  
  try {
    const targetUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(targetUrl.href, {
      method: 'GET',
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const html = await response.text();
    const analysis = analyzeWebsiteHTML(html);
    
    log('✅', `Website scraped. Title: ${analysis.title}`);
    return analysis;
    
  } catch (error) {
    log('⚠️', `Website scraping failed: ${error.message}`);
    return null;
  }
}

async function scrapeLinkedIn(linkedinUrl, tavilyKey) {
  if (!linkedinUrl || !tavilyKey) return null;
  
  log('👔', `Scraping LinkedIn: ${linkedinUrl}`);
  
  try {
    const urlMatch = linkedinUrl.match(/linkedin\.com\/company\/([^\/\?]+)/i);
    if (!urlMatch) return null;
    
    const companySlug = urlMatch[1];
    
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: `"${companySlug}" site:linkedin.com company employees`,
        search_depth: "advanced",
        max_results: 5,
        include_answer: true
      })
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    const linkedinData = {
      company_name: companySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: data.answer?.slice(0, 500) || '',
      employee_count: '',
      industry: ''
    };
    
    // Extract employee count
    const empMatch = data.answer?.match(/(\d+[\-–]\d+|\d+[,.]?\d*[kK]?\+?)\s*(employees?|people|staff)/i);
    if (empMatch) linkedinData.employee_count = empMatch[0];
    
    // Extract industry
    const indMatch = data.answer?.match(/(?:industry|sector):\s*([^.]+)/i);
    if (indMatch) linkedinData.industry = indMatch[1].trim();
    
    log('✅', `LinkedIn data extracted: ${linkedinData.employee_count || 'unknown size'}`);
    return linkedinData;
    
  } catch (error) {
    log('⚠️', `LinkedIn scraping failed: ${error.message}`);
    return null;
  }
}

async function searchExternal(website, tavilyKey) {
  if (!tavilyKey) return null;
  
  try {
    const hostname = new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace('www.', '');
    
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: `"${hostname}" company revenue customers`,
        search_depth: "advanced",
        max_results: 3,
        include_answer: true
      })
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      answer: data.answer,
      sources: data.results?.map(r => ({ title: r.title, content: r.content?.slice(0, 200) }))
    };
    
  } catch (error) {
    log('⚠️', `External search failed: ${error.message}`);
    return null;
  }
}

function getLowestScoringPillar(confidence) {
  const pillars = [
    { name: 'Company Context', key: 'pillar1_company', score: confidence.pillar1_company.score, max: 25 },
    { name: 'Go-to-Market', key: 'pillar2_gtm', score: confidence.pillar2_gtm.score, max: 25 },
    { name: 'Diagnosis', key: 'pillar3_diagnosis', score: confidence.pillar3_diagnosis.score, max: 30 },
    { name: 'Solution', key: 'pillar4_solution', score: confidence.pillar4_solution.score, max: 20 }
  ];
  
  const withPercentage = pillars.map(p => ({
    ...p,
    percentage: (p.score / p.max) * 100
  }));
  
  withPercentage.sort((a, b) => a.percentage - b.percentage);
  return withPercentage[0];
}

function extractPreviousOptions(history) {
  const options = [];
  const assistantMessages = history.filter(h => h.role === 'assistant').slice(-3);
  
  for (const msg of assistantMessages) {
    try {
      const parsed = JSON.parse(msg.content);
      if (parsed.options?.length > 0) {
        options.push(...parsed.options.map(o => o.label));
      }
    } catch {}
  }
  
  return options;
}

function buildContextInjection(scrapedData, contextData, sessionData) {
  let injection = `
═══════════════════════════════════════════════════════════════════════════════
BUSINESS INTELLIGENCE DATA
═══════════════════════════════════════════════════════════════════════════════

`;

  // User Description (highest priority)
  if (contextData?.description) {
    injection += `🚨 USER DESCRIPTION (PRIMARY SOURCE):
"${contextData.description}"

`;
  }

  // Website Data
  if (scrapedData?.website) {
    const w = scrapedData.website;
    injection += `📊 WEBSITE ANALYSIS:
- URL: ${contextData?.website || 'N/A'}
- Title: ${w.title || 'Not found'}
- Description: ${w.description || 'Not found'}

VALUE PROPOSITIONS (H1):
${w.h1?.length > 0 ? w.h1.map(h => `  • "${h}"`).join('\n') : '  • None found'}

FEATURES/SERVICES (H2):
${w.h2?.length > 0 ? w.h2.map(h => `  • "${h}"`).join('\n') : '  • None found'}

KEY CONTENT:
${w.paragraphs?.length > 0 ? w.paragraphs.map(p => `  • "${p.slice(0, 150)}..."`).join('\n') : '  • None extracted'}

PRICING SIGNALS: ${w.pricing_signals?.length > 0 ? w.pricing_signals.join(', ') : 'None found'}
SOCIAL PROOF: ${w.social_proof?.length > 0 ? w.social_proof.join(' | ') : 'None found'}

`;
  }

  // LinkedIn Data
  if (scrapedData?.linkedin) {
    const l = scrapedData.linkedin;
    injection += `👔 LINKEDIN DATA:
- Company: ${l.company_name || 'Unknown'}
- Employees: ${l.employee_count || 'Unknown'}
- Industry: ${l.industry || 'Unknown'}
- Description: ${l.description || 'Not available'}

`;
  }

  // External Search
  if (scrapedData?.external?.answer) {
    injection += `🔍 EXTERNAL INTELLIGENCE:
${scrapedData.external.answer}

`;
  }

  // Session Memory
  if (sessionData?.memory?.keyInsights?.length > 0) {
    injection += `📝 CONFIRMED INSIGHTS FROM CONVERSATION:
${sessionData.memory.keyInsights.map(i => `  • ${i}`).join('\n')}

`;
  }

  if (sessionData?.memory?.confirmedFacts?.length > 0) {
    injection += `✅ CONFIRMED FACTS:
${sessionData.memory.confirmedFacts.map(f => `  • ${f}`).join('\n')}

`;
  }

  return injection;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: AGENT CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

class BaseAgent {
  constructor(name, prompt) {
    this.name = name;
    this.prompt = prompt;
  }

  async callLLM(messages, geminiKey, options = {}) {
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
            maxOutputTokens: options.maxTokens || 2048
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`LLM API Error: ${response.status}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error("Empty LLM response");
    }
    
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(text);
  }

  buildMessages(systemPrompt, contextInjection, history, userMessage) {
    const messages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: `Understood. I am the ${this.name}. I will follow my instructions precisely.` }] }
    ];

    // Add context
    if (contextInjection) {
      messages.push({ role: 'user', parts: [{ text: `[CONTEXT DATA]\n${contextInjection}` }] });
      messages.push({ role: 'model', parts: [{ text: 'Context received. Ready to proceed.' }] });
    }

    // Add conversation history (last 10 turns)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      let content = msg.content;
      if (msg.role === 'assistant') {
        try {
          const parsed = JSON.parse(content);
          content = parsed.message || content;
        } catch {}
      }
      messages.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: content }]
      });
    }

    // Add current user message
    messages.push({ role: 'user', parts: [{ text: userMessage }] });

    return messages;
  }
}

class ContextAgent extends BaseAgent {
  constructor() {
    super('ContextAgent', AGENT_PROMPTS.context);
  }

  async execute(input, context) {
    const { choice, contextData, history } = input;
    const { action, geminiKey, tavilyKey, sessionData } = context;

    if (action === 'scrape_and_analyze') {
      return await this.scrapeAndAnalyze(contextData, history, geminiKey, tavilyKey);
    } else if (action === 'correction') {
      return await this.handleCorrection(choice, history, geminiKey, sessionData);
    }

    return this.getErrorResponse();
  }

  async scrapeAndAnalyze(contextData, history, geminiKey, tavilyKey) {
    // Scrape all data sources
    const scrapedData = {
      website: contextData?.website ? await scrapeWebsite(contextData.website) : null,
      linkedin: contextData?.linkedin ? await scrapeLinkedIn(contextData.linkedin, tavilyKey) : null,
      external: contextData?.website ? await searchExternal(contextData.website, tavilyKey) : null
    };

    const contextInjection = buildContextInjection(scrapedData, contextData, null);

    const userMessage = `
[TASK: Generate Welcome Message]

Analyze all the business intelligence data above and create a personalized welcome message.

Requirements:
1. Reference SPECIFIC data points from the scraping (exact quotes)
2. Make 3-4 BOLD assumptions with evidence
3. If user provided description, treat it as primary source
4. End with confirmation: "Did I get this right?"
5. Respond in the same language as user's description

Output JSON with:
- message: The complete welcome message
- extracted_data: Key data points extracted
- assumptions: Array of assumptions made
- confidence_scores: Initial confidence estimates
`;

    const messages = this.buildMessages(this.prompt, contextInjection, history, userMessage);
    
    try {
      const llmResponse = await this.callLLM(messages, geminiKey);
      
      return {
        step_id: 'welcome',
        message: llmResponse.message,
        mode: 'mixed',
        options: [
          { key: 'confirm_correct', label: 'Yes, that\'s pretty accurate' },
          { key: 'partially_correct', label: 'Close, but let me clarify a few things' },
          { key: 'mostly_wrong', label: 'Actually, the situation is quite different' }
        ],
        allow_text: true,
        dataUpdates: {
          scrapedData: scrapedData,
          company: llmResponse.extracted_data || {}
        },
        confidenceUpdate: {
          pillar1_company: llmResponse.confidence_scores || { stage: 5, revenue: 3, team: 3 }
        },
        contextNote: `Initial analysis complete. Assumptions: ${llmResponse.assumptions?.length || 0}`
      };

    } catch (error) {
      log('❌', `ContextAgent LLM error: ${error.message}`);
      return this.getErrorResponse();
    }
  }

  async handleCorrection(choice, history, geminiKey, sessionData) {
    const contextInjection = buildContextInjection(sessionData?.scrapedData, null, sessionData);

    const userMessage = `
[TASK: Handle Context Correction]

User indicated the initial context was wrong or incomplete.
User input: "${choice}"

Requirements:
1. Acknowledge the misunderstanding
2. Ask SPECIFIC questions to clarify
3. Do NOT proceed to diagnosis
4. Reset confidence if needed

Output JSON with:
- message: Your response asking for clarification
- options: Specific options for user to explain
- confidence_reset: Which scores to reset
`;

    const messages = this.buildMessages(this.prompt, contextInjection, history, userMessage);

    try {
      const llmResponse = await this.callLLM(messages, geminiKey);

      return {
        step_id: 'context_correction',
        message: llmResponse.message,
        mode: 'mixed',
        options: llmResponse.options || [
          { key: 'explain_business', label: 'Let me explain what we actually do' },
          { key: 'explain_customers', label: 'I\'ll clarify who our customers are' },
          { key: 'explain_challenge', label: 'The main challenge is different' }
        ],
        allow_text: true,
        confidenceUpdate: {
          pillar1_company: { stage: 0, revenue: 0, team: 0 }
        },
        forceState: CONVERSATION_STATES.CONTEXT_GATHERING,
        contextNote: 'User requested context correction - resetting assumptions'
      };

    } catch (error) {
      return this.getErrorResponse();
    }
  }

  getErrorResponse() {
    return {
      step_id: 'welcome',
      message: "I'd love to learn about your business. Can you tell me what your company does and who your primary customers are?",
      mode: 'mixed',
      options: [
        { key: 'explain_business', label: 'Let me explain our business' },
        { key: 'share_website', label: 'Check out our website' }
      ],
      allow_text: true
    };
  }
}

class CompanyDiscoveryAgent extends BaseAgent {
  constructor() {
    super('CompanyDiscoveryAgent', AGENT_PROMPTS.company);
  }

  async execute(input, context) {
    const { choice, history } = input;
    const { geminiKey, sessionData, turnCount } = context;

    const contextInjection = buildContextInjection(sessionData?.scrapedData, null, sessionData);
    const previousOptions = extractPreviousOptions(history);

    const userMessage = `
[TASK: Company Discovery]

User input: "${choice}"
Turn count: ${turnCount}
Current company confidence: ${sessionData?.confidence?.pillar1_company?.score || 0}/25

${previousOptions.length > 0 ? `Previous options shown: [${previousOptions.join('] [')}]` : ''}

Focus areas still needed:
- Stage: ${sessionData?.confidence?.pillar1_company?.items?.stage < 8 ? 'NEED MORE' : 'OK'}
- Revenue: ${sessionData?.confidence?.pillar1_company?.items?.revenue < 6 ? 'NEED MORE' : 'OK'}
- Team: ${sessionData?.confidence?.pillar1_company?.items?.team < 5 ? 'NEED MORE' : 'OK'}

Requirements:
1. Acknowledge user's input specifically
2. Provide insight with REAL-WORLD EXAMPLE
3. Ask ONE targeted question about the lowest area
4. Provide 4-5 specific button options

If user says "all of the above" or similar, acknowledge each option.

Output JSON with message, question_focus, options, data_extracted, confidence_update, context_note
`;

    const messages = this.buildMessages(this.prompt, contextInjection, history, userMessage);

    try {
      const llmResponse = await this.callLLM(messages, geminiKey);

      return {
        step_id: 'discovery',
        message: llmResponse.message,
        mode: 'mixed',
        options: this.validateOptions(llmResponse.options),
        allow_text: true,
        dataUpdates: {
          company: llmResponse.data_extracted || {},
          memory: {
            keyInsights: llmResponse.context_note ? [llmResponse.context_note] : []
          }
        },
        confidenceUpdate: {
          pillar1_company: llmResponse.confidence_update || {}
        },
        contextNote: llmResponse.context_note || 'Company discovery continued'
      };

    } catch (error) {
      log('❌', `CompanyAgent error: ${error.message}`);
      return this.getDefaultResponse();
    }
  }

  validateOptions(options) {
    if (!options || options.length < 3) {
      return [
        { key: 'early_stage', label: 'We\'re pre-revenue or under $100K ARR' },
        { key: 'growth_stage', label: 'We\'re between $100K-$1M ARR' },
        { key: 'scaling_stage', label: 'We\'re above $1M ARR' },
        { key: 'rather_not_say', label: 'I\'d prefer to discuss something else' }
      ];
    }
    return options.slice(0, 5);
  }

  getDefaultResponse() {
    return {
      step_id: 'discovery',
      message: "Let me understand your company better. What stage would you say you're at in terms of revenue?",
      mode: 'mixed',
      options: this.validateOptions(null),
      allow_text: true
    };
  }
}

class GTMDiscoveryAgent extends BaseAgent {
  constructor() {
    super('GTMDiscoveryAgent', AGENT_PROMPTS.gtm);
  }

  async execute(input, context) {
    const { choice, history } = input;
    const { geminiKey, sessionData, turnCount } = context;

    const contextInjection = buildContextInjection(sessionData?.scrapedData, null, sessionData);
    const previousOptions = extractPreviousOptions(history);

    const userMessage = `
[TASK: GTM Discovery]

User input: "${choice}"
Turn count: ${turnCount}
Current GTM confidence: ${sessionData?.confidence?.pillar2_gtm?.score || 0}/25

${previousOptions.length > 0 ? `Previous options shown: [${previousOptions.join('] [')}]` : ''}

Known company context:
- Stage: ${sessionData?.company?.stage || 'Unknown'}
- Revenue: ${sessionData?.company?.revenue || 'Unknown'}

Focus areas still needed:
- Sales Motion: ${sessionData?.confidence?.pillar2_gtm?.items?.motion < 8 ? 'NEED MORE' : 'OK'}
- ICP: ${sessionData?.confidence?.pillar2_gtm?.items?.icp < 6 ? 'NEED MORE' : 'OK'}
- Channels: ${sessionData?.confidence?.pillar2_gtm?.items?.channels < 5 ? 'NEED MORE' : 'OK'}

Requirements:
1. Acknowledge user's input with insight
2. Include GTM-specific real-world example
3. Ask ONE question about lowest scoring area
4. Provide 4-5 specific options

Output JSON with message, question_focus, options, data_extracted, confidence_update, context_note
`;

    const messages = this.buildMessages(this.prompt, contextInjection, history, userMessage);

    try {
      const llmResponse = await this.callLLM(messages, geminiKey);

      return {
        step_id: 'discovery',
        message: llmResponse.message,
        mode: 'mixed',
        options: this.validateOptions(llmResponse.options),
        allow_text: true,
        dataUpdates: {
          gtm: llmResponse.data_extracted || {},
          memory: {
            keyInsights: llmResponse.context_note ? [llmResponse.context_note] : []
          }
        },
        confidenceUpdate: {
          pillar2_gtm: llmResponse.confidence_update || {}
        },
        contextNote: llmResponse.context_note || 'GTM discovery continued'
      };

    } catch (error) {
      log('❌', `GTMAgent error: ${error.message}`);
      return this.getDefaultResponse();
    }
  }

  validateOptions(options) {
    if (!options || options.length < 3) {
      return [
        { key: 'inbound_focus', label: 'Mostly inbound (content, SEO, referrals)' },
        { key: 'outbound_focus', label: 'Mostly outbound (cold email, LinkedIn, calls)' },
        { key: 'plg_focus', label: 'Product-led (free trial, freemium)' },
        { key: 'mixed_channels', label: 'Mix of several channels' },
        { key: 'still_figuring', label: 'Still figuring out what works' }
      ];
    }
    return options.slice(0, 5);
  }

  getDefaultResponse() {
    return {
      step_id: 'discovery',
      message: "Let's talk about how you acquire customers. What's your primary channel for finding new business?",
      mode: 'mixed',
      options: this.validateOptions(null),
      allow_text: true
    };
  }
}

class SalesDiscoveryAgent extends BaseAgent {
  constructor() {
    super('SalesDiscoveryAgent', AGENT_PROMPTS.sales);
  }

  async execute(input, context) {
    const { choice, history } = input;
    const { geminiKey, sessionData, turnCount } = context;

    const contextInjection = buildContextInjection(sessionData?.scrapedData, null, sessionData);
    const previousOptions = extractPreviousOptions(history);

    const userMessage = `
[TASK: Sales Engine Discovery]

User input: "${choice}"
Turn count: ${turnCount}

${previousOptions.length > 0 ? `Previous options shown: [${previousOptions.join('] [')}]` : ''}

Known context:
- Stage: ${sessionData?.company?.stage || 'Unknown'}
- GTM Motion: ${sessionData?.gtm?.salesMotion || 'Unknown'}
- ICP: ${sessionData?.gtm?.icp?.title || 'Unknown'}

Current diagnosis confidence: ${sessionData?.confidence?.pillar3_diagnosis?.score || 0}/30

Requirements:
1. Probe for SPECIFIC pain points in sales
2. Look for the "Founder-Led Sales Trap" pattern
3. Include real-world sales example
4. Ask ONE diagnostic question

Output JSON with message, question_focus, options, data_extracted, confidence_update, context_note
`;

    const messages = this.buildMessages(this.prompt, contextInjection, history, userMessage);

    try {
      const llmResponse = await this.callLLM(messages, geminiKey);

      return {
        step_id: 'discovery',
        message: llmResponse.message,
        mode: 'mixed',
        options: this.validateOptions(llmResponse.options),
        allow_text: true,
        dataUpdates: {
          sales: llmResponse.data_extracted || {},
          memory: {
            keyInsights: llmResponse.context_note ? [llmResponse.context_note] : []
          }
        },
        confidenceUpdate: {
          pillar3_diagnosis: llmResponse.confidence_update || {}
        },
        contextNote: llmResponse.context_note || 'Sales discovery continued'
      };

    } catch (error) {
      log('❌', `SalesAgent error: ${error.message}`);
      return this.getDefaultResponse();
    }
  }

  validateOptions(options) {
    if (!options || options.length < 3) {
      return [
        { key: 'founder_sales', label: 'Founder still closes most deals' },
        { key: 'team_sales', label: 'Sales team handles most deals' },
        { key: 'no_process', label: 'No formal sales process yet' },
        { key: 'process_exists', label: 'We have a documented process' },
        { key: 'other_issue', label: 'The challenge is something else' }
      ];
    }
    return options.slice(0, 5);
  }

  getDefaultResponse() {
    return {
      step_id: 'discovery',
      message: "Let's dig into your sales engine. Who currently closes most of your deals?",
      mode: 'mixed',
      options: this.validateOptions(null),
      allow_text: true
    };
  }
}

class DiagnosisAgent extends BaseAgent {
  constructor() {
    super('DiagnosisAgent', AGENT_PROMPTS.diagnosis);
  }

  async execute(input, context) {
    const { choice, history } = input;
    const { action, geminiKey, sessionData, turnCount } = context;

    const contextInjection = buildContextInjection(sessionData?.scrapedData, null, sessionData);

    const userMessage = `
[TASK: ${action === 'validate' ? 'Validate Diagnosis' : 'Analyze & Diagnose'}]

User input: "${choice}"
Turn count: ${turnCount}

FULL SESSION DATA:
Company: ${JSON.stringify(sessionData?.company || {})}
GTM: ${JSON.stringify(sessionData?.gtm || {})}
Sales: ${JSON.stringify(sessionData?.sales || {})}
Key Insights: ${sessionData?.memory?.keyInsights?.join(' | ') || 'None'}

Current confidence:
- Company: ${sessionData?.confidence?.pillar1_company?.score || 0}/25
- GTM: ${sessionData?.confidence?.pillar2_gtm?.score || 0}/25
- Diagnosis: ${sessionData?.confidence?.pillar3_diagnosis?.score || 0}/30
- Total: ${sessionData?.confidence?.total_score || 0}/100

${action === 'validate' ? `
TASK: Validate your diagnosis hypothesis with the user.
Present your top 2-3 diagnosed problems and ask if they resonate.
` : `
TASK: Synthesize all information and identify root causes.
Look for patterns, connections, and the underlying issues.
`}

Output JSON with:
- message: Your diagnosis/validation message
- diagnosed_problems: Array of problems identified
- hypothesis: Your main hypothesis
- validation_question: Question to confirm
- options: Response options
- confidence_update: Updated scores
- context_note: Summary
`;

    const messages = this.buildMessages(this.prompt, contextInjection, history, userMessage);

    try {
      const llmResponse = await this.callLLM(messages, geminiKey);

      return {
        step_id: 'discovery',
        message: llmResponse.message,
        mode: 'mixed',
        options: this.validateOptions(llmResponse.options),
        allow_text: true,
        dataUpdates: {
          diagnosis: {
            primaryBlockers: llmResponse.diagnosed_problems || [],
            hypotheses: llmResponse.hypothesis ? [llmResponse.hypothesis] : []
          },
          memory: {
            keyInsights: llmResponse.context_note ? [llmResponse.context_note] : []
          }
        },
        confidenceUpdate: {
          pillar3_diagnosis: llmResponse.confidence_update || { pain_point: 8, root_cause: 6 }
        },
        contextNote: llmResponse.context_note || 'Diagnosis in progress'
      };

    } catch (error) {
      log('❌', `DiagnosisAgent error: ${error.message}`);
      return this.getDefaultResponse();
    }
  }

  validateOptions(options) {
    if (!options || options.length < 3) {
      return [
        { key: 'diagnosis_correct', label: 'Yes, that resonates strongly' },
        { key: 'diagnosis_partial', label: 'Partially - let me clarify' },
        { key: 'diagnosis_wrong', label: 'Not quite - the real issue is different' },
        { key: 'need_more_context', label: 'I need to add more context' }
      ];
    }
    return options.slice(0, 5);
  }

  getDefaultResponse() {
    return {
      step_id: 'discovery',
      message: "Based on what you've shared, I'm seeing some patterns emerge. Let me validate my thinking with you...",
      mode: 'mixed',
      options: this.validateOptions(null),
      allow_text: true
    };
  }
}

class ReportAgent extends BaseAgent {
  constructor() {
    super('ReportAgent', AGENT_PROMPTS.report);
  }

  async execute(input, context) {
    const { history } = input;
    const { geminiKey, sessionData } = context;

    const contextInjection = buildContextInjection(sessionData?.scrapedData, null, sessionData);

    const userMessage = `
[TASK: Generate Pre-Report Summary]

COMPLETE SESSION DATA:
Company: ${JSON.stringify(sessionData?.company || {})}
GTM: ${JSON.stringify(sessionData?.gtm || {})}
Sales: ${JSON.stringify(sessionData?.sales || {})}
Diagnosis: ${JSON.stringify(sessionData?.diagnosis || {})}
Key Insights: ${sessionData?.memory?.keyInsights?.join(' | ') || 'None'}
Confirmed Facts: ${sessionData?.memory?.confirmedFacts?.join(' | ') || 'None'}

Create a comprehensive summary of findings before generating the report.

Structure:
1. Company Profile Summary
2. Top 3 Revenue Blockers (prioritized)
3. Root Cause Analysis
4. Core Hypothesis
5. Recommended Next Steps

Output JSON with:
- message: Complete pre-report summary for user review
- report_data: Structured data for report generation
- ready_for_generation: true
`;

    const messages = this.buildMessages(this.prompt, contextInjection, history, userMessage);

    try {
      const llmResponse = await this.callLLM(messages, geminiKey, { maxTokens: 3000 });

      return {
        step_id: 'pre_finish',
        message: llmResponse.message,
        mode: 'buttons',
        options: [
          { key: 'download_report', label: '📥 Generate Strategic Growth Plan' },
          { key: 'add_context', label: 'Wait, I want to add something important' },
          { key: 'correct_something', label: 'One of those findings isn\'t quite right' }
        ],
        allow_text: false,
        dataUpdates: {
          diagnosis: {
            validated: true,
            confidence: sessionData?.confidence?.total_score || 0
          }
        },
        confidenceUpdate: {
          pillar4_solution: { validated: 8, next_steps: 4 }
        },
        reportData: llmResponse.report_data,
        contextNote: 'Pre-finish summary generated'
      };

    } catch (error) {
      log('❌', `ReportAgent error: ${error.message}`);
      return {
        step_id: 'pre_finish',
        message: "I've gathered enough information to generate your Strategic Growth Plan. Ready to proceed?",
        mode: 'buttons',
        options: [
          { key: 'download_report', label: '📥 Generate Report' },
          { key: 'add_context', label: 'Add more context first' }
        ],
        allow_text: false
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

class Orchestrator {
  constructor(geminiKey, tavilyKey) {
    this.geminiKey = geminiKey;
    this.tavilyKey = tavilyKey;
    
    // Initialize agents
    this.agents = {
      [AGENT_TYPES.CONTEXT]: new ContextAgent(),
      [AGENT_TYPES.COMPANY]: new CompanyDiscoveryAgent(),
      [AGENT_TYPES.GTM]: new GTMDiscoveryAgent(),
      [AGENT_TYPES.SALES]: new SalesDiscoveryAgent(),
      [AGENT_TYPES.DIAGNOSIS]: new DiagnosisAgent(),
      [AGENT_TYPES.REPORT]: new ReportAgent()
    };
  }

  initializeSessionData(existingData = null) {
    if (existingData) return existingData;
    
    return {
      company: {},
      gtm: {},
      sales: {},
      operations: {},
      diagnosis: {
        primaryBlockers: [],
        rootCauses: [],
        hypotheses: [],
        validated: false
      },
      scrapedData: {},
      memory: {
        keyInsights: [],
        confirmedFacts: [],
        userCorrections: []
      },
      confidence: {
        pillar1_company: { score: 0, max: 25, items: { stage: 0, revenue: 0, team: 0 } },
        pillar2_gtm: { score: 0, max: 25, items: { motion: 0, icp: 0, channels: 0 } },
        pillar3_diagnosis: { score: 0, max: 30, items: { pain_point: 0, root_cause: 0, factors: 0 } },
        pillar4_solution: { score: 0, max: 20, items: { validated: 0, next_steps: 0, recommendations: 0 } },
        total_score: 0,
        ready_for_finish: false
      }
    };
  }

  async processInput(input) {
    const { choice, history = [], contextData, sessionData: inputSessionData } = input;
    
    // Initialize or restore session data
    let sessionData = this.initializeSessionData(inputSessionData);
    const turnCount = history.filter(h => h.role === 'user').length;

    log('🎯', `Orchestrator processing. Turn: ${turnCount}, Choice: ${choice?.slice(0, 50)}...`);

    // Determine routing
    const routing = this.determineRouting(choice, sessionData, turnCount);
    log('🔀', `Routing to: ${routing.agent} (action: ${routing.action})`);

    // Build agent context
    const agentContext = {
      sessionData,
      turnCount,
      action: routing.action,
      geminiKey: this.geminiKey,
      tavilyKey: this.tavilyKey
    };

    // Execute agent
    const agent = this.agents[routing.agent];
    const agentResponse = await agent.execute(input, agentContext);

    // Update session data
    sessionData = this.updateSessionData(sessionData, agentResponse);

    // Build final response
    return this.buildFinalResponse(agentResponse, sessionData, turnCount);
  }

  determineRouting(choice, sessionData, turnCount) {
    // Initial snapshot
    if (choice === 'SNAPSHOT_INIT') {
      return { agent: AGENT_TYPES.CONTEXT, action: 'scrape_and_analyze' };
    }

    // Correction requests
    const correctionKeywords = ['add_context', 'correct_something', 'mostly_wrong', 'not right', 'wrong'];
    if (correctionKeywords.some(kw => choice.toLowerCase().includes(kw))) {
      return { agent: AGENT_TYPES.CONTEXT, action: 'correction' };
    }

    // Ready for report
    if (this.isReadyForReport(sessionData, turnCount)) {
      if (choice === 'download_report') {
        return { agent: AGENT_TYPES.REPORT, action: 'generate' };
      }
      // Show pre-finish if not already there
      if (sessionData.confidence.pillar4_solution.items.validated < 6) {
        return { agent: AGENT_TYPES.REPORT, action: 'summarize' };
      }
    }

    // Discovery routing based on lowest pillar
    const lowestPillar = getLowestScoringPillar(sessionData.confidence);

    switch (lowestPillar.key) {
      case 'pillar1_company':
        return { agent: AGENT_TYPES.COMPANY, action: 'discover' };
      
      case 'pillar2_gtm':
        return { agent: AGENT_TYPES.GTM, action: 'discover' };
      
      case 'pillar3_diagnosis':
        // Need enough context before diagnosis
        if (sessionData.confidence.pillar1_company.score >= 12 &&
            sessionData.confidence.pillar2_gtm.score >= 12) {
          return { agent: AGENT_TYPES.DIAGNOSIS, action: 'analyze' };
        }
        return { agent: AGENT_TYPES.SALES, action: 'discover' };
      
      case 'pillar4_solution':
        return { agent: AGENT_TYPES.DIAGNOSIS, action: 'validate' };
      
      default:
        return { agent: AGENT_TYPES.SALES, action: 'discover' };
    }
  }

  isReadyForReport(sessionData, turnCount) {
    const { confidence } = sessionData;
    return (
      confidence.total_score >= CONFIDENCE_THRESHOLDS.MIN_FOR_REPORT &&
      turnCount >= CONFIDENCE_THRESHOLDS.MIN_TURNS &&
      confidence.pillar3_diagnosis.score >= CONFIDENCE_THRESHOLDS.MIN_DIAGNOSIS_SCORE
    );
  }

  updateSessionData(sessionData, agentResponse) {
    if (!agentResponse.dataUpdates) return sessionData;

    const { dataUpdates, confidenceUpdate } = agentResponse;

    // Merge data updates
    if (dataUpdates.company) {
      sessionData.company = { ...sessionData.company, ...dataUpdates.company };
    }
    if (dataUpdates.gtm) {
      sessionData.gtm = { ...sessionData.gtm, ...dataUpdates.gtm };
    }
    if (dataUpdates.sales) {
      sessionData.sales = { ...sessionData.sales, ...dataUpdates.sales };
    }
    if (dataUpdates.diagnosis) {
      sessionData.diagnosis = { ...sessionData.diagnosis, ...dataUpdates.diagnosis };
    }
    if (dataUpdates.scrapedData) {
      sessionData.scrapedData = { ...sessionData.scrapedData, ...dataUpdates.scrapedData };
    }
    if (dataUpdates.memory) {
      if (dataUpdates.memory.keyInsights) {
        sessionData.memory.keyInsights.push(...dataUpdates.memory.keyInsights);
      }
      if (dataUpdates.memory.confirmedFacts) {
        sessionData.memory.confirmedFacts.push(...dataUpdates.memory.confirmedFacts);
      }
    }

    // Update confidence scores (cumulative)
    if (confidenceUpdate) {
      this.updateConfidence(sessionData.confidence, confidenceUpdate);
    }

    return sessionData;
  }

  updateConfidence(confidence, updates) {
    Object.keys(updates).forEach(pillar => {
      if (confidence[pillar]?.items && updates[pillar]) {
        Object.keys(updates[pillar]).forEach(item => {
          if (confidence[pillar].items[item] !== undefined) {
            confidence[pillar].items[item] = Math.max(
              confidence[pillar].items[item],
              updates[pillar][item]
            );
          }
        });
      }
    });

    // Recalculate totals
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
  }

  buildFinalResponse(agentResponse, sessionData, turnCount) {
    // Validate options
    let options = agentResponse.options || [];
    if (options.length < 3) {
      options = [
        { key: 'continue', label: 'Continue the conversation' },
        { key: 'clarify', label: 'Let me clarify something' },
        { key: 'different_topic', label: 'I want to discuss something else' }
      ];
    }

    // Remove generic options
    const genericKeys = ['continue', 'next', 'ok', 'tell_me_more'];
    options = options.filter(opt => 
      !genericKeys.includes(opt.key.toLowerCase()) || opt.label.length > 25
    );

    // Check if ready for finish
    const readyForFinish = this.isReadyForReport(sessionData, turnCount);
    
    // Force pre_finish if ready and not in correction mode
    let stepId = agentResponse.step_id;
    if (readyForFinish && 
        stepId !== 'context_correction' && 
        sessionData.confidence.pillar4_solution.items.validated >= 6) {
      stepId = 'FINISH';
      options = [
        { key: 'download_report', label: '📥 Generate Strategic Growth Plan' },
        { key: 'add_context', label: 'Wait, I want to add something important' },
        { key: 'correct_something', label: 'One of those findings isn\'t quite right' }
      ];
    }

    return {
      step_id: stepId,
      message: agentResponse.message,
      mode: agentResponse.mode || 'mixed',
      options: options.slice(0, 5),
      allow_text: agentResponse.allow_text !== false,
      confidence_state: sessionData.confidence,
      session_data: sessionData,
      context_note: agentResponse.contextNote
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: MAIN API HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Error response helper
  const sendErrorResponse = (message) => {
    return res.status(200).json({
      step_id: 'error',
      message: message || "Something went wrong. Let's continue — tell me about your main revenue challenge.",
      mode: 'mixed',
      options: [
        { key: 'lead_generation', label: 'Not enough qualified leads' },
        { key: 'conversion_issues', label: 'Leads aren\'t converting' },
        { key: 'scaling_sales', label: 'Can\'t scale beyond founder selling' },
        { key: 'churn', label: 'Losing customers too quickly' }
      ],
      allow_text: true
    });
  };

  try {
    const { 
      choice, 
      history = [], 
      contextData = null, 
      sessionData = null,
      attachment = null
    } = req.body;

    const geminiKey = process.env.GEMINI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!geminiKey) {
      log('❌', 'Missing GEMINI_API_KEY');
      return sendErrorResponse('Configuration error. Please check API keys.');
    }

    // Initialize orchestrator
    const orchestrator = new Orchestrator(geminiKey, tavilyKey);

    // Process input
    const response = await orchestrator.processInput({
      choice,
      history,
      contextData,
      sessionData,
      attachment
    });

    log('✅', `Response: step_id=${response.step_id}, confidence=${response.confidence_state?.total_score}`);
    
    return res.status(200).json(response);

  } catch (error) {
    console.error('[FATAL ERROR]', error);
    return sendErrorResponse();
  }
}
