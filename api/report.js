// PDF REPORT GENERATOR using jsPDF
// Install: npm install jspdf

import { jsPDF } from 'jspdf';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const log = (msg) => console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${msg}`);

  try {
    const { history = [], diagnosticData = {} } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return res.status(500).json({ error: 'Missing API Key' });
    }

    if (!history || history.length === 0) {
      return res.status(400).json({ error: 'No conversation history' });
    }

    log(`📊 Generating PDF report from ${history.length} messages`);

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

    // Get structured data from Gemini
    const reportData = await generateReportData(geminiKey, conversationSummary, diagnosticData);
    
    if (!reportData) {
      return res.status(500).json({ error: 'Failed to generate report data' });
    }

    // Generate PDF
    const pdfBase64 = generatePDF(reportData);
    
    const filename = `Panoramica_Strategic_Growth_Plan_${new Date().toISOString().split('T')[0]}.pdf`;

    log(`✅ PDF generated successfully`);
    
    return res.status(200).json({ 
      pdf: pdfBase64,
      filename: filename,
      format: 'pdf',
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Report Error:', error);
    return res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
}

async function generateReportData(apiKey, conversation, diagnosticData) {
  const prompt = `
Analyze this diagnostic conversation and extract structured data for a report.

CONVERSATION:
${conversation}

ADDITIONAL CONTEXT:
${JSON.stringify(diagnosticData)}

Respond with ONLY valid JSON:

{
  "company_name": "string",
  "date": "${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}",
  "executive_summary": "2-3 paragraph summary of situation, challenge, and recommendation",
  "company_profile": {
    "stage": "string",
    "revenue": "string", 
    "model": "string",
    "gtm_motion": "string",
    "team_size": "string"
  },
  "primary_challenge": {
    "title": "3-5 word title",
    "description": "detailed paragraph",
    "evidence": ["point 1", "point 2", "point 3"],
    "root_cause": "string"
  },
  "benchmarks": [
    {"metric": "string", "current": "string", "benchmark": "string", "gap": "string"}
  ],
  "recommendations": {
    "immediate": [
      {"title": "string", "description": "string", "owner": "string", "timeline": "string"}
    ],
    "short_term": [
      {"title": "string", "description": "string", "owner": "string", "timeline": "string"}
    ],
    "strategic": [
      {"title": "string", "description": "string", "owner": "string", "timeline": "string"}
    ]
  },
  "kpis": [
    {"metric": "string", "current": "string", "target": "string", "timeline": "string"}
  ],
  "next_steps": ["step 1", "step 2", "step 3"]
}

Use ACTUAL information from conversation. Be specific and actionable.
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) return null;
    
    return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  } catch (e) {
    console.error('Gemini error:', e);
    return null;
  }
}

