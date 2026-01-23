// Tech Stack Analysis Helper Function (defined at module level)
function analyzeTechStack(html, headers) {
  const technologies = [];
  
  // Frontend
  if (/__react|react-dom|data-reactroot|_next/i.test(html)) technologies.push('React');
  if (/_next/i.test(html)) technologies.push('Next.js');
  if (/vue\.js|__vue__|data-v-/i.test(html)) technologies.push('Vue.js');
  if (/nuxt/i.test(html)) technologies.push('Nuxt.js');
  if (/ng-version|angular/i.test(html)) technologies.push('Angular');
  if (/svelte/i.test(html)) technologies.push('Svelte');
  if (/tailwind|class="[^"]*\b(flex|px-|py-|mt-|bg-)/i.test(html)) technologies.push('Tailwind CSS');
  if (/bootstrap/i.test(html)) technologies.push('Bootstrap');
  
  // CMS
  if (/wp-content|wordpress/i.test(html)) technologies.push('WordPress');
  if (/shopify|cdn\.shopify/i.test(html)) technologies.push('Shopify');
  if (/webflow/i.test(html)) technologies.push('Webflow');
  if (/wix\.com/i.test(html)) technologies.push('Wix');
  if (/squarespace/i.test(html)) technologies.push('Squarespace');
  if (/hubspot/i.test(html)) technologies.push('HubSpot');
  if (/framer/i.test(html)) technologies.push('Framer');
  
  // Analytics
  if (/google-analytics|gtag|googletagmanager/i.test(html)) technologies.push('Google Analytics');
  if (/segment\.com/i.test(html)) technologies.push('Segment');
  if (/mixpanel/i.test(html)) technologies.push('Mixpanel');
  if (/amplitude/i.test(html)) technologies.push('Amplitude');
  if (/hotjar/i.test(html)) technologies.push('Hotjar');
  if (/posthog/i.test(html)) technologies.push('PostHog');
  
  // Marketing
  if (/intercom/i.test(html)) technologies.push('Intercom');
  if (/drift/i.test(html)) technologies.push('Drift');
  if (/crisp/i.test(html)) technologies.push('Crisp');
  if (/zendesk/i.test(html)) technologies.push('Zendesk');
  if (/calendly/i.test(html)) technologies.push('Calendly');
  
  // Payments
  if (/stripe/i.test(html)) technologies.push('Stripe');
  if (/paypal/i.test(html)) technologies.push('PayPal');
  if (/paddle/i.test(html)) technologies.push('Paddle');
  
  // Hosting/CDN
  if (headers && (headers['server']?.includes('cloudflare') || headers['cf-ray'])) technologies.push('Cloudflare');
  if (headers && headers['x-vercel-id'] || /vercel/i.test(html)) technologies.push('Vercel');
  if (headers && headers['x-netlify'] || /netlify/i.test(html)) technologies.push('Netlify');
  if (/firebase/i.test(html)) technologies.push('Firebase');
  if (/supabase/i.test(html)) technologies.push('Supabase');
  if (/aws|amazon/i.test(html)) technologies.push('AWS');
  
  // Auth
  if (/auth0/i.test(html)) technologies.push('Auth0');
  if (/clerk/i.test(html)) technologies.push('Clerk');
  
  // Determine stack type
  let stackType = 'Custom';
  if (technologies.includes('WordPress')) stackType = 'WordPress';
  else if (technologies.includes('Shopify')) stackType = 'Shopify E-commerce';
  else if (technologies.includes('Next.js')) stackType = 'Next.js (JAMstack)';
  else if (technologies.includes('React')) stackType = 'React SPA';
  else if (technologies.includes('Vue.js')) stackType = 'Vue.js Application';
  else if (technologies.some(t => ['Webflow', 'Wix', 'Squarespace', 'Framer'].includes(t))) stackType = 'No-Code Platform';
  
  return {
    technologies: [...new Set(technologies)],
    stack_type: stackType,
    summary: `${stackType} stack with ${technologies.length} detected technologies: ${technologies.slice(0, 5).join(', ')}${technologies.length > 5 ? '...' : ''}`
  };
}

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
      options: options.length > 0 ? options : [{ key: "continue", label: "Continue" }]
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
      return sendSafeResponse("⚠️ System configuration error.");
    }

    // ═══════════════════════════════════════════════════════════════
    // CONFIDENCE SCORE SYSTEM - 4 PILLARS (100 points total)
    // ═══════════════════════════════════════════════════════════════
    const CONFIDENCE_THRESHOLD = 80;
    const HARD_TURN_CAP = 15;
    const turnCount = history.filter(h => h.role === 'user').length;
    
    // Initialize or restore confidence state
    let confidence = confidenceState || {
      pillar1_company: { score: 0, max: 25, items: { stage: 0, revenue: 0, team: 0 } },
      pillar2_gtm: { score: 0, max: 25, items: { motion: 0, icp: 0, channels: 0 } },
      pillar3_diagnosis: { score: 0, max: 30, items: { pain_point: 0, root_cause: 0, factors: 0 } },
      pillar4_solution: { score: 0, max: 20, items: { validated: 0, next_steps: 0, recommendations: 0 } },
      total_score: 0,
      ready_for_finish: false
    };

    let systemContextInjection = "";

    // SNAPSHOT PHASE - WEB ANALYSIS + TECH STACK
    if (choice === "SNAPSHOT_INIT" && contextData) {
      log('🔍', 'Analyzing:', contextData.website);
      
      let techStackData = null;
      
      // Tech Stack Analysis
      try {
        const targetUrl = new URL(contextData.website.startsWith('http') ? contextData.website : `https://${contextData.website}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(targetUrl.href, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TechStackBot/1.0)', 'Accept': 'text/html' },
          signal: controller.signal,
          redirect: 'follow'
        });
        clearTimeout(timeoutId);
        
        const html = await response.text();
        const headers = Object.fromEntries(response.headers.entries());
        
        techStackData = analyzeTechStack(html, headers);
        log('✅', `Tech stack: ${techStackData.summary}`);
        
      } catch (e) {
        log('⚠️', `Tech stack analysis failed: ${e.message}`);
      }
      
      // Tavily Search
      if (tavilyKey) {
        try {
          const query = `"${new URL(contextData.website).hostname}" company business model products pricing`;
          const search = await fetch("https://api.tavily.com/search", {
            method: "POST", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              api_key: tavilyKey, 
              query, 
              search_depth: "advanced", 
              max_results: 6,
              include_answer: true
            })
          });

          if (search.ok) {
            const data = await search.json();
            let insights = "";
            if (data.answer) insights += `[SUMMARY]: ${data.answer}\n\n`;
            if (data.results?.length) {
              insights += data.results.map(r => `[${r.title}]: ${r.content}`).join('\n\n');
            }
            if (insights) {
              systemContextInjection = `\n[MARKET INTELLIGENCE for ${contextData.website}]:\n${insights}\n`;
              confidence.pillar1_company.items.stage = 3;
              confidence.pillar2_gtm.items.icp = 3;
            }
          }
        } catch(e) { 
          log('⚠️', 'Tavily search failed:', e.message); 
        }
      }
      
      // Add tech stack to context
      if (techStackData) {
        systemContextInjection += `\n[TECH STACK ANALYSIS]:\n${JSON.stringify(techStackData, null, 2)}\n`;
        // Add tech stack confidence boost
        if (techStackData.technologies?.length > 3) {
          confidence.pillar1_company.items.stage = Math.max(confidence.pillar1_company.items.stage, 5);
        }
      }
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
    log('📊', `Confidence: ${confidence.total_score}/100 (Threshold: ${CONFIDENCE_THRESHOLD})`);

    // ═══════════════════════════════════════════════════════════════
    // SYSTEM PROMPT WITH DYNAMIC SCORING
    // ═══════════════════════════════════════════════════════════════
    const SYSTEM_PROMPT = `
═══════════════════════════════════════════════════════════════════════════════
REVENUE ARCHITECT - DYNAMIC CONFIDENCE SCORING v4.0
═══════════════════════════════════════════════════════════════════════════════

You are a world-class Revenue Operations strategist conducting a diagnostic.
The conversation continues until CONFIDENCE SCORE >= 80/100.

═══════════════════════════════════════════════════════════════════════════════
CONFIDENCE SCORING SYSTEM
═══════════════════════════════════════════════════════════════════════════════

Track these 4 PILLARS. Focus questions on the LOWEST scoring pillar.

PILLAR 1: COMPANY CONTEXT (25 pts max)
├─ stage (0-10): Company stage identified
│  0=unknown, 5=vague, 10=specific (Series A, $5M ARR)
├─ revenue (0-8): ARR/MRR known
│  0=unknown, 4=range, 8=specific
└─ team (0-7): Team structure understood
   0=unknown, 3=size, 7=breakdown

PILLAR 2: GO-TO-MARKET (25 pts max)
├─ motion (0-10): Sales motion identified
│  0=unknown, 5=general, 10=specific
├─ icp (0-8): ICP clear
│  0=unknown, 4=vertical, 8=detailed
└─ channels (0-7): Channels understood
   0=unknown, 3=primary, 7=full mix

PILLAR 3: DIAGNOSIS (30 pts max) ← MOST IMPORTANT
├─ pain_point (0-12): Pain identified
│  0=unknown, 6=symptom, 12=specific+measurable
├─ root_cause (0-10): Root cause found
│  0=unknown, 5=likely, 10=confirmed
└─ factors (0-8): Contributing factors
   0=unknown, 4=one, 8=multiple

PILLAR 4: SOLUTION READY (20 pts max)
├─ validated (0-10): Client validated
│  0=no, 5=partial, 10=full agreement
├─ next_steps (0-5): Can recommend
└─ recommendations (0-5): Ready to advise

═══════════════════════════════════════════════════════════════════════════════
CURRENT STATE
═══════════════════════════════════════════════════════════════════════════════
${JSON.stringify(confidence, null, 2)}

TOTAL: ${confidence.total_score}/100 | THRESHOLD: ${CONFIDENCE_THRESHOLD} | TURN: ${turnCount}/${HARD_TURN_CAP}
READY FOR FINISH: ${confidence.ready_for_finish}

═══════════════════════════════════════════════════════════════════════════════
DIAGNOSTIC DECISION TREES
═══════════════════════════════════════════════════════════════════════════════

Use these to diagnose efficiently:

IF "Pipeline/Leads" problem:
→ "VOLUME (not enough) or QUALITY (don't convert)?"

IF "Sales Closing" problem:
→ "PROCESS issue (deals stall) or CAPABILITY (reps can't execute)?"

IF "Retention" problem:
→ "Concentrated in SEGMENT or TIME PERIOD?"

IF "Scaling" problem:
→ "What breaks first: HIRING, PROCESS, or DATA?"

═══════════════════════════════════════════════════════════════════════════════
BENCHMARKS TO REFERENCE
═══════════════════════════════════════════════════════════════════════════════
- NRR: 100-120% good, 120%+ excellent
- CAC Payback: <18mo healthy, <12mo excellent
- LTV:CAC: 3:1 minimum, 5:1+ excellent
- Win Rate: 15-25% typical, 30%+ strong
- Sales Cycle: <$15K=14-30d, $15-50K=30-90d, $50K+=90-180d

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (CRITICAL - MUST FOLLOW EXACTLY)
═══════════════════════════════════════════════════════════════════════════════

Respond ONLY with valid JSON:

{
  "step_id": "diagnostic" | "validation" | "FINISH",
  "message": "markdown string with your response",
  "mode": "mixed",
  "options": [
    {"key": "option_1_snake_case", "label": "First option for user to click"},
    {"key": "option_2_snake_case", "label": "Second option"},
    {"key": "option_3_snake_case", "label": "Third option"},
    {"key": "option_4_snake_case", "label": "Fourth option (optional)"}
  ],
  "confidence_update": {
    "pillar1_company": {"stage": N, "revenue": N, "team": N},
    "pillar2_gtm": {"motion": N, "icp": N, "channels": N},
    "pillar3_diagnosis": {"pain_point": N, "root_cause": N, "factors": N},
    "pillar4_solution": {"validated": N, "next_steps": N, "recommendations": N}
  },
  "reasoning": "Brief explanation of score changes"
}

CRITICAL RULES:
1. ALWAYS include 3-4 options in the "options" array - NEVER leave it empty
2. Options should be specific choices related to your question, NOT generic "continue"
3. Each option needs both "key" (snake_case) and "label" (user-friendly text)
4. ALWAYS include confidence_update with current scores
5. Only INCREASE scores (information is cumulative)
6. When total >= ${CONFIDENCE_THRESHOLD}: step_id = "FINISH"
7. At FINISH: options = [{"key": "download_report", "label": "📥 Download Strategic Growth Plan"}]
8. Turn >= ${HARD_TURN_CAP}: FORCE FINISH

EXAMPLE OPTIONS FORMAT:
- For company stage: [{"key": "seed_stage", "label": "Seed/Pre-seed"}, {"key": "series_a", "label": "Series A"}, ...]
- For problems: [{"key": "pipeline_issue", "label": "Not enough leads"}, {"key": "conversion_issue", "label": "Low conversion rate"}, ...]
- For yes/no: [{"key": "yes_correct", "label": "Yes, that's right"}, {"key": "partially", "label": "Partially correct"}, {"key": "no_different", "label": "No, it's different"}]

COMMUNICATION: Senior consultant tone, explain WHY you ask, reference benchmarks naturally.
`;

    // Build history
    const historyParts = history.slice(-14).map(msg => {
      let content = msg.content;
      if (msg.role === 'assistant') {
        try { content = JSON.parse(content).message || content; } catch {}
      }
      return { role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: content }] };
    });

    // Build user message
    let userText = "";
    if (choice === "SNAPSHOT_INIT") {
      userText = `[SESSION START]
Website: ${contextData?.website || 'Not provided'}
LinkedIn: ${contextData?.linkedin || 'Not provided'}

${systemContextInjection || '[No external data available - proceed with questions]'}

YOUR TASK:
1. Welcome the client professionally
2. If web data available, mention ONE specific insight about their business
3. Ask your FIRST diagnostic question (target the lowest-confidence pillar)
4. IMPORTANT: Provide exactly 3-4 clickable options for the user to choose from

Example response format:
{
  "message": "Welcome! I've analyzed [company]. I noticed [insight]. To understand your situation better, what's your current company stage?",
  "options": [
    {"key": "pre_seed", "label": "Pre-seed / Bootstrapped"},
    {"key": "seed", "label": "Seed ($500K-$2M raised)"},
    {"key": "series_a", "label": "Series A ($2M-$15M raised)"},
    {"key": "series_b_plus", "label": "Series B+ or Profitable"}
  ],
  ...
}`;
    } else if (confidence.ready_for_finish) {
      userText = `[FINISH REQUIRED]
User input: "${choice}"
Current Score: ${confidence.total_score}/100

REQUIRED ACTIONS:
1. Summarize key findings from the diagnostic
2. Set step_id to "FINISH"
3. Preview what the Strategic Growth Plan will contain
4. Provide ONLY the download option: [{"key": "download_report", "label": "📥 Download Strategic Growth Plan"}]`;
    } else {
      userText = `[CONTINUE DIAGNOSTIC]
User selected: "${choice}"
Turn: ${turnCount}/${HARD_TURN_CAP}
Current Score: ${confidence.total_score}/100

ANALYZE & RESPOND:
1. What new information did this response provide?
2. Update confidence scores based on new info
3. Identify the LOWEST scoring pillar that needs attention
4. Ask a strategic question targeting that gap
5. IMPORTANT: Provide 3-4 specific, clickable options for the user

Remember: Each option should be a meaningful choice, not generic "continue" buttons.`;
    }

    const allMessages = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Ready. I will track confidence across 4 pillars, focus on lowest-scoring areas, and finish when score >= 80.' }] },
      ...historyParts,
      { role: 'user', parts: [{ text: userText }] }
    ];
    
    if (attachment) {
      allMessages[allMessages.length - 1].parts.push({ 
        inline_data: { mime_type: attachment.mime_type, data: attachment.data } 
      });
    }

    // Call Gemini
    log('📤', `Gemini call (Turn ${turnCount}, Score: ${confidence.total_score})`);
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiKey}`,
      {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: allMessages, 
          generationConfig: { 
            temperature: 0.7, topP: 0.9, maxOutputTokens: 2048,
            responseMimeType: "application/json"
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      }
    );

    if (!geminiResponse.ok) {
      return sendSafeResponse("Technical issue. Retrying...", "mixed", [{ key: "retry", label: "Retry" }], confidence);
    }

    const data = await geminiResponse.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return sendSafeResponse("No response. Retrying...", "mixed", [{ key: "retry", label: "Retry" }], confidence);
    }
    
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // Parse response
    try {
      const json = JSON.parse(text);
      
      // Process confidence update (only increase)
      if (json.confidence_update) {
        const cu = json.confidence_update;
        if (cu.pillar1_company) {
          confidence.pillar1_company.items.stage = Math.max(confidence.pillar1_company.items.stage, cu.pillar1_company.stage || 0);
          confidence.pillar1_company.items.revenue = Math.max(confidence.pillar1_company.items.revenue, cu.pillar1_company.revenue || 0);
          confidence.pillar1_company.items.team = Math.max(confidence.pillar1_company.items.team, cu.pillar1_company.team || 0);
        }
        if (cu.pillar2_gtm) {
          confidence.pillar2_gtm.items.motion = Math.max(confidence.pillar2_gtm.items.motion, cu.pillar2_gtm.motion || 0);
          confidence.pillar2_gtm.items.icp = Math.max(confidence.pillar2_gtm.items.icp, cu.pillar2_gtm.icp || 0);
          confidence.pillar2_gtm.items.channels = Math.max(confidence.pillar2_gtm.items.channels, cu.pillar2_gtm.channels || 0);
        }
        if (cu.pillar3_diagnosis) {
          confidence.pillar3_diagnosis.items.pain_point = Math.max(confidence.pillar3_diagnosis.items.pain_point, cu.pillar3_diagnosis.pain_point || 0);
          confidence.pillar3_diagnosis.items.root_cause = Math.max(confidence.pillar3_diagnosis.items.root_cause, cu.pillar3_diagnosis.root_cause || 0);
          confidence.pillar3_diagnosis.items.factors = Math.max(confidence.pillar3_diagnosis.items.factors, cu.pillar3_diagnosis.factors || 0);
        }
        if (cu.pillar4_solution) {
          confidence.pillar4_solution.items.validated = Math.max(confidence.pillar4_solution.items.validated, cu.pillar4_solution.validated || 0);
          confidence.pillar4_solution.items.next_steps = Math.max(confidence.pillar4_solution.items.next_steps, cu.pillar4_solution.next_steps || 0);
          confidence.pillar4_solution.items.recommendations = Math.max(confidence.pillar4_solution.items.recommendations, cu.pillar4_solution.recommendations || 0);
        }
      }
      
      recalculate();
      log('📊', `Updated: ${confidence.total_score}/100`);

      // Validate response
      if (!json.message) json.message = "Processing...";
      json.mode = 'mixed';
      
      // Handle options - ALWAYS ensure we have meaningful options
      if (!json.options || !Array.isArray(json.options) || json.options.length === 0) {
        // Generate contextual default options based on confidence state
        if (confidence.ready_for_finish) {
          json.options = [{ key: "download_report", label: "📥 Download Strategic Growth Plan" }];
        } else if (confidence.pillar1_company.score < 10) {
          // Need more company info
          json.options = [
            { key: "early_stage", label: "We're early stage (Pre-seed/Seed)" },
            { key: "growth_stage", label: "We're in growth mode (Series A/B)" },
            { key: "established", label: "We're established ($10M+ ARR)" },
            { key: "tell_more", label: "Let me explain our situation" }
          ];
        } else if (confidence.pillar2_gtm.score < 10) {
          // Need GTM info
          json.options = [
            { key: "inbound_led", label: "Mostly inbound/content marketing" },
            { key: "outbound_led", label: "Outbound sales driven" },
            { key: "product_led", label: "Product-led growth (PLG)" },
            { key: "mixed_motion", label: "Mix of multiple channels" }
          ];
        } else if (confidence.pillar3_diagnosis.score < 15) {
          // Need diagnosis info
          json.options = [
            { key: "pipeline_problem", label: "Pipeline/lead generation issues" },
            { key: "conversion_problem", label: "Conversion/close rate issues" },
            { key: "retention_problem", label: "Churn/retention issues" },
            { key: "scaling_problem", label: "Scaling/capacity issues" }
          ];
        } else {
          // Generic continue options
          json.options = [
            { key: "continue", label: "Continue diagnostic" },
            { key: "clarify", label: "Let me clarify something" },
            { key: "different_topic", label: "Ask about something else" }
          ];
        }
      } else {
        // Clean up existing options
        json.options = json.options.map((o, i) => ({ 
          key: o.key || `opt_${i}`, 
          label: o.label || "Continue" 
        }));
      }

      // Force FINISH if ready
      if (confidence.ready_for_finish || json.step_id === 'FINISH') {
        json.step_id = 'FINISH';
        json.options = [{ key: "download_report", label: "📥 Download Strategic Growth Plan" }];
        
        if (!json.message.includes('Strategic Growth Plan')) {
          json.message += `\n\n**Diagnostic Complete** (Confidence: ${confidence.total_score}%)\n\nYour Strategic Growth Plan includes:\n- Executive summary\n- Root cause analysis\n- 30/60/90 day action plan\n- KPIs and success metrics\n- Risk mitigation\n\nClick below to download.`;
        }
      }
      
      json.confidence_state = confidence;
      return res.status(200).json(json);

    } catch (e) { 
      log('❌', 'Parse error:', e.message);
      return sendSafeResponse(text.substring(0, 400), "mixed", [{ key: "continue", label: "Continue" }], confidence);
    }

  } catch (error) { 
    console.error("Server Error:", error);
    return sendSafeResponse("Error occurred. Try again.", "mixed", [{ key: "retry", label: "Retry" }]); 
  }
}
