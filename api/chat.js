// ═══════════════════════════════════════════════════════════════
// REVENUE ARCHITECT - CHAT API v3.1
// Fixed: LinkedIn scraping, context persistence, button memory,
//        richer responses, proper finish logic
// ═══════════════════════════════════════════════════════════════

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
      h2: [],
      paragraphs: [],
      links: [],
      pricing_signals: [],
      social_proof: []
    }
  };

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) context.business_signals.title = titleMatch[1].trim();

  // Meta Description
  const metaDescMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || 
                        html.match(/<meta\s+content="([^"]*)"\s+name="description"/i);
  if (metaDescMatch) context.business_signals.description = metaDescMatch[1].trim();

  // H1s (Value Propositions)
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  context.business_signals.h1 = h1Matches
    .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .filter(t => t.length > 0 && t.length < 200);

  // H2s (Features/Services)
  const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  context.business_signals.h2 = h2Matches
    .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .filter(t => t.length > 0 && t.length < 150)
    .slice(0, 8);

  // Key paragraphs (first 5 meaningful ones)
  const pMatches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  context.business_signals.paragraphs = pMatches
    .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .filter(t => t.length > 50 && t.length < 500)
    .slice(0, 5);

  // Pricing signals
  const pricingKeywords = /pricing|price|cost|\$|€|£|\/mo|\/month|\/year|free trial|demo|subscribe/gi;
  if (pricingKeywords.test(html)) {
    const pricingMatches = html.match(/(\$|€|£)\s*\d+[,.]?\d*/g) || [];
    context.business_signals.pricing_signals = [...new Set(pricingMatches)].slice(0, 5);
  }

  // Social proof signals
  const socialProofPatterns = [
    /(\d+[,.]?\d*[kK]?\+?)\s*(customers?|users?|companies|businesses|clients)/gi,
    /trusted by\s+([^<]+)/gi,
    /used by\s+([^<]+)/gi
  ];
  socialProofPatterns.forEach(pattern => {
    const matches = html.match(pattern);
    if (matches) context.business_signals.social_proof.push(...matches.slice(0, 3));
  });

  // Tech stack detection (expanded)
  const techPatterns = {
    'React/Next.js': /__react|react-dom|_next|nextjs/i,
    'Vue.js': /vue\.js|vuejs|__vue/i,
    'Angular': /angular|ng-/i,
    'Shopify': /shopify|myshopify/i,
    'WordPress': /wordpress|wp-content/i,
    'Webflow': /webflow/i,
    'Wix': /wix\.com|wixsite/i,
    'Squarespace': /squarespace/i,
    'HubSpot': /hubspot|hs-scripts/i,
    'Salesforce': /salesforce|pardot/i,
    'Intercom': /intercom/i,
    'Drift': /drift\.com|driftt/i,
    'Stripe': /stripe/i,
    'Google Analytics': /google-analytics|gtag|UA-\d+/i,
    'Segment': /segment\.com|analytics\.js/i,
    'Hotjar': /hotjar/i,
    'Mixpanel': /mixpanel/i
  };
  
  Object.entries(techPatterns).forEach(([name, pattern]) => {
    if (pattern.test(html)) context.technologies.push(name);
  });
  
  return context;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: LINKEDIN SCRAPER
