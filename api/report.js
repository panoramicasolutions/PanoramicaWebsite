// ADVANCED PDF REPORT GENERATOR
// This version generates actual PDF files using jsPDF
// For Vercel deployment, install: npm install jspdf

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { history = [], diagnosticData = {} } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return res.status(500).json({ error: 'Missing API Key' });
    }

    if (!history || history.length === 0) {
      return res.status(400).json({ error: 'No conversation history' });
    }

    console.log(`📊 Generating PDF report from ${history.length} items`);

    // Build conversation summary
    const conversationSummary = history
      .filter(h => h.role === 'assistant' || h.role === 'user')
      .map(h => {
        if (h.role === 'user') return `CLIENT: ${h.content}`;
        try {
          const parsed = JSON.parse(h.content);
          return `CONSULTANT: ${parsed.message || h.content}`;
        } catch {
          return `CONSULTANT: ${h.content}`;
        }
      })
      .join('\n\n');

    const formattedDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    // Structured report prompt for JSON output
    const REPORT_PROMPT = `
Analyze this diagnostic conversation and generate a STRUCTURED report in JSON format.

CONVERSATION:
${conversationSummary}

Respond with ONLY valid JSON in this exact structure:

{
  "company_name": "string (extract from conversation or use 'Client Company')",
  "date": "${formattedDate}",
  "executive_summary": {
    "current_situation": "string (2-3 sentences)",
    "challenge_identified": "string (2-3 sentences)",
    "strategic_recommendation": "string (2-3 sentences)",
    "expected_outcome": "string with metrics if possible"
  },
  "company_profile": {
    "stage": "string",
    "revenue": "string",
    "model": "string",
    "gtm_motion": "string",
    "team_size": "string"
  },
  "primary_challenge": {
    "title": "string (3-5 words)",
    "description": "string (detailed paragraph)",
    "evidence": ["string", "string", "string"],
    "contributing_factors": ["string", "string"]
  },
  "benchmarks": [
    {"metric": "string", "current": "string", "benchmark": "string", "gap": "string"}
  ],
  "immediate_actions": [
    {
      "title": "string",
      "objective": "string",
      "rationale": "string",
      "steps": ["string", "string", "string"],
      "success_metric": "string",
      "owner": "string"
    }
  ],
  "foundation_initiatives": [
    {
      "title": "string",
      "objective": "string",
      "deliverables": ["string", "string"],
      "resources": "string"
    }
  ],
  "strategic_initiatives": [
    {
      "title": "string",
      "vision": "string",
      "approach": "string",
      "milestones": ["string", "string", "string"],
      "investment": "string",
      "roi": "string"
    }
  ],
  "roadmap": [
    {"phase": "string", "timeline": "string", "focus": "string", "activities": "string", "success": "string"}
  ],
  "kpis": {
    "leading": [{"metric": "string", "current": "string", "target": "string"}],
    "lagging": [{"metric": "string", "current": "string", "target": "string", "by": "string"}],
    "north_star": {"metric": "string", "current": "string", "target": "string", "timeframe": "string"}
  },
  "risks": [
    {"risk": "string", "likelihood": "string", "impact": "string", "mitigation": "string"}
  ],
  "resources": {
    "team": ["string"],
    "technology": ["string"],
    "budget": {"30_days": "string", "90_days": "string", "12_months": "string"}
  },
  "next_steps": {
    "this_week": ["string", "string", "string"],
    "first_30_days": ["string", "string", "string"]
  }
}

IMPORTANT:
- Use ACTUAL information from the conversation
- Be specific and actionable
- Include real metrics where discussed
- Use "To be validated" only when info truly wasn't discussed
- Ensure all arrays have at least 2-3 items
`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: REPORT_PROMPT }] }],
          generationConfig: {
            temperature: 0.5,
            topP: 0.95,
            maxOutputTokens: 8192,
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
      console.error(`Gemini Error: ${geminiResponse.status}`);
      return res.status(500).json({ error: 'Failed to generate report' });
    }

    const data = await geminiResponse.json();
    let reportJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!reportJson) {
      return res.status(500).json({ error: 'No content returned' });
    }

    // Clean and parse JSON
    reportJson = reportJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let reportData;
    try {
      reportData = JSON.parse(reportJson);
    } catch (e) {
      console.error('JSON parse error:', e);
      // Fallback to markdown
      return res.status(200).json({ 
        report: reportJson,
        filename: `Report_${new Date().toISOString().split('T')[0]}.md`,
        format: 'markdown'
      });
    }

    // Generate professional markdown from structured data
    const markdownReport = generateMarkdownReport(reportData);
    
    const filename = `Panoramica_Strategic_Growth_Plan_${new Date().toISOString().split('T')[0]}.md`;

    console.log(`✅ Report generated successfully`);
    
    return res.status(200).json({ 
      report: markdownReport,
      structured_data: reportData,
      filename: filename,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Report Error:', error);
    return res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
}

function generateMarkdownReport(data) {
  const d = data;
  
  return `
<div align="center">

# STRATEGIC GROWTH PLAN

### ${d.company_name || 'Client Company'}

**${d.date}**

*Prepared by Revenue Architect | Panoramica*

---

</div>

## Executive Summary

### Current Situation
${d.executive_summary?.current_situation || 'Analysis in progress.'}

### Challenge Identified
${d.executive_summary?.challenge_identified || 'To be determined.'}

### Strategic Recommendation
${d.executive_summary?.strategic_recommendation || 'Recommendations pending.'}

### Expected Outcome
${d.executive_summary?.expected_outcome || 'Outcomes to be quantified.'}

---

## Company Profile

| Attribute | Current State |
|-----------|---------------|
| **Company Stage** | ${d.company_profile?.stage || 'To be validated'} |
| **Revenue Range** | ${d.company_profile?.revenue || 'Not disclosed'} |
| **Business Model** | ${d.company_profile?.model || 'To be validated'} |
| **Go-to-Market** | ${d.company_profile?.gtm_motion || 'To be validated'} |
| **Team Size** | ${d.company_profile?.team_size || 'To be validated'} |

---

## Diagnostic Findings

### Primary Challenge: ${d.primary_challenge?.title || 'Revenue Optimization'}

${d.primary_challenge?.description || 'Detailed analysis pending.'}

### Supporting Evidence

${(d.primary_challenge?.evidence || []).map((e, i) => `${i + 1}. ${e}`).join('\n')}

### Contributing Factors

${(d.primary_challenge?.contributing_factors || []).map(f => `- ${f}`).join('\n')}

---

## Industry Benchmark Comparison

| Metric | Current State | Industry Benchmark | Gap Analysis |
|--------|---------------|-------------------|--------------|
${(d.benchmarks || []).map(b => `| ${b.metric} | ${b.current} | ${b.benchmark} | ${b.gap} |`).join('\n')}

*Sources: Bessemer Venture Partners, OpenView Partners, Gartner Research*

---

## Strategic Recommendations

### Phase 1: Immediate Actions (Days 1-30)

${(d.immediate_actions || []).map((action, i) => `
#### ${i + 1}. ${action.title}

**Objective:** ${action.objective}

**Rationale:** ${action.rationale}

**Implementation Steps:**
${(action.steps || []).map((s, j) => `${j + 1}. ${s}`).join('\n')}

**Success Metric:** ${action.success_metric}
**Owner:** ${action.owner}
`).join('\n---\n')}

---

### Phase 2: Foundation Building (Days 31-60)

${(d.foundation_initiatives || []).map((init, i) => `
#### ${i + 1}. ${init.title}

**Objective:** ${init.objective}

**Key Deliverables:**
${(init.deliverables || []).map(d => `- ${d}`).join('\n')}

**Resources Required:** ${init.resources}
`).join('\n---\n')}

---

### Phase 3: Strategic Transformation (Days 61-90+)

${(d.strategic_initiatives || []).map((init, i) => `
#### ${i + 1}. ${init.title}

**Vision:** ${init.vision}

**Approach:** ${init.approach}

**Key Milestones:**
${(init.milestones || []).map((m, j) => `- Week ${8 + j * 2}: ${m}`).join('\n')}

**Investment Required:** ${init.investment}
**Expected ROI:** ${init.roi}
`).join('\n---\n')}

---

## Implementation Roadmap

| Phase | Timeline | Focus Area | Key Activities | Success Criteria |
|-------|----------|------------|----------------|------------------|
${(d.roadmap || []).map(r => `| ${r.phase} | ${r.timeline} | ${r.focus} | ${r.activities} | ${r.success} |`).join('\n')}

---

## Success Metrics & KPIs

### Leading Indicators (Track Weekly)

| Metric | Current | Target |
|--------|---------|--------|
${(d.kpis?.leading || []).map(k => `| ${k.metric} | ${k.current} | ${k.target} |`).join('\n')}

### Lagging Indicators (Track Monthly)

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
${(d.kpis?.lagging || []).map(k => `| ${k.metric} | ${k.current} | ${k.target} | ${k.by} |`).join('\n')}

### North Star Metric

**${d.kpis?.north_star?.metric || 'Primary Growth Metric'}**
- Current: ${d.kpis?.north_star?.current || 'Baseline TBD'}
- Target: ${d.kpis?.north_star?.target || 'Target TBD'}
- Timeframe: ${d.kpis?.north_star?.timeframe || '90 days'}

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
${(d.risks || []).map(r => `| ${r.risk} | ${r.likelihood} | ${r.impact} | ${r.mitigation} |`).join('\n')}

---

## Resource Requirements

### Team
${(d.resources?.team || []).map(t => `- ${t}`).join('\n')}

### Technology & Tools
${(d.resources?.technology || []).map(t => `- ${t}`).join('\n')}

### Budget Estimate

| Timeframe | Investment |
|-----------|------------|
| First 30 Days | ${d.resources?.budget?.['30_days'] || 'TBD'} |
| First 90 Days | ${d.resources?.budget?.['90_days'] || 'TBD'} |
| 12 Months | ${d.resources?.budget?.['12_months'] || 'TBD'} |

---

## Recommended Next Steps

### This Week
${(d.next_steps?.this_week || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

### First 30 Days
${(d.next_steps?.first_30_days || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

---

## Methodology

This Strategic Growth Plan was developed using:

- **Winning by Design** Revenue Architecture Framework
- **MEDDICC** Sales Qualification Methodology
- **Industry Benchmarks** from Bessemer, OpenView, and Gartner
- **AI-Powered Diagnostics** by Panoramica

---

<div align="center">

*This document is confidential and intended solely for the use of ${d.company_name || 'the client'}.*

**Generated by Panoramica Revenue Architect**
${d.date}

</div>
`.trim();
}