function generatePDF(data) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // Colors
  const lime = [205, 255, 0];
  const dark = [3, 3, 3];
  const grey = [128, 128, 128];
  const white = [255, 255, 255];

  // Helper functions
  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const checkPageBreak = (needed = 30) => {
    if (y + needed > pageHeight - margin) {
      addPage();
      return true;
    }
    return false;
  };

  const drawText = (text, x, yPos, options = {}) => {
    const { 
      size = 10, 
      color = dark, 
      style = 'normal',
      maxWidth = contentWidth,
      align = 'left'
    } = options;
    
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setFont('helvetica', style);
    
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, yPos, { align });
    
    return lines.length * (size * 0.4);
  };

  const drawSection = (title) => {
    checkPageBreak(25);
    y += 8;
    doc.setFillColor(...lime);
    doc.rect(margin, y, 3, 8, 'F');
    drawText(title.toUpperCase(), margin + 8, y + 6, { size: 14, style: 'bold' });
    y += 15;
  };

  const drawSubsection = (title) => {
    checkPageBreak(15);
    y += 5;
    drawText(title, margin, y, { size: 11, style: 'bold' });
    y += 7;
  };

  const drawParagraph = (text) => {
    checkPageBreak(20);
    const height = drawText(text, margin, y, { size: 10, color: grey });
    y += height + 5;
  };

  const drawBullet = (text) => {
    checkPageBreak(10);
    doc.setFillColor(...lime);
    doc.circle(margin + 2, y - 1, 1.5, 'F');
    const height = drawText(text, margin + 8, y, { size: 10, maxWidth: contentWidth - 10 });
    y += height + 3;
  };

  // ═══════════════════════════════════════════════════════════════
  // COVER PAGE
  // ═══════════════════════════════════════════════════════════════
  
  // Background
  doc.setFillColor(...dark);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Logo area
  doc.setFillColor(...lime);
  doc.rect(margin, 40, 50, 12, 'F');
  doc.setTextColor(...dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PANORAMICA', margin + 5, 48);
  
  // Title
  doc.setTextColor(...white);
  doc.setFontSize(36);
  doc.text('Strategic', margin, 90);
  doc.text('Growth Plan', margin, 105);
  
  // Company name
  doc.setFontSize(18);
  doc.setTextColor(...lime);
  doc.text(data.company_name || 'Client Company', margin, 130);
  
  // Date
  doc.setFontSize(12);
  doc.setTextColor(...grey);
  doc.text(data.date, margin, 145);
  
  // Footer line
  doc.setDrawColor(...lime);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
  
  doc.setFontSize(9);
  doc.setTextColor(...grey);
  doc.text('Prepared by Revenue Architect | Panoramica', margin, pageHeight - 22);
  doc.text('CONFIDENTIAL', pageWidth - margin, pageHeight - 22, { align: 'right' });

  // ═══════════════════════════════════════════════════════════════
  // CONTENT PAGES
  // ═══════════════════════════════════════════════════════════════
  addPage();

  // Executive Summary
  drawSection('Executive Summary');
  drawParagraph(data.executive_summary || 'Executive summary not available.');

  // Company Profile
  drawSection('Company Profile');
  
  const profile = data.company_profile || {};
  const profileItems = [
    ['Stage', profile.stage || 'Not specified'],
    ['Revenue', profile.revenue || 'Not disclosed'],
    ['Business Model', profile.model || 'Not specified'],
    ['GTM Motion', profile.gtm_motion || 'Not specified'],
    ['Team Size', profile.team_size || 'Not specified']
  ];

  profileItems.forEach(([label, value]) => {
    checkPageBreak(8);
    drawText(`${label}:`, margin, y, { size: 10, style: 'bold' });
    drawText(value, margin + 40, y, { size: 10, color: grey });
    y += 6;
  });

  // Primary Challenge
  drawSection('Diagnostic Findings');
  
  const challenge = data.primary_challenge || {};
  drawSubsection(challenge.title || 'Primary Challenge');
  drawParagraph(challenge.description || 'Challenge description not available.');
  
  if (challenge.evidence?.length) {
    y += 3;
    drawText('Supporting Evidence:', margin, y, { size: 10, style: 'bold' });
    y += 6;
    challenge.evidence.forEach(e => drawBullet(e));
  }
  
  if (challenge.root_cause) {
    y += 3;
    drawText('Root Cause:', margin, y, { size: 10, style: 'bold' });
    y += 6;
    drawParagraph(challenge.root_cause);
  }

  // Benchmarks
  if (data.benchmarks?.length) {
    drawSection('Industry Benchmarks');
    
    // Table header
    checkPageBreak(30);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.text('Metric', margin + 2, y + 5.5);
    doc.text('Current', margin + 50, y + 5.5);
    doc.text('Benchmark', margin + 90, y + 5.5);
    doc.text('Gap', margin + 130, y + 5.5);
    y += 10;
    
    doc.setFont('helvetica', 'normal');
    data.benchmarks.forEach(b => {
      checkPageBreak(8);
      doc.setTextColor(...grey);
      doc.text(b.metric || '-', margin + 2, y + 4);
      doc.text(b.current || '-', margin + 50, y + 4);
      doc.text(b.benchmark || '-', margin + 90, y + 4);
      doc.text(b.gap || '-', margin + 130, y + 4);
      y += 7;
    });
  }

  // Recommendations
  drawSection('Strategic Recommendations');
  
  const recs = data.recommendations || {};
  
  if (recs.immediate?.length) {
    drawSubsection('Immediate Actions (Days 1-30)');
    recs.immediate.forEach((r, i) => {
      checkPageBreak(20);
      drawText(`${i + 1}. ${r.title}`, margin, y, { size: 10, style: 'bold' });
      y += 5;
      drawParagraph(r.description);
      if (r.owner) {
        drawText(`Owner: ${r.owner} | Timeline: ${r.timeline || 'Immediate'}`, margin, y, { size: 9, color: grey });
        y += 6;
      }
    });
  }
  
  if (recs.short_term?.length) {
    drawSubsection('Foundation Building (Days 31-60)');
    recs.short_term.forEach((r, i) => {
      checkPageBreak(20);
      drawText(`${i + 1}. ${r.title}`, margin, y, { size: 10, style: 'bold' });
      y += 5;
      drawParagraph(r.description);
    });
  }
  
  if (recs.strategic?.length) {
    drawSubsection('Strategic Initiatives (Days 61-90+)');
    recs.strategic.forEach((r, i) => {
      checkPageBreak(20);
      drawText(`${i + 1}. ${r.title}`, margin, y, { size: 10, style: 'bold' });
      y += 5;
      drawParagraph(r.description);
    });
  }

  // KPIs
  if (data.kpis?.length) {
    drawSection('Success Metrics & KPIs');
    
    data.kpis.forEach(kpi => {
      checkPageBreak(15);
      drawText(kpi.metric, margin, y, { size: 10, style: 'bold' });
      y += 5;
      drawText(`Current: ${kpi.current} → Target: ${kpi.target} (${kpi.timeline})`, margin, y, { size: 10, color: grey });
      y += 8;
    });
  }

  // Next Steps
  if (data.next_steps?.length) {
    drawSection('Recommended Next Steps');
    data.next_steps.forEach((step, i) => {
      checkPageBreak(10);
      drawText(`${i + 1}.`, margin, y, { size: 10, style: 'bold', color: lime });
      drawText(step, margin + 8, y, { size: 10 });
      y += 8;
    });
  }

  // Final page footer
  checkPageBreak(30);
  y = pageHeight - 40;
  doc.setDrawColor(...lime);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(...grey);
  doc.text('This Strategic Growth Plan was generated by Panoramica Revenue Architect.', margin, y);
  y += 5;
  doc.text('For implementation support, contact your account manager.', margin, y);

  // Convert to base64
  return doc.output('datauristring').split(',')[1];
}
