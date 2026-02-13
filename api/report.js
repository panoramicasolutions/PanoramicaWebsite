// ═══════════════════════════════════════════════════════════════════════════════
// REPORT API - /api/report.js (v9)
// 
// Generates a comprehensive, deeply technical Strategic Growth Plan.
// Uses Gemini with an extensive system prompt incorporating real frameworks.
// ═══════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { history = [], sessionData, diagnosticData } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return res.status(500).json({ error: 'API key missing' });

    // ── Build comprehensive profile context ──
    let profileCtx = 'NO PROFILE DATA AVAILABLE';
    if (sessionData?.profile) {
      const p = sessionData.profile;
      profileCtx = `
═══ COMPANY DNA ═══
Company: ${p.companyName || 'Unknown'}
Website: ${p.website || 'N/A'}
Industry: ${p.industry || 'Unknown'}
Business Model: ${p.businessModel || 'Unknown'}
Stage: ${p.stage || 'Unknown'}
Revenue: ${p.revenue || 'Unknown'}
Revenue Growth: ${p.revenueGrowth || 'Unknown'}
Team Size: ${p.teamSize || 'Unknown'}
Team Roles: ${p.teamRoles || 'Unknown'}
Funding: ${p.funding || 'Unknown'}
Runway: ${p.runway || 'Unknown'}

═══ PRODUCT & PRICING ═══
Product: ${p.productDescription || 'Unknown'}
Pricing Model: ${p.pricingModel || 'Unknown'}
Pricing Range: ${p.pricingRange || 'Unknown'}

═══ IDEAL CUSTOMER PROFILE ═══
Buyer Title: ${p.icpTitle || 'Unknown'}
Company Size: ${p.icpCompanySize || 'Unknown'}
Industry: ${p.icpIndustry || 'Unknown'}
Pain Points: ${p.icpPainPoints || 'Unknown'}

═══ GO-TO-MARKET ═══
Sales Motion: ${p.salesMotion || 'Unknown'}
Channels: ${p.channels || 'Unknown'}
Best Channel: ${p.bestChannel || 'Unknown'}
Average Deal Size: ${p.avgDealSize || 'Unknown'}
Sales Cycle: ${p.salesCycle || 'Unknown'}
CAC: ${p.cac || 'Unknown'}
LTV: ${p.ltv || 'Unknown'}

═══ SALES ENGINE ═══
Sales Process: ${p.salesProcess || 'Unknown'}
Process Documented: ${p.processDocumented || 'Unknown'}
Who Closes: ${p.whoCloses || 'Unknown'}
Founder Involvement: ${p.founderInvolvement || 'Unknown'}
Win Rate: ${p.winRate || 'Unknown'}
Main Bottleneck: ${p.mainBottleneck || 'Unknown'}
Lost Deal Reasons: ${p.lostDealReasons || 'Unknown'}
Churn Rate: ${p.churnRate || 'Unknown'}
CRM/Tools: ${p.crm || p.tools || 'Unknown'}

═══ DIAGNOSIS ═══
Diagnosed Problems: ${(p.diagnosedProblems || []).join(' | ') || 'Not diagnosed'}
Root Causes: ${(p.rootCauses || []).join(' | ') || 'Unknown'}
Validated Problems: ${(p.validatedProblems || []).join(' | ') || 'Unknown'}
User Priority: ${p.userPriority || 'Unknown'}
Past Attempts: ${p.pastAttempts || 'Unknown'}
Constraints: ${p.constraints || 'Unknown'}
Additional Context: ${p.additionalContext || 'None'}`;
    }

    // ── Build conversation log ──
    let convLog = '';
    if (sessionData?.turnLog?.length > 0) {
      convLog = '\n═══ CONVERSATION LOG ═══\n' + sessionData.turnLog.join('\n');
    }

    // ── Scraped data ──
    let scrapedData = '';
    if (sessionData?.scrapedSummary) {
      scrapedData = '\n═══ SCRAPED WEBSITE DATA ═══\n' + sessionData.scrapedSummary;
    }

    const companyName = sessionData?.profile?.companyName || 'Company';
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // ── Detect language from conversation ──
    const langHint = sessionData?.turnLog?.some(l => /(?:bene|corretto|azienda|vendite|problema)/i.test(l))
      ? 'The user spoke ITALIAN in the conversation. Write the ENTIRE report in Italian.'
      : 'Write in the same language the user used. Default to English if unclear.';

    const prompt = `You are generating a premium Strategic Growth Plan for ${companyName}.

ROLE: You are a senior partner at a tier-1 management consulting firm (McKinsey / Bain / BCG caliber) who specializes in B2B revenue operations. You have 20+ years of experience scaling SaaS and technology companies. Your reports are known for being brutally specific, actionable, and grounded in real data.

OUTPUT FORMAT: Pure Markdown text. NO JSON wrapper. NO code fences around the whole output. Just clean Markdown.

LANGUAGE: ${langHint}

═══ ALL DATA COLLECTED DURING THE DIAGNOSTIC ═══
${profileCtx}
${scrapedData}
${convLog}

═══ FRAMEWORKS TO APPLY ═══
- MEDDPICC for sales process evaluation
- Bow-Tie Funnel for full revenue lifecycle (Awareness → Acquisition → Activation → Revenue → Retention → Expansion)
- T2D3 growth model for SaaS benchmarking
- SaaStr operating model for team/metrics benchmarks
- Jobs-to-be-Done for ICP validation
- April Dunford's positioning framework
- Pirate Metrics (AARRR) for funnel analysis
- David Sacks' metrics (CAC Payback, Burn Multiple, Rule of 40)
- OpenView / Bessemer / KeyBanc SaaS benchmarks for comparisons

═══ REPORT STRUCTURE (follow this EXACTLY) ═══

# Strategic Growth Plan
## ${companyName} | ${today}

---

## Executive Summary

[Write 4-5 paragraphs covering:
- What the company does, their model, stage, and current position
- The 3 core problems diagnosed and why they matter NOW
- The central hypothesis (one sentence that ties everything together)
- The recommended 90-day approach and expected outcomes
- A bold statement: "If ${companyName} executes this plan, the projected impact is [specific outcome]"
This section should feel like a board-level briefing. Be specific with numbers.]

---

## Company DNA

| Dimension | Current State | Benchmark | Gap |
|-----------|--------------|-----------|-----|
| Revenue | [actual] | [benchmark for stage] | [analysis] |
| Growth Rate | [actual or estimated] | [T2D3 benchmark] | [analysis] |
| Team | [size/composition] | [SaaStr benchmark for stage] | [analysis] |
| Funding | [status] | [typical for stage] | [analysis] |
| Business Model | [model] | N/A | [health assessment] |
| Gross Margin | [estimated] | [benchmark: 70-85% for SaaS] | [analysis] |

---

## Ideal Customer Profile Assessment

**Current ICP:** [Their stated ICP]

**ICP Validation using Jobs-to-be-Done framework:**
- **Job to be done:** [what the customer is hiring the product to do]
- **Current alternatives:** [what they use today / what they'd do without the product]
- **Switching triggers:** [what causes them to look for a solution]
- **Decision-making unit:** [who's involved: champion, economic buyer, technical evaluator]

**Positioning (April Dunford framework):**
- **Competitive alternatives:** [what would they do without you]
- **Unique attributes:** [what you have that alternatives don't]
- **Value:** [the benefit those attributes enable]
- **Target segment:** [who cares most about that value]
- **Market category:** [the context that makes the value obvious]

---

## Diagnostic Findings

### Finding 1: [Specific Problem Name]

**Severity:** [Critical / High / Medium]

**What we observed:** [2-3 sentences with specific evidence from the conversation]

**Root cause analysis:** [2-3 sentences explaining WHY this problem exists — go deeper than symptoms. Reference specific data points the user shared.]

**Revenue impact:** [Quantified estimate: "Based on [their metrics], this costs approximately €[X] per [month/quarter] in [lost deals / excess CAC / churn revenue / missed expansion]"]

**Industry benchmark:** [What "good" looks like with a specific source: "According to [OpenView/Bessemer/KeyBanc], the median [metric] for [their segment] is [X]. ${companyName} is at [Y], representing a [Z%] gap."]

---

### Finding 2: [Specific Problem Name]

[Same structure as Finding 1]

---

### Finding 3: [Specific Problem Name]

[Same structure as Finding 1]

---

## Root Cause Analysis

[3-4 paragraphs of SYSTEMS THINKING that explains:
1. How the three problems interconnect and create a negative feedback loop
2. Which problem is the "root" that feeds the others (use cause-and-effect chain)
3. Why addressing them in the recommended order creates compounding positive effects
4. Reference to similar patterns you've seen: "This pattern is common in [stage] [model] companies — typically caused by [underlying dynamic]"

Draw a clear causal chain. Example: "Poor ICP definition → scattered GTM → low conversion rates → high CAC → cash pressure → inability to hire sales team → founder bottleneck → limited growth"]

---

## Strategic Recommendations

### Priority 1: [Specific Action Name] — Weeks 1-4

**Objective:** [One clear, measurable goal]

**The case for urgency:** [Why this must happen first — quantify the cost of delay]

**Tactical execution plan:**
1. **Week 1:** [Specific actions with deliverables]
2. **Week 2:** [Specific actions with deliverables]
3. **Week 3:** [Specific actions with deliverables]
4. **Week 4:** [Specific actions with deliverables]

**Success criteria:** [Measurable outcome: "By end of Week 4, [Company] should have [specific deliverable/metric]"]

**Resources required:** [People, tools, budget — be specific: "1 person × 15 hours/week, [Tool] subscription at €[X]/month"]

**Risk:** [What could go wrong and how to mitigate]

---

### Priority 2: [Specific Action Name] — Weeks 4-8

[Same detailed structure as Priority 1]

---

### Priority 3: [Specific Action Name] — Weeks 8-12

[Same detailed structure as Priority 1]

---

## 90-Day Execution Roadmap

| Week | Focus Area | Key Actions | Deliverable | Success Metric | Owner |
|------|-----------|-------------|-------------|----------------|-------|
| 1 | [area] | [2-3 specific actions] | [output] | [KPI] | [role] |
| 2 | [area] | [2-3 specific actions] | [output] | [KPI] | [role] |
| 3 | [area] | [2-3 specific actions] | [output] | [KPI] | [role] |
| 4 | [area] | [2-3 specific actions] | [output] | [KPI] | [role] |
| 5-6 | [area] | [2-3 specific actions] | [output] | [KPI] | [role] |
| 7-8 | [area] | [2-3 specific actions] | [output] | [KPI] | [role] |
| 9-10 | [area] | [2-3 specific actions] | [output] | [KPI] | [role] |
| 11-12 | [area] | [2-3 specific actions] | [output] | [KPI] | [role] |

---

## Metrics Dashboard

### North Star Metric
**[Primary metric]:** [Current] → [90-day target] ([X% improvement])

### Leading Indicators

| Metric | Current | 30-Day Target | 60-Day Target | 90-Day Target | How to Track |
|--------|---------|---------------|---------------|---------------|-------------|
| [metric 1] | [now] | [target] | [target] | [target] | [tool/method] |
| [metric 2] | [now] | [target] | [target] | [target] | [tool/method] |
| [metric 3] | [now] | [target] | [target] | [target] | [tool/method] |
| [metric 4] | [now] | [target] | [target] | [target] | [tool/method] |
| [metric 5] | [now] | [target] | [target] | [target] | [tool/method] |

### Unit Economics Targets

| Metric | Current (est.) | Healthy Benchmark | Target |
|--------|---------------|-------------------|--------|
| LTV:CAC Ratio | [est.] | >3:1 | [target] |
| CAC Payback (months) | [est.] | <18 months | [target] |
| Net Revenue Retention | [est.] | >110% | [target] |
| Gross Margin | [est.] | >70% | [target] |
| Magic Number | [est.] | >0.75 | [target] |
| Burn Multiple | [est.] | <2x | [target] |

---

## Risk Mitigation

| Risk | Probability | Impact | Early Warning | Mitigation | Contingency |
|------|------------|--------|---------------|------------|-------------|
| [risk 1] | [H/M/L] | [H/M/L] | [signal to watch] | [preventive action] | [if it happens] |
| [risk 2] | [H/M/L] | [H/M/L] | [signal to watch] | [preventive action] | [if it happens] |
| [risk 3] | [H/M/L] | [H/M/L] | [signal to watch] | [preventive action] | [if it happens] |
| [risk 4] | [H/M/L] | [H/M/L] | [signal to watch] | [preventive action] | [if it happens] |

---

## Recommended Technology Stack

| Category | Tool | Monthly Cost | Why This Tool | Priority |
|----------|------|-------------|---------------|----------|
| CRM | [specific tool] | [€/mo] | [specific reason for their situation] | [Must-have/Nice-to-have] |
| Sales Automation | [specific tool] | [€/mo] | [reason] | [priority] |
| Analytics | [specific tool] | [€/mo] | [reason] | [priority] |
| Communication | [specific tool] | [€/mo] | [reason] | [priority] |
| [other relevant] | [specific tool] | [€/mo] | [reason] | [priority] |

**Total estimated monthly cost:** €[X]/month
**Expected ROI:** [specific: "At current deal sizes, this stack pays for itself with [X] additional closed deals per month"]

---

## Quick Wins (This Week)

These are high-impact, low-effort actions ${companyName} can execute immediately:

1. **[Action]** — [1-2 sentences: what to do, expected impact, time to complete]
2. **[Action]** — [1-2 sentences]
3. **[Action]** — [1-2 sentences]
4. **[Action]** — [1-2 sentences]
5. **[Action]** — [1-2 sentences]

---

## Next Steps

1. **This week:** [most important immediate action]
2. **Next week:** [second priority]
3. **Within 30 days:** [structural change to implement]
4. **Ongoing:** [habit/process to establish]

---

## Appendix: Methodology

This diagnostic was conducted using the Revenue Architect framework, which evaluates B2B companies across four dimensions:

1. **Company DNA** — Business model fit, stage-appropriate metrics, team composition
2. **Go-to-Market** — ICP clarity, channel effectiveness, unit economics
3. **Sales Engine** — Process maturity, conversion efficiency, scaling readiness
4. **Growth Dynamics** — Bottleneck identification, retention health, expansion potential

Benchmarks sourced from: SaaStr Annual Survey, OpenView SaaS Benchmarks, Bessemer Cloud Index, KeyBanc SaaS Survey, and first-party consulting engagements.

---

*Generated by Revenue Architect by Panoramica — Confidential*

═══ CRITICAL INSTRUCTIONS ═══
1. Fill ALL placeholders with REAL data from the profile above. Never leave [Unknown] or [?] — if data is missing, make a reasonable estimate and label it as such: "~€5K (estimated based on stage)"
2. Every recommendation must be SPECIFIC and ACTIONABLE — not "improve your sales process" but "document a 5-stage pipeline in HubSpot with exit criteria for each stage"
3. All benchmarks must be sourced and specific to their segment
4. Minimum 3000 words. This is a premium deliverable.
5. Numbers everywhere — quantify everything possible
6. Write as if presenting to a board of directors
7. Use the frameworks listed above throughout the report`;

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 12000
          }
        })
      }
    );

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'Unknown');
      throw new Error(`Gemini API error: ${resp.status} — ${errText.slice(0, 200)}`);
    }

    const data = await resp.json();
    let md = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!md) throw new Error('Empty report from Gemini');

    // Clean up any code fences
    md = md.replace(/^```(?:markdown)?\s*/i, '').replace(/\s*```$/i, '').trim();

    return res.status(200).json({
      report: md,
      filename: `Growth_Plan_${companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`,
      pdf_base64: null
    });

  } catch (e) {
    console.error('[Report v9]', e);
    return res.status(500).json({ error: e.message });
  }
}