// ═══════════════════════════════════════════════════════════════
async function scrapeLinkedIn(linkedinUrl, tavilyKey) {
  if (!linkedinUrl || !tavilyKey) return null;
  
  const log = (emoji, msg) => console.log(`[LinkedIn] ${emoji} ${msg}`);
  
  try {
    // Extract company name from LinkedIn URL
    const urlMatch = linkedinUrl.match(/linkedin\.com\/company\/([^\/\?]+)/i);
    if (!urlMatch) {
      log('⚠️', 'Invalid LinkedIn URL format');
      return null;
    }
    
    const companySlug = urlMatch[1];
    log('🔍', `Searching for LinkedIn data: ${companySlug}`);
    
    // Use Tavily to search for LinkedIn company info
    const searchQueries = [
      `"${companySlug}" site:linkedin.com company about employees`,
      `"${companySlug}" company size employees funding`
    ];
    
    let linkedinData = {
      company_name: companySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: '',
      employee_count: '',
      industry: '',
      headquarters: '',
      founded: '',
      specialties: [],
      recent_posts: []
    };
    
    for (const query of searchQueries) {
      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query,
            search_depth: "advanced",
            max_results: 5,
            include_answer: true
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Extract employee count
          const empMatch = data.answer?.match(/(\d+[\-–]\d+|\d+[,.]?\d*[kK]?\+?)\s*(employees?|people|staff)/i);
          if (empMatch) linkedinData.employee_count = empMatch[0];
          
          // Extract industry
          const indMatch = data.answer?.match(/(?:industry|sector|space):\s*([^.]+)/i) ||
                          data.answer?.match(/(?:in the|operates in)\s+([^.]+?)\s+(?:industry|sector|space)/i);
          if (indMatch) linkedinData.industry = indMatch[1].trim();
          
          // Extract description from results
          if (data.results?.length > 0) {
            const linkedinResult = data.results.find(r => r.url?.includes('linkedin.com'));
            if (linkedinResult?.content) {
              linkedinData.description = linkedinResult.content.slice(0, 500);
            }
          }
          
          // Use answer as fallback description
          if (!linkedinData.description && data.answer) {
            linkedinData.description = data.answer.slice(0, 500);
          }
        }
      } catch (e) {
        log('⚠️', `Search query failed: ${e.message}`);
      }
    }
    
    log('✅', `LinkedIn data extracted: ${JSON.stringify(linkedinData).slice(0, 200)}...`);
    return linkedinData;
    
  } catch (error) {
    log('❌', `LinkedIn scraping failed: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Get Lowest Scoring Pillar
// ═══════════════════════════════════════════════════════════════
function getLowestPillar(confidence) {
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

// ═══════════════════════════════════════════════════════════════
// HELPER: Extract Previous Options from History
// ═══════════════════════════════════════════════════════════════
function extractPreviousOptions(history) {
  const lastOptions = [];
  
  // Look at last 3 assistant messages for options
  const assistantMessages = history.filter(h => h.role === 'assistant').slice(-3);
  
  for (const msg of assistantMessages) {
    try {
      const parsed = JSON.parse(msg.content);
      if (parsed.options && Array.isArray(parsed.options)) {
        lastOptions.push({
          turn: history.indexOf(msg),
          options: parsed.options.map(o => o.label)
        });
      }
    } catch {}
  }
  
  return lastOptions;
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════
function buildSystemPrompt(systemContextInjection, confidence, turnCount, previousOptions, sessionContext) {
  return `
═══════════════════════════════════════════════════════════════════════════════
                        REVENUE ARCHITECT - SYSTEM PROMPT
                              Version 3.1 | Production
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
- You ALWAYS back up insights with real-world examples and concrete data

TONE:
- Professional but conversational (like a trusted advisor over coffee)
- Confident but not arrogant
- Ask ONE question at a time
- Use "you/your" language, not "the company"
- Be specific — generic advice is worthless
- **NEW: Provide 10-15% MORE detail in responses with concrete examples**

LANGUAGE RULE:
- ALWAYS respond in the same language the user writes in
- If user writes in Italian → respond in Italian
- If user writes in English → respond in English

RESPONSE LENGTH & DEPTH:
- Minimum 3-4 sentences per response (except for simple confirmations)
- ALWAYS include at least ONE real-world example or analogy
- When explaining a concept, show HOW it applies to their specific situation
- Use specific numbers, percentages, or timeframes where possible

WHAT YOU ARE NOT:
- NOT a code reviewer (ignore React, Tailwind, Vercel, CSS)
- NOT a technical consultant
- NOT a generic chatbot that says "interesting" and "great question"
- NEVER mention tech stack unless it directly impacts revenue

ABSOLUTE PROHIBITIONS:
1. Never generate options like "Continue", "Next", "Tell me more" (too generic)
2. Never ask more than ONE question per message
3. Never skip the confirmation step after welcome
4. **CRITICAL: Never offer report generation if confidence < 70% OR if user says context is wrong**
5. Never contradict the user's manual Business Description
6. **CRITICAL: If user clicks "add context" or "correct something", you MUST ask follow-up questions, NOT re-offer the report**

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
- Ready for Finish: ${confidence.total_score >= 70 && turnCount >= 8}

**FINISH REQUIREMENTS (ALL must be true):**
- total_score >= 70 (currently: ${confidence.total_score})
- turn_count >= 8 (currently: ${turnCount})
- pillar3_diagnosis.score >= 20 (currently: ${confidence.pillar3_diagnosis.score})
- User has NOT just asked to add context or correct something

${sessionContext.userRequestedCorrection ? `
⚠️ USER JUST REQUESTED CORRECTION/MORE CONTEXT
Do NOT offer report. Ask specific follow-up questions about what they want to correct.
` : ''}

${previousOptions.length > 0 ? `
═══════════════════════════════════════════════════════════════════════════════
BUTTON MEMORY (Previous options shown to user)
═══════════════════════════════════════════════════════════════════════════════
${previousOptions.map(po => `Turn ${po.turn}: [${po.options.join('] [')}]`).join('\n')}

IMPORTANT: If user says "all of the above" or "all options apply", acknowledge ALL these options specifically.
` : ''}

═══════════════════════════════════════════════════════════════════════════════
SECTION 3: CONVERSATION FLOW (STATE MACHINE)
═══════════════════════════════════════════════════════════════════════════════

STATE 1: SNAPSHOT_INIT (Welcome)
────────────────────────────────
TRIGGER: choice === "SNAPSHOT_INIT"

YOUR TASK:
1. Acknowledge the business based on ALL available data:
   - User Description (highest priority)
   - Website scraped data (title, H1s, H2s, paragraphs)
   - LinkedIn data (employee count, industry, description)
   - Pricing signals found
   - Social proof found
2. Make 3-4 SPECIFIC assumptions about their business (more detailed than before)
3. Include concrete details from the scraping (e.g., "I noticed you mention 'X' on your homepage")
4. If LinkedIn data available, mention company size/industry
5. END with confirmation request

EXAMPLE WELCOME (more detailed):
"**Welcome to Revenue Architect.**

I've analyzed [Company] and here's what I found:

**From your website:**
- Your main value proposition appears to be '[H1 text]'
- You offer [services from H2s]
- I noticed pricing around [pricing signals] which suggests [pricing model assumption]
- You mention [social proof] which indicates [traction assumption]

**From LinkedIn:**
- Company size: [X employees]
- Industry: [industry]

**My assumptions:**
1. You're likely in the [stage] stage based on [evidence]
2. Your primary ICP seems to be [target] because [reason]
3. Your sales motion is probably [type] given [evidence]

Did I get this right? What should I correct?"

STATE 2: DISCOVERY (Main Loop)
──────────────────────────────
TRIGGER: After welcome, until FINISH conditions met

YOUR TASK:
1. Identify the LOWEST scoring pillar
2. Ask ONE targeted question to fill that gap
3. **ALWAYS include a real-world example or pattern**
4. Follow "pain signals" when user shows frustration
5. Every 3-4 turns, do a mini-recap
6. **If user says context was wrong, reset and ask clarifying questions**

RESPONSE FORMAT FOR DISCOVERY:
1. Acknowledge what user said (1-2 sentences)
2. Provide insight with real-world example (2-3 sentences)
3. Ask ONE specific question
4. Provide 3-5 specific button options

EXAMPLE DISCOVERY RESPONSE:
"That's a classic pattern — founder-led sales that can't be delegated. 

**[Real Example]** I worked with a $400K ARR SaaS last year that had the same issue. The founder closed 90% of deals because reps couldn't articulate the technical value prop. We solved it by creating a 'sales playbook' with recorded calls and objection handlers. Within 3 months, reps were closing at 60% of founder rate.

**For you:** What specifically breaks when someone other than the founder tries to sell?"

STATE 3: CONTEXT CORRECTION (User says info was wrong)
──────────────────────────────────────────────────────
TRIGGER: User indicates initial context was wrong or incomplete

YOUR TASK:
1. Acknowledge the misunderstanding
2. Ask SPECIFIC questions to fill the gap
3. Do NOT proceed to diagnosis until context is clear
4. Update confidence scores to reflect uncertainty

EXAMPLE:
"I apologize for the misread. Let me get this right.

Can you tell me in your own words:
1. What does your company actually do?
2. Who is your primary customer?
3. How do you currently acquire customers?"

STATE 4: PRE-FINISH (Summary)
─────────────────────────────
TRIGGER: confidence.total_score >= 70 AND turnCount >= 8 AND pillar3 >= 20

**BLOCKING CONDITIONS (do NOT show finish if any are true):**
- User just clicked "add_context" or "correct_something"
- User said the context was wrong in last message
- confidence.total_score < 70
- turnCount < 8

YOUR TASK:
Present structured summary with SPECIFIC details from conversation.

═══════════════════════════════════════════════════════════════════════════════
SECTION 4: DISCOVERY FRAMEWORK (7 Diagnostic Pillars)
═══════════════════════════════════════════════════════════════════════════════

Explore conversationally with REAL-WORLD EXAMPLES for each:

PILLAR 1: MISSION & NORTH STAR
- Example: "Most early-stage B2B companies I see are tracking 5+ metrics but can't tell me which ONE matters most. At Gong, the only metric that mattered early on was 'recorded calls per week' — everything else was noise."

PILLAR 2: MESSAGING & POSITIONING
- Example: "Basecamp is a classic 'Painkiller' — they sell 'get organized' to teams drowning in chaos. Compare to a 'Vitamin' like Notion which sells 'flexibility' — nice but not urgent."

PILLAR 3: KYC LAYER
- Pattern: "At $300K ARR with 4 people, you're in what I call the 'Founder Capacity Crunch' — revenue is limited by founder hours, not market demand."

PILLAR 4: SALES ENGINE
- Example: "The 'Founder-Led Sales Trap' killed a client's growth for 18 months. Founder closed at 40% win rate, first rep at 8%. The fix wasn't training — it was documenting the discovery questions the founder asked instinctively."

PILLAR 5: MARKETING-SALES LOOP
- Example: "One client had marketing reporting 500 MQLs/month but sales only accepted 50. Turned out marketing was counting whitepaper downloads from students. We fixed attribution and MQLs dropped to 80, but SALs stayed at 50."

PILLAR 6: COMPETITIVE MOAT
- Example: "When I ask 'why you vs competitors?' and the answer is 'better customer service' — that's a red flag. That's not a moat, that's table stakes. A real moat is Stripe's developer experience or Salesforce's ecosystem."

PILLAR 7: MANUAL HELL CHECK
- Example: "I had a client spending 15 hours/week on manual reporting. We automated it with a simple Zapier + Google Sheets setup in 2 days. That's 60 hours/month back for actual selling."

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

**SCORE REDUCTION TRIGGERS:**
- If user says context was wrong: Reduce pillar1 by 50%
- If user says "that's not our problem": Reduce pillar3 by 30%

FINISH THRESHOLDS:
- total_score >= 70 (NOT 80)
- turn_count >= 8 (NOT 15)
- pillar3_diagnosis.score >= 20

═══════════════════════════════════════════════════════════════════════════════
SECTION 6: INPUT HANDLING & BUTTON MEMORY
═══════════════════════════════════════════════════════════════════════════════

PRIORITY ORDER:
1. USER TEXT INPUT (highest priority) → Process and respond meaningfully
2. Button selection → Process and continue
3. Vague input ("idk", "not sure") → Simplify question + re-offer buttons

**BUTTON MEMORY SYSTEM:**
When user says things like "all of the above", "all apply", "tutte le opzioni":
1. Look at BUTTON MEMORY section above
2. Acknowledge EACH option specifically
3. Ask which one is MOST pressing

Example:
User: "All of those are problems for us"
Response: "Got it — so you're dealing with:
- [Option 1 from memory]
- [Option 2 from memory]  
- [Option 3 from memory]
- [Option 4 from memory]

That's a lot! Which one keeps you up at night the most? Or which one, if solved, would have the biggest revenue impact?"

**CONTEXT CORRECTION HANDLING:**
If user clicks "add_context" or "correct_something":
1. Do NOT re-offer the report
2. Ask: "What would you like to add or correct?"
3. Wait for their input
4. Update confidence scores if needed
5. Only offer report again after addressing their input

═══════════════════════════════════════════════════════════════════════════════
SECTION 7: OUTPUT FORMAT (STRICT JSON)
═══════════════════════════════════════════════════════════════════════════════

{
  "step_id": "welcome" | "discovery" | "context_correction" | "pre_finish" | "FINISH",
  "message": "Your response with real-world examples...",
  "mode": "buttons" | "text" | "mixed",
  "options": [
    {"key": "specific_key", "label": "Specific actionable label"}
  ],
  "allow_text": true,
  "confidence_update": {
    "pillar1_company": {"stage": 7}
  },
  "context_note": "Brief note about what was learned this turn (for memory)"
}

**NEW FIELD: context_note**
Add a brief note summarizing what was learned this turn. This helps maintain memory.

═══════════════════════════════════════════════════════════════════════════════
SECTION 8: EXAMPLES WITH REAL-WORLD DEPTH
═══════════════════════════════════════════════════════════════════════════════

EXAMPLE 1: Welcome with LinkedIn Data
─────────────────────────────────────
{
  "step_id": "welcome",
  "message": "**Welcome to Revenue Architect.**\\n\\nI've analyzed Acme SaaS and pulled some interesting data:\\n\\n**From your website:**\\n- Main headline: 'Automate your client reporting in minutes'\\n- You offer integrations with Google Analytics, Facebook Ads, and HubSpot\\n- Pricing starts at $49/mo — suggests SMB focus\\n- You mention '2,000+ agencies trust us' — solid social proof\\n\\n**From LinkedIn:**\\n- ~25 employees\\n- Marketing & Advertising industry\\n- Based in Austin, TX\\n\\n**My assumptions:**\\n1. You're likely at $500K-$2M ARR based on team size and pricing\\n2. Your ICP is marketing agencies with 5-50 employees\\n3. Sales cycle is probably < 30 days given the price point\\n4. You're likely product-led with some sales assist for larger deals\\n\\nDid I nail it, or should I recalibrate?",
  "mode": "mixed",
  "options": [
    {"key": "confirm_correct", "label": "Yes, that's pretty accurate"},
    {"key": "partially_correct", "label": "Close, but let me clarify a few things"},
    {"key": "mostly_wrong", "label": "Actually, the situation is quite different"}
  ],
  "allow_text": true,
  "confidence_update": {
    "pillar1_company": {"stage": 5, "team": 5},
    "pillar2_gtm": {"icp": 4}
  },
  "context_note": "Initial analysis: reporting automation SaaS, ~25 employees, targets agencies, $49/mo pricing"
}

EXAMPLE 2: Discovery with Real-World Example
────────────────────────────────────────────
{
  "step_id": "discovery",
  "message": "So the founder is still closing most deals — that's textbook 'Founder-Led Sales Trap.'\\n\\n**[Real Example]** I worked with a dev tools company at similar stage. Founder had 35% close rate, hired rep got 5%. The gap wasn't skills — it was that the founder instinctively knew which technical objections to preempt. We did 3 things:\\n1. Recorded 20 founder calls and transcribed them\\n2. Built an objection-handler doc with exact phrases\\n3. Had founder shadow rep calls for 2 weeks giving real-time Slack feedback\\n\\nResult: Rep hit 22% close rate in 60 days.\\n\\n**For your situation:** When you've tried to hand off deals before, where exactly does it break down?\\n- During initial demo?\\n- When technical questions come up?\\n- At pricing/negotiation?\\n- Something else?",
  "mode": "mixed",
  "options": [
    {"key": "breaks_demo", "label": "Breaks during initial demo"},
    {"key": "breaks_technical", "label": "Can't handle technical questions"},
    {"key": "breaks_pricing", "label": "Falls apart at pricing negotiation"},
    {"key": "never_tried", "label": "We haven't really tried delegating yet"},
    {"key": "other_reason", "label": "It's something else"}
  ],
  "allow_text": true,
  "confidence_update": {
    "pillar3_diagnosis": {"pain_point": 8}
  },
  "context_note": "Confirmed founder-led sales trap. Need to identify specific breakpoint in handoff."
}

EXAMPLE 3: Handling "All Options Apply"
───────────────────────────────────────
{
  "step_id": "discovery", 
  "message": "Got it — sounds like you're getting hit from multiple angles. Let me make sure I captured everything:\\n\\n✓ **Lead quality issues** — talking to wrong people\\n✓ **Long sales cycles** — deals dragging for months\\n✓ **Founder bottleneck** — can't scale without you\\n✓ **No documented process** — tribal knowledge only\\n\\nThat's a compound problem, which actually makes diagnosis easier — these are usually connected.\\n\\n**[Pattern I've seen]** In 7 out of 10 cases like this, the root cause is actually ONE thing: **unclear ICP**. When you don't know exactly who you're selling to, you get:\\n- Bad leads (marketing targets wrong people)\\n- Long cycles (wrong buyers need more convincing)\\n- Founder dependency (only founder can 'feel' the right fit)\\n\\n**Quick gut check:** If I asked you to describe your ideal customer in ONE sentence — company size, industry, specific problem they have — could you do it confidently?",
  "mode": "mixed",
  "options": [
    {"key": "icp_clear", "label": "Yes, we know exactly who we target"},
    {"key": "icp_vague", "label": "It's a bit fuzzy, honestly"},
    {"key": "icp_multiple", "label": "We have multiple ICPs, that might be the issue"},
    {"key": "icp_evolving", "label": "It keeps changing as we learn"}
  ],
  "allow_text": true,
  "confidence_update": {
    "pillar3_diagnosis": {"pain_point": 10, "factors": 4}
  },
  "context_note": "Multiple pain points confirmed: lead quality, long cycles, founder bottleneck, no process. Hypothesis: unclear ICP is root cause."
}

EXAMPLE 4: Context Correction (User says info was wrong)
────────────────────────────────────────────────────────
{
  "step_id": "context_correction",
  "message": "My apologies — I clearly misread the situation. Let me reset and get this right.\\n\\n**Help me understand:**\\n\\n1. What does your company actually do? (In your own words, not marketing-speak)\\n2. Who writes you the checks? (Job title, company type, size)\\n3. How do most customers find you today?\\n\\nTake your time — I'd rather get the foundation right than build on wrong assumptions.",
  "mode": "mixed",
  "options": [
    {"key": "explain_business", "label": "Let me explain what we actually do"},
    {"key": "explain_customers", "label": "I'll clarify who our customers are"},
    {"key": "explain_everything", "label": "I'll give you the full picture"}
  ],
  "allow_text": true,
  "confidence_update": {
    "pillar1_company": {"stage": 0, "revenue": 0, "team": 0}
  },
  "context_note": "User indicated initial context was wrong. Resetting company context for re-discovery."
}

EXAMPLE 5: Pre-Finish (Only when conditions met)
────────────────────────────────────────────────
{
  "step_id": "pre_finish",
  "message": "**Diagnosis Complete** ✅\\n\\nAfter our conversation, here's what I've mapped out:\\n\\n**📊 Company Profile:**\\n- Stage: Growth ($400K ARR, team of 5)\\n- Motion: Outbound-heavy via LinkedIn\\n- ICP: Marketing agencies, 10-50 employees, struggling with client reporting\\n\\n**🔴 Top 3 Revenue Blockers:**\\n\\n**1. Founder-Led Sales Trap (Critical)**\\n- You close at 35%, reps at <10%\\n- Root cause: Undocumented discovery process\\n- Impact: Growth capped at your personal bandwidth\\n\\n**2. ICP Drift**\\n- Taking on clients outside core ICP\\n- Results in longer cycles and higher churn\\n- 'Bad revenue' is masking 'good revenue'\\n\\n**3. Manual Reporting Hell**\\n- ~10 hours/week on internal reporting\\n- No single source of truth for pipeline\\n- Decisions made on gut, not data\\n\\n**My Core Hypothesis:**\\nThe #1 unlock is documenting your sales process. Everything else compounds from there.\\n\\n---\\n\\nI have enough to generate your **Strategic Growth Plan** with a 90-day action roadmap.\\n\\nReady to proceed?",
  "mode": "buttons",
  "options": [
    {"key": "download_report", "label": "📥 Generate Strategic Growth Plan"},
    {"key": "add_context", "label": "Wait, I want to add something important"},
    {"key": "correct_something", "label": "One of those diagnoses isn't quite right"}
  ],
  "allow_text": false,
  "confidence_update": {
    "pillar4_solution": {"validated": 6}
  },
  "context_note": "Reached finish threshold. Presented summary for validation before report generation."
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
        { key: "explain_situation", label: "Let me explain my situation" },
        { key: "ask_question", label: "I have a specific question" }
      ],
      allow_text: true
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
      confidenceState = null,
      diagnosticData = {}
    } = req.body;
    
    const geminiKey = process.env.GEMINI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!geminiKey) {
      return sendSafeResponse("⚠️ Configuration error: Gemini API Key missing.");
    }

    // ═══════════════════════════════════════════════════════════════
    // CONFIDENCE SCORE SYSTEM
    // ═══════════════════════════════════════════════════════════════
    const CONFIDENCE_THRESHOLD = 70; // Reduced from 80
    const MIN_TURNS_FOR_FINISH = 8;  // Reduced from 15
    const MIN_DIAGNOSIS_SCORE = 20;  // New requirement
    const turnCount = history.filter(h => h.role === 'user').length;
    
    let confidence = confidenceState || {
      pillar1_company: { score: 0, max: 25, items: { stage: 0, revenue: 0, team: 0 } },
      pillar2_gtm: { score: 0, max: 25, items: { motion: 0, icp: 0, channels: 0 } },
      pillar3_diagnosis: { score: 0, max: 30, items: { pain_point: 0, root_cause: 0, factors: 0 } },
      pillar4_solution: { score: 0, max: 20, items: { validated: 0, next_steps: 0, recommendations: 0 } },
      total_score: 0,
      ready_for_finish: false
    };

    // Session context for tracking state
    let sessionContext = {
      userRequestedCorrection: false,
      contextWasWrong: false,
      previousOptionsShown: []
    };

    // Check if user is requesting correction
    const correctionKeywords = ['add_context', 'correct_something', 'mostly_wrong', 'not right', 'wrong', 'incorrect', 'let me clarify', 'actually'];
    if (correctionKeywords.some(kw => choice.toLowerCase().includes(kw))) {
      sessionContext.userRequestedCorrection = true;
      log('🔄', 'User requested correction - blocking finish');
    }

    let systemContextInjection = "";
    let linkedinData = null;

    // ═══════════════════════════════════════════════════════════════
    // SNAPSHOT PHASE - BUSINESS CONTEXT EXTRACTION
    // ═══════════════════════════════════════════════════════════════
    if (choice === "SNAPSHOT_INIT" && contextData) {
      log('🔍', 'Analyzing Business Context for:', contextData.website);
      
      let siteAnalysis = null;
      let externalInsights = "";
      
      // 1. WEB SCRAPING (Enhanced)
      try {
        const targetUrl = new URL(contextData.website.startsWith('http') ? contextData.website : `https://${contextData.website}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(targetUrl.href, {
          method: 'GET',
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const html = await response.text();
        const headers = Object.fromEntries(response.headers.entries());
        
        siteAnalysis = analyzeSiteContent(html, headers);
        log('✅', `Website scraped. Title: ${siteAnalysis.business_signals.title}, H1s: ${siteAnalysis.business_signals.h1.length}, H2s: ${siteAnalysis.business_signals.h2.length}`);
        
      } catch (e) {
        log('⚠️', `Website scraping failed: ${e.message}`);
      }
      
      // 2. LINKEDIN SCRAPING (NEW - Enhanced)
      if (contextData.linkedin && tavilyKey) {
        linkedinData = await scrapeLinkedIn(contextData.linkedin, tavilyKey);
        if (linkedinData) {
          log('✅', `LinkedIn data: ${linkedinData.employee_count || 'unknown'} employees, ${linkedinData.industry || 'unknown industry'}`);
        }
      }
      
      // 3. EXTERNAL SEARCH (Tavily) - Enhanced query
      if (tavilyKey) {
        try {
          const hostname = new URL(contextData.website).hostname.replace('www.', '');
          const query = `"${hostname}" company revenue customers pricing business model`;
          
          const search = await fetch("https://api.tavily.com/search", {
            method: "POST", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              api_key: tavilyKey, 
              query, 
              search_depth: "advanced", 
              max_results: 5,
              include_answer: true
            })
          });

          if (search.ok) {
            const data = await search.json();
            if (data.answer) externalInsights += `[EXTERNAL SEARCH]: ${data.answer}\n`;
            if (data.results?.length) {
              const relevantResults = data.results
                .filter(r => !r.url.includes('linkedin.com')) // Avoid duplicate LinkedIn info
                .slice(0, 3);
              if (relevantResults.length > 0) {
                externalInsights += `[ADDITIONAL CONTEXT]: ${relevantResults.map(r => r.content).join(' | ').slice(0, 800)}\n`;
              }
            }
          }
        } catch(e) { 
          log('⚠️', 'External search failed:', e.message); 
        }
      }
      
      // 4. BUILD CONTEXT INJECTION (Enhanced)
      systemContextInjection = `
═══════════════════════════════════════════════
[BUSINESS INTELLIGENCE DATA - DETAILED]
═══════════════════════════════════════════════

`;

      // User Description (highest priority)
      if (contextData.description) {
         systemContextInjection += `🚨 USER DESCRIPTION (ABSOLUTE TRUTH):
"${contextData.description}"
>>> Trust this above ALL other data. If it contradicts scraped data, user description wins.

`;
      }

      // Website Data (enhanced)
      if (siteAnalysis) {
         systemContextInjection += `📊 WEBSITE ANALYSIS:
- URL: ${contextData.website}
- Title: ${siteAnalysis.business_signals.title || 'Not found'}
- Meta Description: ${siteAnalysis.business_signals.description || 'Not found'}

VALUE PROPOSITIONS (H1 tags):
${siteAnalysis.business_signals.h1.length > 0 ? siteAnalysis.business_signals.h1.map(h => `  • "${h}"`).join('\n') : '  • None found'}

FEATURES/SERVICES (H2 tags):
${siteAnalysis.business_signals.h2.length > 0 ? siteAnalysis.business_signals.h2.map(h => `  • "${h}"`).join('\n') : '  • None found'}

KEY CONTENT (First paragraphs):
${siteAnalysis.business_signals.paragraphs.length > 0 ? siteAnalysis.business_signals.paragraphs.map(p => `  • "${p.slice(0, 150)}..."`).join('\n') : '  • None extracted'}

PRICING SIGNALS: ${siteAnalysis.business_signals.pricing_signals.length > 0 ? siteAnalysis.business_signals.pricing_signals.join(', ') : 'None found'}

SOCIAL PROOF: ${siteAnalysis.business_signals.social_proof.length > 0 ? siteAnalysis.business_signals.social_proof.join(' | ') : 'None found'}

TECH STACK DETECTED: ${siteAnalysis.technologies.length > 0 ? siteAnalysis.technologies.join(', ') : 'Standard/Unknown'}

`;
      }

      // LinkedIn Data (NEW)
      if (linkedinData) {
        systemContextInjection += `👔 LINKEDIN DATA:
- Company Name: ${linkedinData.company_name}
- Employee Count: ${linkedinData.employee_count || 'Unknown'}
- Industry: ${linkedinData.industry || 'Unknown'}
- Description: ${linkedinData.description || 'Not available'}

`;
      }

      // External Insights
      if (externalInsights) {
        systemContextInjection += `🔍 EXTERNAL INTELLIGENCE:
${externalInsights}
`;
      }
      
      systemContextInjection += `═══════════════════════════════════════════════
`;
    }

    // Extract previous options for button memory
    const previousOptions = extractPreviousOptions(history);

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
      
      // Updated finish logic - stricter requirements
      confidence.ready_for_finish = 
        confidence.total_score >= CONFIDENCE_THRESHOLD && 
        turnCount >= MIN_TURNS_FOR_FINISH &&
        confidence.pillar3_diagnosis.score >= MIN_DIAGNOSIS_SCORE &&
        !sessionContext.userRequestedCorrection;
    };
    
    recalculate();

    // ═══════════════════════════════════════════════════════════════
    // BUILD SYSTEM PROMPT
    // ═══════════════════════════════════════════════════════════════
    const SYSTEM_PROMPT = buildSystemPrompt(
      systemContextInjection, 
      confidence, 
      turnCount, 
      previousOptions,
      sessionContext
    );

    // Build history with context notes
    const historyParts = history.slice(-16).map(msg => {
      let content = msg.content;
      if (msg.role === 'assistant') {
        try { 
          const parsed = JSON.parse(content);
          // Include context note for memory
          content = parsed.message || content;
          if (parsed.context_note) {
            content += `\n[Context learned: ${parsed.context_note}]`;
          }
        } catch {}
      }
      return { role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: content }] };
    });

    // Build user message based on state
    let userText = "";
    const lowestPillar = getLowestPillar(confidence);
    
    if (choice === "SNAPSHOT_INIT") {
      userText = `[SESSION START]
Website: ${contextData?.website}
Description: ${contextData?.description || "None provided"}
LinkedIn: ${contextData?.linkedin || "None provided"}

TASK: Analyze ALL the business intelligence data above and deliver a DETAILED personalized welcome.

REQUIREMENTS:
1. Reference SPECIFIC data points from website scraping (H1s, H2s, pricing, social proof)
2. If LinkedIn data available, mention employee count and industry
3. Make 3-4 SPECIFIC assumptions with evidence ("I noticed X on your site, which suggests Y")
4. End with confirmation: "Did I get this right? What should I correct?"
5. Do NOT mention React, Tailwind, Vercel, or any tech stack`;

    } else if (sessionContext.userRequestedCorrection) {
      userText = `[CONTEXT CORRECTION REQUESTED]
User input: "${choice}"

The user has indicated they want to add context or correct something.
DO NOT offer the report. Instead:
1. Acknowledge their request
2. Ask SPECIFIC follow-up questions about what they want to clarify
3. Be ready to reset assumptions if needed`;

    } else if (confidence.ready_for_finish && !sessionContext.userRequestedCorrection) {
      userText = `[FINISH AVAILABLE - But verify first]
Confidence Score: ${confidence.total_score}/100
Turn Count: ${turnCount}
Diagnosis Score: ${confidence.pillar3_diagnosis.score}/30

User's last input: "${choice}"

ONLY proceed to finish summary if:
1. User did NOT just ask to add context or correct something
2. The response makes sense as a conclusion

If user clicked "add_context" or "correct_something", DO NOT show finish. Ask what they want to add/correct.`;

    } else {
      userText = `[CONTINUE DISCOVERY]
User input: "${choice}"
Current Score: ${confidence.total_score}/100 (need 70 for finish)
Turn Count: ${turnCount}/8 minimum
Lowest Pillar: ${lowestPillar.name} (${lowestPillar.score}/${lowestPillar.max})
Diagnosis Score: ${confidence.pillar3_diagnosis.score}/20 minimum needed

${previousOptions.length > 0 ? `
BUTTON MEMORY - If user says "all of the above" or similar, acknowledge these options:
${previousOptions.map(po => `Previous options: [${po.options.join('] [')}]`).join('\n')}
` : ''}

TASK: 
1. Process user's input meaningfully
2. Provide insight with REAL-WORLD EXAMPLE (this is required)
3. Ask ONE strategic question targeting ${lowestPillar.name}
4. Provide 3-5 SPECIFIC options (never "Continue")
5. If user references "all options" or similar, acknowledge each specifically`;
    }

    const allMessages = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Understood. I am the Revenue Architect. I will:\n1. Always include real-world examples\n2. Reference specific scraped data in welcome\n3. Remember button options shown\n4. NOT offer report if user requests correction\n5. Provide detailed, actionable responses' }] },
      ...historyParts,
      { role: 'user', parts: [{ text: userText }] }
    ];
    
    if (attachment) {
      allMessages[allMessages.length - 1].parts.push({ 
        inline_data: { mime_type: attachment.mime_type, data: attachment.data } 
      });
    }

    // Call Gemini
    log('🤖', `Calling Gemini. Turn: ${turnCount}, Score: ${confidence.total_score}, Correction requested: ${sessionContext.userRequestedCorrection}`);
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: allMessages, 
          generationConfig: { 
            temperature: 0.75, // Slightly higher for more detailed responses
            responseMimeType: "application/json",
            maxOutputTokens: 2048 // Allow longer responses
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
    log('✅', 'Gemini response received, length:', text.length);

    let json;
    try {
      json = JSON.parse(text);
    } catch (parseError) {
      log('❌', 'JSON Parse Error:', text.substring(0, 300));
      throw new Error("Invalid JSON from Gemini");
    }

    // Confidence Update Logic (Cumulative with reductions)
    if (json.confidence_update) {
      const cu = json.confidence_update;
      
      // Handle score reductions for wrong context
      if (sessionContext.userRequestedCorrection && json.step_id === 'context_correction') {
        // Reduce pillar1 scores when context was wrong
        Object.keys(confidence.pillar1_company.items).forEach(key => {
          confidence.pillar1_company.items[key] = Math.floor(confidence.pillar1_company.items[key] * 0.5);
        });
      }
      
      // Normal cumulative updates
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
      log('⚠️', 'No options in response, adding context-aware defaults');
      json.options = [
        { key: "explain_more", label: "Let me explain in more detail" },
        { key: "ask_specific", label: "I have a specific question" },
        { key: "different_angle", label: "Let's approach this differently" }
      ];
    }
    
    // Remove generic options
    const genericKeys = ['continue', 'next', 'ok', 'yes', 'no', 'tell_me_more'];
    json.options = json.options.filter(opt => 
      !genericKeys.includes(opt.key.toLowerCase()) ||
      opt.label.length > 25
    );
    
    // Ensure at least 3 options
    while (json.options.length < 3) {
      json.options.push({ key: "other_thoughts", label: "I have other thoughts to share" });
    }
    
    // Remove duplicates
    const seenKeys = new Set();
    json.options = json.options.filter(opt => {
      if (seenKeys.has(opt.key)) return false;
      seenKeys.add(opt.key);
      return true;
    });

    // CRITICAL: Block finish if user requested correction
    if (sessionContext.userRequestedCorrection) {
      // Force context correction mode, never finish
      if (json.step_id === 'FINISH' || json.step_id === 'pre_finish') {
        log('🚫', 'Blocking finish because user requested correction');
        json.step_id = 'context_correction';
        json.options = [
          { key: "clarify_business", label: "Let me clarify what we do" },
          { key: "clarify_customers", label: "Let me explain our customers" },
          { key: "clarify_problem", label: "The problem I mentioned isn't quite right" },
          { key: "start_fresh", label: "Let's start the diagnosis fresh" }
        ];
      }
    }

    // Finalize response
    json.confidence_state = confidence;
    json.allow_text = json.mode === 'mixed' || json.allow_text !== false;
    
    // Only force FINISH if ALL conditions met and no correction requested
    if (confidence.ready_for_finish && 
        !sessionContext.userRequestedCorrection && 
        json.step_id !== 'context_correction') {
      
      // Double-check the user's last message wasn't a correction request
      const lastUserMessage = choice.toLowerCase();
      const isCorrectionRequest = correctionKeywords.some(kw => lastUserMessage.includes(kw));
      
      if (!isCorrectionRequest) {
        json.step_id = 'FINISH';
        json.options = [
          { key: "download_report", label: "📥 Generate Strategic Growth Plan" },
          { key: "add_context", label: "Wait, I want to add important context" },
          { key: "correct_something", label: "One of those findings isn't quite right" }
        ];
        json.allow_text = false;
      }
    }

    log('📤', `Response: step_id=${json.step_id}, score=${confidence.total_score}, ready=${confidence.ready_for_finish}, correction=${sessionContext.userRequestedCorrection}`);
    return res.status(200).json(json);

  } catch (error) { 
    console.error("Server Error:", error);
    return sendSafeResponse(
      "I encountered a technical issue. Let's continue — tell me about the main challenge you're facing with revenue growth right now.",
      "mixed",
      [
        { key: "lead_generation", label: "Not enough qualified leads" },
        { key: "conversion_issues", label: "Leads aren't converting to customers" },
        { key: "sales_capacity", label: "Can't scale beyond founder selling" },
        { key: "churn_problems", label: "Losing customers too quickly" },
        { key: "something_else", label: "It's a different challenge" }
      ]
    );
  }
}
