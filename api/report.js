// ═══════════════════════════════════════════════════════════════════════════════
// REPORT API - /api/report.js v10
//
// Anti-hallucination approach:
// 1. Profile data is split into CONFIRMED (user said it) vs UNKNOWN
// 2. The report prompt explicitly says "if unknown, write 'To be determined'"
// 3. The full conversation log is included as PRIMARY SOURCE
// 4. LLM is instructed to cite specific conversation turns
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

    const p = sessionData?.profile || {};
    const companyName = p.companyName || 'Company';
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // ── Build CONFIRMED vs UNKNOWN data ──
    function val(v) {
      if (Array.isArray(v)) return v.length > 0 ? v.join('; ') : null;
      return (v && typeof v === 'string' && v.trim() !== '') ? v.trim() : null;
    }

    const confirmed = {};
    const unknown = [];
    const fieldMap = {
      'Company': p.companyName, 'Website': p.website, 'Industry': p.industry,
      'Business Model': p.businessModel, 'Stage': p.stage, 'Revenue': p.revenue,
      'Revenue Growth': p.revenueGrowth, 'Team Size': p.teamSize, 'Team Roles': p.teamRoles,
      'Funding': p.funding, 'Runway': p.runway,
      'Product': p.productDescription, 'Pricing Model': p.pricingModel, 'Pricing Range': p.pricingRange,
      'ICP / Buyer': p.icpTitle, 'ICP Company Size': p.icpCompanySize,
      'ICP Industry': p.icpIndustry, 'ICP Pain Points': p.icpPainPoints,
      'Sales Motion': p.salesMotion, 'Channels': p.channels, 'Best Channel': p.bestChannel,
      'Avg Deal Size': p.avgDealSize, 'Sales Cycle': p.salesCycle, 'CAC': p.cac, 'LTV': p.ltv,
      'Sales Process': p.salesProcess, 'Process Documented': p.processDocumented,
      'Who Closes': p.whoCloses, 'Founder Involvement': p.founderInvolvement,
      'Win Rate': p.winRate, 'Main Bottleneck': p.mainBottleneck,
      'Objections': p.mainObjections, 'Lost Deal Reasons': p.lostDealReasons,
      'Churn Rate': p.churnRate, 'CRM/Tools': p.crm || p.tools,
      'Diagnosed Problems': p.diagnosedProblems, 'Root Causes': p.rootCauses,
      'Validated Problems': p.validatedProblems,
      'User Priority': p.userPriority, 'Past Attempts': p.pastAttempts,
      'Constraints': p.constraints, 'Additional Context': p.additionalContext
    };

    for (const [label, value] of Object.entries(fieldMap)) {
      const v = val(value);
      if (v) confirmed[label] = v;
      else unknown.push(label);
    }

    const confirmedText = Object.entries(confirmed).map(([k, v]) => `  ✅ ${k}: ${v}`).join('\n');
    const unknownText = unknown.map(k => `  ❓ ${k}: NOT PROVIDED`).join('\n');

    // ── Conversation log ──
    let convLog = '';
    if (sessionData?.conversationLog?.length > 0) {
      convLog = sessionData.conversationLog.join('\n');
    }

    // ── Scraped data ──
    const scraped = sessionData?.scrapedSummary || '';

    // ── Language detection ──
    const allText = (sessionData?.conversationLog || []).join(' ');
    const italianWords = (allText.match(/\b(che|sono|abbiamo|nostro|nostra|clienti|vendite|azienda|problema|perché|ancora|questo|quella|siamo|facciamo)\b/gi) || []).length;
    const langInstruction = italianWords > 3
      ? 'The user spoke ITALIAN. Write the ENTIRE report in Italian. Every section, every heading, everything.'
      : 'Write in the same language the user used during the conversation. Default to English.';

    const prompt = `You are generating a Strategic Growth Plan report for ${companyName}.

ROLE: Senior B2B revenue strategist with 20+ years experience. McKinsey/Bain caliber analysis, but practical and actionable.

OUTPUT: Pure Markdown. No JSON. No code fences. Just clean Markdown text.

LANGUAGE: ${langInstruction}

═══════════════════════════════════════
CONFIRMED DATA (user provided this — USE IT)
═══════════════════════════════════════
${confirmedText}

═══════════════════════════════════════
UNKNOWN DATA (user did NOT provide — DO NOT INVENT)
═══════════════════════════════════════
${unknownText}

═══════════════════════════════════════
SCRAPED WEBSITE DATA
═══════════════════════════════════════
${scraped || 'No scraping data available.'}

═══════════════════════════════════════
FULL CONVERSATION (this is your PRIMARY SOURCE OF TRUTH)
═══════════════════════════════════════
${convLog || 'No conversation log available.'}

═══════════════════════════════════════
ANTI-HALLUCINATION RULES (CRITICAL)
═══════════════════════════════════════
1. ONLY use data from CONFIRMED DATA and CONVERSATION sections above.
2. If a field is in UNKNOWN DATA, write "To be determined" or "Not yet assessed" — do NOT invent values.
3. When making estimates, ALWAYS label them: "~€X (estimated based on [specific data point])"
4. When citing benchmarks, keep them reasonable and generic rather than falsely precise.
5. Every finding MUST reference something the user actually said in the conversation.
6. Do NOT invent revenue numbers, team sizes, or metrics the user didn't share.
7. If you lack data for a section, acknowledge it and provide conditional advice: "If X is the case, then Y. If not, then Z."

═══════════════════════════════════════
REPORT STRUCTURE
═══════════════════════════════════════

# Strategic Growth Plan
## ${companyName} | ${today}

---

## Executive Summary

Write 3-4 paragraphs:
- What the company does and their current situation (ONLY confirmed data)
- The diagnosed problems and why they matter
- The central recommendation
- Expected outcomes if executed

---

## Company Profile

| Dimension | Status |
|-----------|--------|
| Company | ${confirmed['Company'] || 'N/A'} |
| Industry | ${confirmed['Industry'] || 'To be assessed'} |
| Business Model | ${confirmed['Business Model'] || 'To be assessed'} |
| Stage | ${confirmed['Stage'] || 'To be assessed'} |
| Revenue | ${confirmed['Revenue'] || 'Not disclosed'} |
| Team | ${confirmed['Team Size'] || 'Not disclosed'} ${confirmed['Team Roles'] ? '(' + confirmed['Team Roles'] + ')' : ''} |
| Funding | ${confirmed['Funding'] || 'Not disclosed'} |

Include benchmarks for their stage (T2D3, SaaStr) where applicable. Compare their profile to typical companies at their stage.

---

## ICP & Go-to-Market Assessment

Based on confirmed data:
- ICP: ${confirmed['ICP / Buyer'] || 'Not defined'} at ${confirmed['ICP Company Size'] || '?'} companies
- Motion: ${confirmed['Sales Motion'] || 'Not defined'}
- Channels: ${confirmed['Channels'] || 'Not defined'}
- Deal Size: ${confirmed['Avg Deal Size'] || 'Not disclosed'}

Analyze positioning using April Dunford framework and Jobs-to-be-Done — but only based on what the user shared. If ICP is unclear, flag it as the #1 issue.

---

## Diagnostic Findings

${(p.diagnosedProblems || []).length > 0
  ? (p.diagnosedProblems || []).map((prob, i) => `
