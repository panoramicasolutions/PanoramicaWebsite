export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { history = [] } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      console.error('❌ Missing Gemini API Key');
      return res.status(500).json({ error: 'Missing Gemini API Key configuration' });
    }

    if (!history || history.length === 0) {
      return res.status(400).json({ error: 'No conversation history provided' });
    }

    console.log('📊 Generating report from', history.length, 'history items');

    // Build conversation summary
    const conversationSummary = history
      .filter(h => h.role === 'assistant' || h.role === 'user')
      .map(h => {
        if (h.role === 'user') {
          return `**User:** ${h.content}`;
        }
        
        // Parse assistant JSON responses
        try {
          const parsed = JSON.parse(h.content);
          return `**AI:** ${parsed.message || h.content}`;
        } catch {
          return `**AI:** ${h.content}`;
        }
      })
      .join('\n\n');

    const REPORT_PROMPT = `
You are a Senior Revenue Operations Consultant. Based on the diagnostic conversation below, generate a comprehensive Strategic Growth Plan in markdown format.

CONVERSATION TRANSCRIPT:
---
${conversationSummary}
---

YOUR TASK: Generate a professional, actionable markdown report with this EXACT structure:

# Strategic Growth Plan
**Generated:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  
**Client:** [Company Name from conversation]  
**Prepared by:** Revenue Architect (Panoramica AI)

---

## Executive Summary

[2-3 paragraph overview covering:]
- Current state of the company (stage, size, business model)
- Primary challenge identified during diagnostic
- Recommended strategic direction and expected outcome

## Current State Analysis

### Company Profile
- **Industry:** [Industry/Vertical]
- **Business Model:** [SaaS/Services/Hybrid]
- **Stage:** [Pre-seed/Seed/Series A/B/Growth]
- **Revenue:** [ARR/MRR range if mentioned]
- **Team Size:** [If mentioned]

### Revenue Engine Assessment
- **Sales Motion:** [Inbound/Outbound/PLG/Hybrid - with specifics]
- **Current Metrics:** [Any metrics mentioned in conversation]
- **Identified Bottlenecks:**
  1. [Primary bottleneck]
  2. [Secondary bottleneck if any]
  3. [Tertiary bottleneck if any]

## Root Cause Diagnosis

### Primary Issues Identified

**1. [Issue Name]**
- **Symptom:** [What's visible to the team]
- **Root Cause:** [What's actually broken underneath]
- **Business Impact:** [Revenue/efficiency consequence]
- **Evidence:** [References from conversation]

**2. [Issue Name]** (if applicable)
- **Symptom:** [What's visible]
- **Root Cause:** [Underlying problem]
- **Business Impact:** [Consequence]
- **Evidence:** [From conversation]

### Contributing Factors
- [Secondary issue or systemic problem 1]
- [Secondary issue or systemic problem 2]
- [Market/competitive factors if relevant]

## Strategic Recommendations

### Immediate Actions (0-30 days)
**Priority: Quick wins to build momentum**

1. **[Action Item]**
   - **Why:** [Reasoning based on diagnosis]
   - **How:** [Specific implementation steps]
   - **Expected Outcome:** [Measurable result]
   - **Owner:** [Suggested role/team]

2. **[Action Item]**
   - **Why:** [Reasoning]
   - **How:** [Implementation]
   - **Expected Outcome:** [Result]
   - **Owner:** [Role/team]

3. **[Action Item]**
   - **Why:** [Reasoning]
   - **How:** [Implementation]
   - **Expected Outcome:** [Result]
   - **Owner:** [Role/team]

### Short-term Initiatives (30-90 days)
**Priority: Foundation building**

1. **[Initiative Name]**
   - **Description:** [What needs to be done]
   - **Success Criteria:** [How to measure success]
   - **Resources Required:** [Team/tools/budget]
   - **Dependencies:** [What needs to happen first]

2. **[Initiative Name]**
   - **Description:** [Details]
   - **Success Criteria:** [Metrics]
   - **Resources Required:** [Needs]
   - **Dependencies:** [Prerequisites]

### Long-term Strategy (90+ days)
**Priority: Sustainable growth infrastructure**

- **Strategic Direction:** [Overall approach]
- **Key Investments:** [Technology/team/process investments needed]
- **Capability Building:** [Skills/systems to develop]
- **Market Positioning:** [How to differentiate]

## Implementation Roadmap

| Phase | Timeline | Focus Area | Key Deliverables | Success Metrics |
|-------|----------|------------|------------------|-----------------|
| **Phase 1** | Weeks 1-4 | [Primary focus] | • [Deliverable 1]<br>• [Deliverable 2] | [Metric] |
| **Phase 2** | Weeks 5-8 | [Secondary focus] | • [Deliverable 1]<br>• [Deliverable 2] | [Metric] |
| **Phase 3** | Weeks 9-12 | [Tertiary focus] | • [Deliverable 1]<br>• [Deliverable 2] | [Metric] |
| **Phase 4** | Month 4+ | [Long-term focus] | • [Deliverable 1]<br>• [Deliverable 2] | [Metric] |

## Success Metrics & KPIs

### Leading Indicators (Monitor Weekly)
- **[Metric Name]:** Current: [if known] → Target: [target value]
- **[Metric Name]:** Current: [if known] → Target: [target value]
- **[Metric Name]:** Current: [if known] → Target: [target value]

### Lagging Indicators (Monitor Monthly)
- **[Metric Name]:** Current: [if known] → Target: [target value] by [timeframe]
- **[Metric Name]:** Current: [if known] → Target: [target value] by [timeframe]
- **[Metric Name]:** Current: [if known] → Target: [target value] by [timeframe]

### North Star Metric
**[Primary metric to optimize for]:** [Current state] → [Target state] by [timeframe]

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| [Risk description] | [High/Med/Low] | [High/Med/Low] | [Specific mitigation steps] |
| [Risk description] | [High/Med/Low] | [High/Med/Low] | [Specific mitigation steps] |
| [Risk description] | [High/Med/Low] | [High/Med/Low] | [Specific mitigation steps] |

## Resource Requirements

### Team
- [Role/headcount needed]
- [Role/headcount needed]

### Technology & Tools
- [Tool/platform needed and why]
- [Tool/platform needed and why]

### Budget Estimate
- **Immediate (30 days):** $[amount or range]
- **Short-term (90 days):** $[amount or range]
- **Long-term (12 months):** $[amount or range]

## Next Steps

**Immediate Actions (This Week):**
1. [Specific, actionable step]
2. [Specific, actionable step]
3. [Specific, actionable step]

**First 30 Days:**
1. [Key milestone]
2. [Key milestone]
3. [Key milestone]

**Recommended Follow-up:**
- Weekly check-ins on leading indicators
- Monthly strategic review meetings
- Quarterly roadmap adjustments

---

## Appendix: Industry Benchmarks

[Include 2-3 relevant industry benchmarks referenced during the diagnostic]

**Benchmark 1:** [Description and source]
**Benchmark 2:** [Description and source]
**Benchmark 3:** [Description and source]

---

*This Strategic Growth Plan was generated by Panoramica's Revenue Architect AI based on your diagnostic session on ${new Date().toLocaleDateString()}. For implementation support or questions, please reach out to your account manager.*

---

**CRITICAL INSTRUCTIONS FOR GENERATION:**

1. **Be Specific:** Use actual details from the conversation. Don't write "[Company Name]" - use the actual company name if mentioned.

2. **Be Actionable:** Every recommendation must have clear implementation steps, not vague advice.

3. **Use Data:** Reference any metrics, numbers, or specifics mentioned in the conversation.

4. **Fill Gaps Honestly:** If information wasn't discussed, note it as "[Requires validation with team]" rather than inventing data.

5. **Professional Tone:** Write as a senior consultant would - confident, evidence-based, actionable.

6. **Length:** Target 1800-2200 words total. Be comprehensive but not verbose.

7. **Formatting:** Use markdown properly. Bold for emphasis, tables for structure, bullet points for lists.

8. **No Placeholders:** Replace ALL brackets with actual content. The only exception is "[Requires validation]" when data truly isn't available.

Generate the complete report now:
`;

    // Call Gemini API for report generation
    console.log('📤 Calling Gemini for report generation...');
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ 
            role: 'user', 
            parts: [{ text: REPORT_PROMPT }] 
          }],
          generationConfig: {
            temperature: 0.5,
            topP: 0.95,
            topK: 40,
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
      const errorText = await geminiResponse.text();
      console.error('❌ Gemini API Error:', geminiResponse.status, errorText);
      return res.status(500).json({ 
        error: 'Failed to generate report',
        details: `Gemini API returned ${geminiResponse.status}`
      });
    }

    const data = await geminiResponse.json();

    if (data.error) {
      console.error('❌ Gemini API Error:', data.error);
      return res.status(500).json({ 
        error: 'Gemini API error', 
        details: data.error.message 
      });
    }

    let reportText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!reportText) {
      console.error('❌ No report text generated');
      return res.status(500).json({ 
        error: 'Failed to generate report',
        details: 'No content returned from AI'
      });
    }

    // Clean up markdown code blocks if present
    reportText = reportText
      .replace(/```markdown\n?/g, '')
      .replace(/```\n?$/g, '')
      .trim();

    // Generate filename
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `Panoramica_Strategic_Growth_Plan_${currentDate}.md`;

    console.log(`✅ Report generated successfully (${reportText.length} characters)`);
    
    return res.status(200).json({ 
      report: reportText,
      filename: filename,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Report Generation Error:', error);
    console.error('Stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Failed to generate report', 
      details: error.message 
    });
  }
}
