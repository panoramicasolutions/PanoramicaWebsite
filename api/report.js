// ═══════════════════════════════════════════════════════════════
// REPORT GENERATION API
// Revenue Architect - Strategic Growth Plan Generator
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

  const log = (emoji, message, data = null) => {
    console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${emoji} ${message}`, data || '');
  };

  try {
    const { history = [], diagnosticData = {} } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return res.status(500).json({ error: 'Gemini API Key missing' });
    }

    if (history.length < 4) {
      return res.status(400).json({ error: 'Insufficient conversation history for report generation' });
    }

    log('📊', 'Generating Strategic Growth Plan...');

    // ═══════════════════════════════════════════════════════════════
    // EXTRACT CONVERSATION DATA
    // ═══════════════════════════════════════════════════════════════
    const conversationSummary = history.map(msg => {
      if (msg.role === 'user') {
        return `USER: ${msg.content}`;
      } else {
        try {
          const parsed = JSON.parse(msg.content);
          return `ARCHITECT: ${parsed.message || msg.content}`;
        } catch {
          return `ARCHITECT: ${msg.content}`;
        }
      }
    }).join('\n\n');

    // ═══════════════════════════════════════════════════════════════
    // REPORT GENERATION PROMPT
    // ═══════════════════════════════════════════════════════════════
    const REPORT_PROMPT = `
You are a senior Revenue Operations consultant creating a Strategic Growth Plan based on a discovery session.

═══════════════════════════════════════════════════════════════════════════════
CONVERSATION TRANSCRIPT
═══════════════════════════════════════════════════════════════════════════════

${conversationSummary}

═══════════════════════════════════════════════════════════════════════════════
ADDITIONAL CONTEXT
═══════════════════════════════════════════════════════════════════════════════

Website: ${diagnosticData.website || 'Not provided'}
LinkedIn: ${diagnosticData.linkedin || 'Not provided'}

═══════════════════════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════════════════════

Generate a comprehensive Strategic Growth Plan in MARKDOWN format.
This document should be professional, actionable, and specific to this company.

IMPORTANT GUIDELINES:
1. Use ONLY information from the conversation — do not invent data
2. Where specific numbers weren't provided, use ranges or qualitative assessments
3. Be specific and actionable — avoid generic advice
4. Include direct quotes from the user where they add value
5. Make recommendations that match their stage and resources
6. Prioritize quick wins that can show results in 30 days

═══════════════════════════════════════════════════════════════════════════════
REQUIRED DOCUMENT STRUCTURE
═══════════════════════════════════════════════════════════════════════════════

# Strategic Growth Plan
## [Company Name] | Generated [Date]

---

## 1. EXECUTIVE SUMMARY

### Company Snapshot
- **Stage**: [Pre-revenue / Seed / Growth / Scale]
- **Revenue**: [ARR/MRR if known, or range]
- **Team Size**: [Number]
- **Primary Motion**: [Inbound / Outbound / PLG / Referral]
- **ICP**: [Ideal Customer Profile]

### Top 3 Revenue Blockers Identified
1. **[Problem #1]**: [One-line description]
2. **[Problem #2]**: [One-line description]
3. **[Problem #3]**: [One-line description]

### Priority Recommendation
[One paragraph: The single most important thing they should focus on first and why]

---

## 2. DETAILED DIAGNOSIS

### 2.1 [Problem Area #1]

**Current State**
[What they're doing today — use their own words where possible]

**The Gap**
[What's missing or broken]

**Root Cause Analysis**
[Why this is happening — be specific]

**Impact on Revenue**
[How this affects their bottom line — quantify if possible]

**Evidence from Discovery**
> "[Direct quote from user]"

---

### 2.2 [Problem Area #2]

[Same structure as above]

---

### 2.3 [Problem Area #3]

[Same structure as above]

---

## 3. BOTTLENECK MAP

[Describe how the problems interconnect]

**Cause → Effect Chain:**
- [Problem A] leads to → [Symptom B] which causes → [Revenue Impact C]
- [Problem D] compounds with → [Problem A] creating → [Systemic Issue E]

**The Core Issue:**
[One paragraph explaining the fundamental blocker that, if solved, would unlock the others]

---

## 4. 90-DAY ACTION PLAN

### Phase 1: Quick Wins (Days 1-14)
These are high-impact, low-effort changes that can show results immediately.

| Action | Owner | Effort | Expected Impact |
|--------|-------|--------|-----------------|
| [Action 1] | [Role] | [Hours/Days] | [Metric improvement] |
| [Action 2] | [Role] | [Hours/Days] | [Metric improvement] |
| [Action 3] | [Role] | [Hours/Days] | [Metric improvement] |

**Phase 1 Success Criteria:**
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

---

### Phase 2: Foundation Building (Days 15-45)
These actions establish the systems and processes needed for scale.

| Action | Owner | Effort | Expected Impact |
|--------|-------|--------|-----------------|
| [Action 1] | [Role] | [Days/Weeks] | [Outcome] |
| [Action 2] | [Role] | [Days/Weeks] | [Outcome] |
| [Action 3] | [Role] | [Days/Weeks] | [Outcome] |

**Phase 2 Success Criteria:**
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

---

### Phase 3: Optimization & Scale (Days 46-90)
With foundations in place, focus shifts to optimization and growth.

| Action | Owner | Effort | Expected Impact |
|--------|-------|--------|-----------------|
| [Action 1] | [Role] | [Weeks] | [Outcome] |
| [Action 2] | [Role] | [Weeks] | [Outcome] |
| [Action 3] | [Role] | [Weeks] | [Outcome] |

**Phase 3 Success Criteria:**
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

---

## 5. KEY METRICS TO TRACK

### Leading Indicators (Weekly)
These predict future success:
- **[Metric 1]**: [Current baseline if known] → Target: [Goal]
- **[Metric 2]**: [Current baseline if known] → Target: [Goal]
- **[Metric 3]**: [Current baseline if known] → Target: [Goal]

### Lagging Indicators (Monthly)
These confirm results:
- **[Metric 1]**: [Current baseline if known] → Target: [Goal]
- **[Metric 2]**: [Current baseline if known] → Target: [Goal]

### North Star Metric
**[Single most important metric]**: This is the one number that, if improved, indicates overall revenue health.

---

## 6. RESOURCE RECOMMENDATIONS

### Tools to Consider
Based on your current stack and challenges:
- **[Tool Category]**: [Specific recommendation] — [Why it helps]
- **[Tool Category]**: [Specific recommendation] — [Why it helps]

### Hiring Priorities
If/when you're ready to expand the team:
1. **[Role #1]**: [Why this role first]
2. **[Role #2]**: [Why this role second]

### Skills to Develop
For the existing team:
- [Skill area] — [Resource or training suggestion]

---

## 7. RISK FACTORS & MITIGATION

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [How to prevent or address] |
| [Risk 2] | High/Med/Low | High/Med/Low | [How to prevent or address] |
| [Risk 3] | High/Med/Low | High/Med/Low | [How to prevent or address] |

---

## 8. NEXT STEPS

### Immediate Actions (This Week)
1. [ ] [Specific action with clear outcome]
2. [ ] [Specific action with clear outcome]
3. [ ] [Specific action with clear outcome]

### Decision Points
- **By Day 14**: Evaluate [decision] based on [criteria]
- **By Day 30**: Decide on [decision] based on [results]
- **By Day 60**: Assess whether to [scale up / pivot / continue]

### When to Reassess This Plan
Schedule a review if:
- [Condition 1] occurs
- [Metric] doesn't improve by [threshold] in [timeframe]
- [External factor] changes significantly

---

## APPENDIX: DISCOVERY NOTES

### Key Quotes from Session
> "[Notable quote 1]"

> "[Notable quote 2]"

> "[Notable quote 3]"

### Areas Not Fully Explored
The following topics may warrant deeper investigation:
- [Topic 1]
- [Topic 2]

---

*Report generated by Revenue Architect | ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Return ONLY the markdown content. Do not wrap in code blocks or add any preamble.
The markdown should be clean and ready for PDF conversion.
`;

    // ═══════════════════════════════════════════════════════════════
    // CALL GEMINI FOR REPORT GENERATION
    // ═══════════════════════════════════════════════════════════════
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: REPORT_PROMPT }] }
          ],
          generationConfig: {
            temperature: 0.3, // Lower temperature for more consistent output
            maxOutputTokens: 8000
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      log('❌', 'Gemini API Error:', geminiResponse.status);
      throw new Error('Failed to generate report content');
    }

    const data = await geminiResponse.json();
    let reportMarkdown = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reportMarkdown) {
      throw new Error('Empty response from Gemini');
    }

    // Clean up any code block wrappers
    reportMarkdown = reportMarkdown
      .replace(/^```markdown\n?/i, '')
      .replace(/^```\n?/, '')
      .replace(/\n?```$/i, '')
      .trim();

    log('✅', 'Report markdown generated, length:', reportMarkdown.length);

    // ═══════════════════════════════════════════════════════════════
    // CONVERT MARKDOWN TO PDF
    // ═══════════════════════════════════════════════════════════════
    
    // Option 1: Return markdown (client can convert or display)
    // Option 2: Use a PDF generation service/library
    
    // For now, we'll try to generate PDF using a simple HTML-to-PDF approach
    // If you have access to a PDF library, replace this section

    let pdfBase64 = null;
    
    try {
      // Convert markdown to styled HTML
      const styledHtml = generateStyledHTML(reportMarkdown, diagnosticData);
      
      // Try to generate PDF using external service or library
      // This is a placeholder - you'll need to implement based on your infrastructure
      pdfBase64 = await generatePDF(styledHtml);
      
    } catch (pdfError) {
      log('⚠️', 'PDF generation failed, returning markdown:', pdfError.message);
    }

    // ═══════════════════════════════════════════════════════════════
    // RETURN RESPONSE
    // ═══════════════════════════════════════════════════════════════
    const companyName = extractCompanyName(diagnosticData, history);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Strategic_Growth_Plan_${companyName}_${dateStr}`.replace(/[^a-zA-Z0-9_-]/g, '_');

    const response = {
      success: true,
      report: reportMarkdown,
      filename: pdfBase64 ? `${filename}.pdf` : `${filename}.md`,
      format: pdfBase64 ? 'pdf' : 'markdown'
    };

    if (pdfBase64) {
      response.pdf_base64 = pdfBase64;
    }

    log('📤', `Report generated: ${response.filename}`);
    return res.status(200).json(response);

  } catch (error) {
    console.error('Report Generation Error:', error);
    return res.status(500).json({
      error: 'Failed to generate report',
      message: error.message
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Generate Styled HTML from Markdown
// ═══════════════════════════════════════════════════════════════
function generateStyledHTML(markdown, diagnosticData) {
  // Basic markdown to HTML conversion
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    // Checkboxes
    .replace(/\- \[ \] (.*$)/gim, '<li class="checkbox">☐ $1</li>')
    .replace(/\- \[x\] (.*$)/gim, '<li class="checkbox checked">☑ $1</li>')
    // Horizontal rules
    .replace(/^---$/gim, '<hr>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    // Tables (basic support)
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      const isHeader = cells.some(c => c.includes('---'));
      if (isHeader) return '';
      return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
    });

  // Wrap in styled document
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Strategic Growth Plan</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      background: white;
    }
    
    h1 {
      font-size: 28pt;
      font-weight: 700;
      color: #000;
      margin-bottom: 8px;
      border-bottom: 3px solid #CDFF00;
      padding-bottom: 12px;
    }
    
    h2 {
      font-size: 16pt;
      font-weight: 600;
      color: #111;
      margin-top: 32px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    h3 {
      font-size: 12pt;
      font-weight: 600;
      color: #333;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    
    p {
      margin-bottom: 12px;
    }
    
    strong {
      font-weight: 600;
      color: #000;
    }
    
    blockquote {
      border-left: 3px solid #CDFF00;
      padding-left: 16px;
      margin: 16px 0;
      color: #555;
      font-style: italic;
      background: #fafafa;
      padding: 12px 16px;
      border-radius: 0 4px 4px 0;
    }
    
    ul, ol {
      margin: 12px 0;
      padding-left: 24px;
    }
    
    li {
      margin-bottom: 6px;
    }
    
    li.checkbox {
      list-style: none;
      margin-left: -20px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 10pt;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 10px 12px;
      text-align: left;
    }
    
    th {
      background: #f5f5f5;
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background: #fafafa;
    }
    
    hr {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 32px 0;
    }
    
    .header-meta {
      color: #666;
      font-size: 10pt;
      margin-bottom: 32px;
    }
    
    .highlight-box {
      background: linear-gradient(135deg, #f8fff0 0%, #f0f9e8 100%);
      border: 1px solid #CDFF00;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 16px 0;
    }
    
    .metric-card {
      background: #f8f8f8;
      border-radius: 6px;
      padding: 16px;
      text-align: center;
    }
    
    .metric-value {
      font-size: 24pt;
      font-weight: 700;
      color: #000;
    }
    
    .metric-label {
      font-size: 9pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      h2 {
        page-break-after: avoid;
      }
      
      table, blockquote {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header-meta">
    Revenue Architect | Strategic Growth Plan | ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
  </div>
  
  <main>
    ${html}
  </main>
  
  <footer style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e0e0e0; color: #888; font-size: 9pt; text-align: center;">
    Generated by Revenue Architect by Panoramica | Confidential
  </footer>
</body>
</html>
`;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Generate PDF from HTML
// ═══════════════════════════════════════════════════════════════
async function generatePDF(html) {
  // Option 1: Use a serverless PDF service like:
  // - PDFShift (https://pdfshift.io)
  // - HTML2PDF API
  // - Browserless
  
  // Option 2: Use Puppeteer (requires more server resources)
  
  // Option 3: Return null and let client handle PDF generation
  
  // For Vercel/serverless, we recommend using an external API
  // Here's an example with PDFShift:
  
  const pdfshiftKey = process.env.PDFSHIFT_API_KEY;
  
  if (!pdfshiftKey) {
    console.log('PDF generation skipped: No PDFSHIFT_API_KEY configured');
    return null;
  }
  
  try {
    const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${pdfshiftKey}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: html,
        landscape: false,
        use_print: true,
        format: 'Letter',
        margin: '20mm'
      })
    });
    
    if (!response.ok) {
      throw new Error(`PDFShift error: ${response.status}`);
    }
    
    const pdfBuffer = await response.arrayBuffer();
    return Buffer.from(pdfBuffer).toString('base64');
    
  } catch (error) {
    console.error('PDFShift error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Extract Company Name
// ═══════════════════════════════════════════════════════════════
function extractCompanyName(diagnosticData, history) {
  // Try to extract from website URL
  if (diagnosticData.website) {
    try {
      const url = new URL(diagnosticData.website);
      const hostname = url.hostname.replace('www.', '');
      const name = hostname.split('.')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      // Fall through
    }
  }
  
  // Try to extract from conversation
  for (const msg of history) {
    if (msg.role === 'assistant') {
      try {
        const parsed = JSON.parse(msg.content);
        const message = parsed.message || '';
        // Look for company name patterns
        const match = message.match(/analyzed?\s+([A-Z][a-zA-Z0-9]+)/);
        if (match) return match[1];
      } catch {
        // Continue
      }
    }
  }
  
  return 'Company';
}
