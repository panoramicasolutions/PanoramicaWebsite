export default async function handler(req, res) {
  // CORS & METHOD HANDLING
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const log = (emoji, message) => {
    console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${emoji} ${message}`);
  };

  try {
    const { history = [], diagnosticData = {} } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      log('❌', 'Missing Gemini API Key');
      return res.status(500).json({ error: 'Missing API Key' });
    }

    if (!history || history.length === 0) {
      return res.status(400).json({ error: 'No conversation history' });
    }

    log('📊', `Generating report from ${history.length} items`);

    // Build conversation summary
    const conversationSummary = history
      .filter(h => h.role === 'assistant' || h.role === 'user')
      .map(h => {
        if (h.role === 'user') return `**CLIENT:** ${h.content}`;
        try {
          const parsed = JSON.parse(h.content);
          return `**CONSULTANT:** ${parsed.message || h.content}`;
        } catch {
          return `**CONSULTANT:** ${h.content}`;
        }
      })
      .join('\n\n---\n\n');

    const formattedDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    // REPORT PROMPT
    const REPORT_PROMPT = `
You are a Senior Revenue Operations Consultant. Generate a comprehensive Strategic Growth Plan based on this diagnostic conversation.

DIAGNOSTIC TRANSCRIPT:
${conversationSummary}

Generate a COMPLETE markdown report with this structure:

# Strategic Growth Plan

**Prepared for:** [Company name from conversation]
**Date:** ${formattedDate}
**Consultant:** Revenue Architect (Panoramica)

---

## Executive Summary
[3-4 paragraphs: Current situation, Challenge identified, Strategic recommendation, Expected outcome with metrics]

---

## Company Profile

| Attribute | Current State |
|-----------|---------------|
| **Stage** | [From conversation] |
| **Revenue** | [ARR/MRR if mentioned] |
| **Model** | [SaaS/Services/Hybrid] |
| **GTM Motion** | [Inbound/Outbound/PLG] |
| **Team Size** | [If mentioned] |

---

## Diagnostic Findings

### Primary Challenge
**[Core issue in 3-5 words]**
[Detailed root cause analysis - what's broken, why, how it manifests, compounding effects]

### Supporting Evidence
1. **[Indicator 1]:** [Evidence from conversation]
2. **[Indicator 2]:** [Evidence]
3. **[Indicator 3]:** [Evidence]

### Contributing Factors
- **[Factor 1]:** [Explanation]
- **[Factor 2]:** [Explanation]

---

## Industry Benchmarks

| Metric | Current | Benchmark | Gap |
|--------|---------|-----------|-----|
| [Metric 1] | [State] | [Standard] | [Analysis] |
| [Metric 2] | [State] | [Standard] | [Analysis] |
| [Metric 3] | [State] | [Standard] | [Analysis] |

*Sources: Bessemer, OpenView, Gartner*

---

## Strategic Recommendations

### Immediate Actions (Days 1-30)

#### 1. [Action Title]
**Objective:** [Outcome]
**Rationale:** [Why this matters]
**Steps:**
1. [Step]
2. [Step]
3. [Step]
**Success Metric:** [KPI]
**Owner:** [Role]

#### 2. [Action Title]
**Objective:** [Outcome]
**Rationale:** [Why]
**Steps:**
1. [Step]
2. [Step]
3. [Step]
**Success Metric:** [KPI]
**Owner:** [Role]

#### 3. [Action Title]
**Objective:** [Outcome]
**Rationale:** [Why]
**Steps:**
1. [Step]
2. [Step]
3. [Step]
**Success Metric:** [KPI]
**Owner:** [Role]

---

### Foundation Building (Days 31-60)

#### 1. [Initiative]
**Objective:** [Outcome]
**Scope:** [Components]
**Deliverables:** [List]
**Resources:** [Needs]

#### 2. [Initiative]
**Objective:** [Outcome]
**Scope:** [Components]
**Deliverables:** [List]
**Resources:** [Needs]

---

### Strategic Transformation (Days 61-90)

#### 1. [Strategic Initiative]
**Vision:** [End state]
**Approach:** [Strategy]
**Milestones:** Week 8, 10, 12 targets
**Investment:** [Estimate]
**Expected ROI:** [Projection]

---

## Implementation Roadmap

| Phase | Timeline | Focus | Key Activities | Success Criteria |
|-------|----------|-------|----------------|------------------|
| Stabilize | Weeks 1-4 | [Focus] | [Activities] | [Metrics] |
| Optimize | Weeks 5-8 | [Focus] | [Activities] | [Metrics] |
| Scale | Weeks 9-12 | [Focus] | [Activities] | [Metrics] |

---

## Success Metrics & KPIs

### Leading Indicators (Weekly)
- **[Metric]:** Current → Target
- **[Metric]:** Current → Target
- **[Metric]:** Current → Target

### Lagging Indicators (Monthly)
- **[Metric]:** Current → Target by [Date]
- **[Metric]:** Current → Target by [Date]

### North Star Metric
**[Primary metric]:** [Current] → [Target] by [Timeframe]

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | Med/High | High | [Strategy] |
| [Risk 2] | Med | Med | [Strategy] |
| [Risk 3] | Low | High | [Strategy] |

---

## Resource Requirements

### Team
- [Role/hire needed]
- [Role/hire needed]

### Technology
- [Tool needed and why]
- [Tool needed and why]

### Budget Estimate
- **30 Days:** $[amount]
- **90 Days:** $[amount]
- **12 Months:** $[amount]

---

## Next Steps

**This Week:**
1. [Specific action]
2. [Specific action]
3. [Specific action]

**First 30 Days:**
1. [Milestone]
2. [Milestone]
3. [Milestone]

---

## Appendix: Methodology

This diagnostic utilized:
- Winning by Design Revenue Architecture Framework
- MEDDICC Qualification Methodology
- Industry benchmarks from Bessemer, OpenView, Gartner

---

*This Strategic Growth Plan was generated by Panoramica's Revenue Architect AI. For implementation support, contact your account manager.*

---

CRITICAL INSTRUCTIONS:
1. Use ACTUAL details from conversation - no placeholders like "[Company Name]"
2. Be SPECIFIC and ACTIONABLE
3. Include real metrics and benchmarks
4. If info wasn't discussed, note "To be validated"
5. Professional consulting tone
6. 2500-3500 words total
7. Complete every section fully
`;

    log('📤', 'Calling Gemini for report generation...');
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: REPORT_PROMPT }] }],
          generationConfig: {
            temperature: 0.6,
            topP: 0.95,
            maxOutputTokens: 8192
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
      log('❌', `Gemini Error: ${geminiResponse.status}`);
      return res.status(500).json({ error: 'Failed to generate report' });
    }

    const data = await geminiResponse.json();
    let reportText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!reportText) {
      log('❌', 'No report text generated');
      return res.status(500).json({ error: 'No content returned' });
    }

    // Clean markdown
    reportText = reportText
      .replace(/```markdown\n?/g, '')
      .replace(/```\n?$/g, '')
      .trim();

    const filename = `Panoramica_Strategic_Growth_Plan_${new Date().toISOString().split('T')[0]}.md`;

    log('✅', `Report generated (${reportText.length} chars)`);
    
    return res.status(200).json({ 
      report: reportText,
      filename: filename,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Report Error:', error);
    return res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
}