### Finding ${i + 1}: ${prob}

**Severity:** [Assess based on conversation]

**What the user told us:** [Quote or reference specific things from the CONVERSATION above]

**Root Cause:** ${(p.rootCauses || [])[i] || 'To be analyzed further'}

**Revenue Impact:** [Estimate ONLY if you have the data to back it up. If not, describe the qualitative impact.]

**Benchmark:** [What "good" looks like for companies at their stage]

---`).join('\n')
  : `### (Diagnosis was not completed during the conversation)

Based on the information gathered, the key areas to investigate are:
1. [Infer from confirmed data]
2. [Infer from confirmed data]
3. [Infer from confirmed data]`
}

## Root Cause Analysis

Explain how the problems interconnect. Use systems thinking. Draw the causal chain.
ONLY reference confirmed data. If data is incomplete, note what additional information would strengthen the analysis.

---

## Strategic Recommendations

### Priority 1: [Most urgent — based on user's stated priority: "${confirmed['User Priority'] || 'not specified'}"]

**Objective:** [Clear, measurable]

**Week-by-week execution:**
- Week 1: [Specific actions]
- Week 2: [Specific actions]
- Week 3: [Specific actions]
- Week 4: [Specific actions]

**Success metric:** [How to measure]
**Resources:** [People, tools, budget]

---

### Priority 2: [Second priority]

[Same structure]

---

### Priority 3: [Third priority]

[Same structure]

---

## 90-Day Roadmap

| Week | Focus | Actions | Deliverable | KPI |
|------|-------|---------|-------------|-----|
| 1-2 | [area] | [actions] | [output] | [metric] |
| 3-4 | [area] | [actions] | [output] | [metric] |
| 5-6 | [area] | [actions] | [output] | [metric] |
| 7-8 | [area] | [actions] | [output] | [metric] |
| 9-10 | [area] | [actions] | [output] | [metric] |
| 11-12 | [area] | [actions] | [output] | [metric] |

---

## Key Metrics to Track

| Metric | Current | 90-Day Target | How to Track |
|--------|---------|---------------|-------------|
| [relevant metric] | [from confirmed data or "TBD"] | [target] | [tool] |
| [relevant metric] | [from confirmed data or "TBD"] | [target] | [tool] |
| [relevant metric] | [from confirmed data or "TBD"] | [target] | [tool] |
| [relevant metric] | [from confirmed data or "TBD"] | [target] | [tool] |

${confirmed['Revenue'] ? `
### Unit Economics

