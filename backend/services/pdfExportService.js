// backend/services/pdfExportService.js
const PDFDocument = require('pdfkit');
const path = require('path');

const FONT_PATH = path.join(
  __dirname,
  '../assets/fonts/Inter-Regular.ttf'
);

const generateAnalysisPDF = (analysis, documentName) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // ✅ Use Unicode font (fixes symbols & spacing issues)
      doc.font(FONT_PATH);

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      /* =========================
         TITLE PAGE
      ========================= */

      doc
        .fontSize(20)
        .fillColor('#2c3e50')
        .text('Legal Document Analysis Report', { align: 'center' });

      doc.moveDown(2);

      doc
        .fontSize(12)
        .fillColor('#7f8c8d')
        .text(`Document: ${documentName}`, { align: 'center' });

      doc.moveDown(0.5);

      doc
        .fontSize(10)
        .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

      doc.moveDown(3);

      /* =========================
         RISK SCORE
      ========================= */

      doc
        .fontSize(16)
        .fillColor('#2c3e50')
        .text('Overall Risk Score', { align: 'center' });

      doc.moveDown(0.5);

      const riskScore = analysis.overallRiskScore || 0;
      const riskColor =
        riskScore > 70 ? '#e74c3c' :
        riskScore > 40 ? '#f39c12' :
        '#27ae60';

      doc
        .fontSize(48)
        .fillColor(riskColor)
        .text(`${riskScore}`, { align: 'center' });

      doc
        .fontSize(12)
        .fillColor('#7f8c8d')
        .text('out of 100', { align: 'center' });

      doc.addPage();

      /* =========================
         EXECUTIVE SUMMARY (BLUE)
      ========================= */

      doc
        .fontSize(14)
        .fillColor('#2980b9') // BLUE
        .text('Executive Summary');

      doc.moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor('#2c3e50')
        .text(analysis.summary || 'No summary available.', {
          align: 'justify',
          lineGap: 3
        });

      doc.moveDown(2);

      /* =========================
         KEY FINDINGS (BLUE)
      ========================= */

      if (analysis.keyFindings?.length) {
        doc
          .fontSize(14)
          .fillColor('#2980b9') // BLUE
          .text('Key Findings');

        doc.moveDown(0.5);

        analysis.keyFindings.forEach((finding, idx) => {
          doc
            .fontSize(10)
            .fillColor('#2c3e50')
            .text(`${idx + 1}. ${finding}`, { paragraphGap: 5 });
        });

        doc.moveDown(2);
      }

      /* =========================
         IDENTIFIED RISKS (BLUE)
      ========================= */

      doc
        .fontSize(14)
        .fillColor('#2980b9') // BLUE
        .text('Identified Risks');

      doc.moveDown(0.5);

      analysis.risks?.forEach((risk, idx) => {
        const severityColors = {
          low: '#27ae60',
          medium: '#f39c12',
          high: '#e74c3c',
          critical: '#c0392b'
        };

        // Risk Title (severity-based)
        doc
          .fontSize(11)
          .fillColor(severityColors[risk.severity?.toLowerCase()] || '#7f8c8d')
          .text(
            `${idx + 1}. ${risk.category.toUpperCase()} - ${risk.severity.toUpperCase()}`
          );

        doc.moveDown(0.3);

        // 🔴 Description (RED)
        doc
          .fontSize(10)
          .fillColor('#c0392b')
          .text(`Description: ${risk.description}`, { indent: 20 });

        doc.moveDown(0.3);

        // 🟢 Recommendation (GREEN)
        doc
          .fontSize(10)
          .fillColor('#27ae60')
          .text(`Recommendation: ${risk.recommendation}`, { indent: 20 });

        doc.moveDown(1);
      });

      doc.addPage();

      /* =========================
         EXTRACTED CLAUSES
      ========================= */

      doc
        .fontSize(14)
        .fillColor('#2c3e50')
        .text('Extracted Clauses');

      doc.moveDown(0.5);

      analysis.clauses?.forEach((clause, idx) => {
        if (doc.y > 650) doc.addPage();

        const clauseColors = {
          low: '#27ae60',
          medium: '#f39c12',
          high: '#e74c3c',
          critical: '#c0392b'
        };

        doc
          .fontSize(11)
          .fillColor(clauseColors[clause.riskLevel?.toLowerCase()] || '#7f8c8d')
          .text(
            `${idx + 1}. ${clause.type.toUpperCase()} - ${clause.riskLevel.toUpperCase()}`
          );

        doc.moveDown(0.3);

        doc
          .fontSize(9)
          .fillColor('#34495e')
          .text(`"${clause.text}"`, { indent: 20 });

        doc.moveDown(0.3);

        doc
          .fontSize(9)
          .fillColor('#2c3e50')
          .text(`Explanation: ${clause.explanation}`, { indent: 20 });

        if (clause.notes?.length) {
          doc.moveDown(0.3);
          doc
            .fontSize(9)
            .fillColor('#2c3e50')
            .text('Notes:', { indent: 20 });

          clause.notes.forEach(note => {
            doc
              .fontSize(8)
              .fillColor('#7f8c8d')
              .text(`- ${note.text}`, { indent: 30 });
          });
        }

        doc.moveDown(1);
      });

      /* =========================
         FOOTER
      ========================= */

      doc.addPage();

      doc
        .fontSize(10)
        .fillColor('#95a5a6')
        .text(
          'This analysis was generated using AI and should be reviewed by a legal professional.',
          { align: 'center' }
        );

      doc.moveDown(0.5);

      doc
        .fontSize(8)
        .text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateAnalysisPDF };
