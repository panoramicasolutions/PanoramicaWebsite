// ═══════════════════════════════════════════════════════════════
// HELPER: BUSINESS CONTENT ANALYZER (Sostituisce il vecchio TechStack analyzer)
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

  // 1. ESTRAZIONE CONTENUTO DI BUSINESS (Semantica)
  // Estrazione Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) context.business_signals.title = titleMatch[1].trim();

  // Estrazione Meta Description
  const metaDescMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || 
                        html.match(/<meta\s+content="([^"]*)"\s+name="description"/i);
  if (metaDescMatch) context.business_signals.description = metaDescMatch[1].trim();

  // Estrazione H1 (Value Proposition primaria)
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  context.business_signals.h1 = h1Matches.map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 0);

  // Estrazione H2 (Servizi o Features principali)
  const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  context.business_signals.h2 = h2Matches.map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 0).slice(0, 6);

  // 2. TECH STACK (Ridotto a semplice contesto infrastrutturale)
  if (/__react|react-dom|_next/i.test(html)) context.technologies.push('React/Next.js');
  if (/shopify/i.test(html)) context.technologies.push('Shopify');
  if (/wordpress/i.test(html)) context.technologies.push('WordPress');
  if (/webflow/i.test(html)) context.technologies.push('Webflow');
  if (/stripe/i.test(html)) context.technologies.push('Stripe');
  
  return context;
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
      return sendSafeResponse("⚠️ System configuration error: Gemini API Key missing.");
    }

    // ═══════════════════════════════════════════════════════════════
    // CONFIDENCE SCORE SYSTEM
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

    // ═══════════════════════════════════════════════════════════════
    // SNAPSHOT PHASE - BUSINESS CONTEXT EXTRACTION
    // ═══════════════════════════════════════════════════════════════
    if (choice === "SNAPSHOT_INIT" && contextData) {
      log('🔍', 'Analyzing Business Context for:', contextData.website);
      
      let siteAnalysis = null;
      let externalInsights = "";
      
      // 1. WEB SCRAPING (Business Content)
      try {
        const targetUrl = new URL(contextData.website.startsWith('http') ? contextData.website : `https://${contextData.website}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(targetUrl.href, {
          method: 'GET',
          headers: { 
            'User-Agent': 'Mozilla/5.0 (compatible; RevenueArchitect/1.0; +http://yourdomain.com)',
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
        log('⚠️', `Scraping failed (using manual description): ${e.message}`);
      }
      
      // 2. EXTERNAL SEARCH (Tavily) - Se scraping fallisce o per arricchire
      if (tavilyKey) {
        try {
          const query = `"${new URL(contextData.website).hostname}" company business model revenue products`;
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
      
      // 3. COSTRUZIONE CONTESTO AI (Priorità al Business)
      systemContextInjection = `\n═══════════════════════════════════════════════
[BUSINESS INTELLIGENCE DATA]
═══════════════════════════════════════════════\n`;

      // A. INPUT MANUALE UTENTE (Massima priorità)
      if (contextData.user_provided_description || contextData.description) {
         const desc = contextData.user_provided_description || contextData.description;
         systemContextInjection += `🚨 USER MANUAL DESCRIPTION (TRUTH): "${desc}"\n`;
         systemContextInjection += `NOTE: Trust this description above inferred data.\n\n`;
      }

      // B. DATI DAL SITO
      if (siteAnalysis) {
         systemContextInjection += `WEBSITE TITLE: ${siteAnalysis.business_signals.title}\n`;
         systemContextInjection += `META DESCRIPTION: ${siteAnalysis.business_signals.description}\n`;
         if (siteAnalysis.business_signals.h1.length > 0) {
             systemContextInjection += `PRIMARY VALUE PROP (H1): ${siteAnalysis.business_signals.h1.join(' | ')}\n`;
         }
         if (siteAnalysis.business_signals.h2.length > 0) {
             systemContextInjection += `KEY OFFERINGS (H2): ${siteAnalysis.business_signals.h2.join(' | ')}\n`;
         }
         // Tech stack declassato a nota a margine
         if (siteAnalysis.technologies.length > 0) {
             systemContextInjection += `INFRASTRUCTURE (Ignore unless relevant to scaling): ${siteAnalysis.technologies.join(', ')}\n`;
         }
      }

      // C. DATI ESTERNI
      if (externalInsights) {
          systemContextInjection += `\n${externalInsights}`;
      }
      
      systemContextInjection += `\n═══════════════════════════════════════════════\n`;
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
    // SYSTEM PROMPT
    // ═══════════════════════════════════════════════════════════════
    const SYSTEM_PROMPT = `
You are the Revenue Architect, a strategic advisor for B2B companies.
Your goal is to diagnose revenue bottlenecks, NOT check code quality.

CONTEXT:
${systemContextInjection}

INSTRUCTIONS:
1. If the User Description is present, use it as the absolute truth about what the company does.
2. If "panoramica-website" or "vercel.app" appears, do NOT treat it as a tech project. Treat it as a LIVE BUSINESS based on the user's description.
3. Ignore technical details (React, CSS, Vercel) unless the user asks about site performance impacting revenue.
4. Focus entirely on: Business Model, Pricing, Sales Channels, and Customer Retention.

CONFIDENCE SCORING SYSTEM (Current Score: ${confidence.total_score}/100):
- Pillar 1: Company Context (Stage, Revenue, Team)
- Pillar 2: Go-To-Market (Sales Motion, ICP, Channels)
- Pillar 3: Diagnosis (Pain Points, Root Causes) - FOCUS HERE
- Pillar 4: Solution (Validation, Next Steps)

OUTPUT FORMAT (JSON ONLY):
{
  "step_id": "diagnostic",
  "message": "Strategic question or insight...",
  "mode": "mixed",
  "options": [{"key": "...", "label": "..."}],
  "confidence_update": { ... }
}

CRITICAL: ALWAYS Provide 3-4 specific, clickable options. Never generic "Continue".
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
Website: ${contextData?.website}
Description Provided: ${contextData?.description || "None"}

Please analyze the business context provided above.
1. Acknowledge what the company does based on the Description or Titles.
2. Do NOT mention React, Tailwind, or code.
3. Ask the first strategic question to clarify the Revenue Model or Company Stage.
4. Provide options like: Pre-Revenue, <$1M ARR, $1M-$10M ARR, $10M+`;
    } else if (confidence.ready_for_finish) {
      userText = `[FINISH REQUIRED]
Score: ${confidence.total_score}. Summarize findings and offer the Strategic Growth Plan download.`;
    } else {
      userText = `[CONTINUE] User selected: "${choice}". Update scores, identify the missing information (lowest pillar), and ask the next strategic question.`;
    }

    const allMessages = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Understood. I am the Revenue Architect. I will focus on business strategy, ignore tech stack details, and use the user-provided description as truth.' }] },
      ...historyParts,
      { role: 'user', parts: [{ text: userText }] }
    ];
    
    if (attachment) {
      allMessages[allMessages.length - 1].parts.push({ 
        inline_data: { mime_type: attachment.mime_type, data: attachment.data } 
      });
    }

    // Call Gemini
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

    if (!geminiResponse.ok) throw new Error("Gemini API Error");

    const data = await geminiResponse.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const json = JSON.parse(text);

    // Confidence Update Logic (Cumulative)
    if (json.confidence_update) {
       const cu = json.confidence_update;
       // ... (Logica di aggiornamento identica a prima) ...
       // (Per brevità, assumiamo che l'aggiornamento dei punteggi avvenga qui come nel codice precedente)
       if (cu.pillar1_company) Object.assign(confidence.pillar1_company.items, cu.pillar1_company);
       if (cu.pillar2_gtm) Object.assign(confidence.pillar2_gtm.items, cu.pillar2_gtm);
       if (cu.pillar3_diagnosis) Object.assign(confidence.pillar3_diagnosis.items, cu.pillar3_diagnosis);
       if (cu.pillar4_solution) Object.assign(confidence.pillar4_solution.items, cu.pillar4_solution);
    }
    
    recalculate();

    // Ensure options exist
    if (!json.options || json.options.length === 0) {
      json.options = [
        { key: "continue", label: "Continue" },
        { key: "clarify", label: "Let me explain more" }
      ];
    }

    // Finalize response
    json.confidence_state = confidence;
    if (confidence.ready_for_finish || json.step_id === 'FINISH') {
        json.step_id = 'FINISH';
        json.options = [{ key: "download_report", label: "📥 Download Strategic Growth Plan" }];
    }

    return res.status(200).json(json);

  } catch (error) { 
    console.error("Server Error:", error);
    return sendSafeResponse("I'm analyzing the data but hit a snag. Let's continue manually.", "mixed", [{ key: "continue", label: "Continue" }]); 
  }
}