| Metric | Current (est.) | Healthy Target |
|--------|---------------|----------------|
| LTV:CAC | [estimate if data available] | >3:1 |
| CAC Payback | [estimate if data available] | <18 months |
| Net Revenue Retention | [estimate if data available] | >110% |
| Gross Margin | [estimate if data available] | >70% |
` : '*(Unit economics assessment requires revenue data — to be calculated when available)*'}

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| [risk based on their situation] | [H/M/L] | [specific action] |
| [risk based on their situation] | [H/M/L] | [specific action] |
| [risk based on their situation] | [H/M/L] | [specific action] |

---

## Recommended Tools

| Category | Tool | Est. Cost | Why |
|----------|------|-----------|-----|
| CRM | [tool] | [€/mo] | [reason specific to their situation] |
| [relevant category] | [tool] | [€/mo] | [reason] |
| [relevant category] | [tool] | [€/mo] | [reason] |
| [relevant category] | [tool] | [€/mo] | [reason] |

---

## Quick Wins (This Week)

1. [Specific action — max 30 min to execute]
2. [Specific action]
3. [Specific action]
4. [Specific action]
5. [Specific action]

---

## Next Steps

1. **Immediate:** [most important action]
2. **This week:** [second action]
3. **This month:** [structural change]
4. **Ongoing:** [process to establish]

---

*Generated by Revenue Architect by Panoramica — Confidential*

═══════════════════════════════════════
FINAL REMINDERS
═══════════════════════════════════════
- Minimum 2500 words
- Fill tables with REAL data from CONFIRMED section — mark unknowns as "TBD" or "Not disclosed"
- Every recommendation must be actionable and specific
- Reference the conversation where possible: "As you mentioned..." or "Based on your description of..."
- DO NOT invent numbers. If revenue isn't confirmed, don't write "€50K MRR" — write "Not disclosed" or estimate with clear labeling
- Write as if presenting to the company's leadership team`;

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.45, maxOutputTokens: 12000 }
        })
      }
    );

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'Unknown');
      throw new Error(`Gemini: ${resp.status} — ${errText.slice(0, 200)}`);
    }

    const data = await resp.json();
    let md = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!md) throw new Error('Empty report');

    md = md.replace(/^```(?:markdown)?\s*/i, '').replace(/\s*```$/i, '').trim();

    return res.status(200).json({
      report: md,
      filename: `Growth_Plan_${companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`,
      pdf_base64: null
    });

  } catch (e) {
    console.error('[Report v10]', e);
    return res.status(500).json({ error: e.message });
  }
}
