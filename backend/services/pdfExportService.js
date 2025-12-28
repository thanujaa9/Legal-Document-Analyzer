const PDFDocument = require('pdfkit');

const generateAnalysisPDF = (analysis, documentName) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Analysis Report - ${documentName}`,
          Author: 'Legal Document Analyzer',
          Subject: 'AI-Powered Contract Analysis Report'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100;
      const pageHeight = doc.page.height;

      const addFooter = () => {
      };

      const checkPageBreak = (requiredSpace = 70) => {
        if (doc.y > pageHeight - 90 - requiredSpace) {
          addFooter();
          doc.addPage();
          doc.y = 60;
          return true;
        }
        return false;
      };

      /* =========================
         TITLE PAGE
      ========================= */

      doc
        .fontSize(32)
        .fillColor('#1e3a8a')
        .font('Helvetica-Bold')
        .text('Legal Document Analysis', 50, 80, { 
          align: 'center', 
          width: pageWidth 
        });

      doc
        .fontSize(26)
        .fillColor('#475569')
        .text('Report', 50, doc.y + 5, { 
          align: 'center', 
          width: pageWidth 
        });

      doc.moveDown(2);

      const boxY = doc.y;
      doc
        .roundedRect(80, boxY, pageWidth - 60, 60, 8)
        .fillAndStroke('#f8fafc', '#cbd5e1');

      doc
        .fontSize(11)
        .fillColor('#64748b')
        .font('Helvetica')
        .text('Document:', 100, boxY + 15, { width: pageWidth - 100 });

      doc
        .fontSize(13)
        .fillColor('#1e293b')
        .font('Helvetica-Bold')
        .text(documentName, 100, boxY + 32, { width: pageWidth - 100 });

      doc.moveDown(3);

      doc
        .fontSize(10)
        .fillColor('#64748b')
        .font('Helvetica')
        .text(
          `Generated: ${new Date().toLocaleString('en-US', {
            dateStyle: 'long',
            timeStyle: 'short'
          })}`,
          50,
          doc.y,
          { align: 'center', width: pageWidth }
        );

      doc.moveDown(3);

      const riskScore = analysis.overallRiskScore || 0;
      const riskColor =
        riskScore >= 80 ? '#991b1b' :
        riskScore >= 60 ? '#dc2626' :
        riskScore >= 40 ? '#f59e0b' :
        '#059669';

      const riskLabel =
        riskScore >= 80 ? 'CRITICAL RISK' :
        riskScore >= 60 ? 'HIGH RISK' :
        riskScore >= 40 ? 'MEDIUM RISK' :
        'LOW RISK';

      doc
        .fontSize(14)
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .text('OVERALL RISK SCORE', 50, doc.y, {
          align: 'center',
          width: pageWidth
        });

      doc.moveDown(0.5);

      doc
        .fontSize(80)
        .fillColor(riskColor)
        .font('Helvetica-Bold')
        .text(riskScore.toString(), 50, doc.y, {
          align: 'center',
          width: pageWidth
        });

      doc.moveDown(0.3);

      doc
        .fontSize(12)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text('out of 100', 50, doc.y, {
          align: 'center',
          width: pageWidth
        });

      doc.moveDown(0.5);

      doc
        .fontSize(16)
        .fillColor(riskColor)
        .font('Helvetica-Bold')
        .text(riskLabel, 50, doc.y, {
          align: 'center',
          width: pageWidth
        });

      doc.moveDown(3);

      const statsY = doc.y;
      const statWidth = 150;
      const statGap = 20;
      const statsStartX = (doc.page.width - (3 * statWidth + 2 * statGap)) / 2;

      const stats = [
        { label: 'Clauses', value: analysis.clauses?.length || 0 },
        { label: 'Risks', value: analysis.risks?.length || 0 },
        { label: 'Findings', value: analysis.keyFindings?.length || 0 }
      ];

      stats.forEach((stat, idx) => {
        const x = statsStartX + (idx * (statWidth + statGap));

        doc
          .roundedRect(x, statsY, statWidth, 70, 8)
          .fillAndStroke('#f8fafc', '#cbd5e1');

        doc
          .fontSize(36)
          .fillColor('#1e3a8a')
          .font('Helvetica-Bold')
          .text(stat.value.toString(), x, statsY + 15, {
            align: 'center',
            width: statWidth
          });

        doc
          .fontSize(10)
          .fillColor('#64748b')
          .font('Helvetica')
          .text(stat.label.toUpperCase(), x, statsY + 52, {
            align: 'center',
            width: statWidth
          });
      });

      addFooter();

      /* =========================
     EXECUTIVE SUMMARY, KEY FINDINGS & RISKS
      ========================= */

      doc.addPage();
      doc.y = 60;

      doc
        .fontSize(18)
        .fillColor('#1e3a8a')
        .font('Helvetica-Bold')
        .text('Executive Summary', 50, doc.y);

      doc.moveDown(0.8);

      doc
        .fontSize(10)
        .fillColor('#1e293b')
        .font('Helvetica')
        .text(analysis.summary || 'No summary available.', 50, doc.y, {
          align: 'justify',
          width: pageWidth,
          lineGap: 3
        });

      doc.moveDown(1.5);

      if (analysis.keyFindings?.length) {
        checkPageBreak(60);

        doc
          .fontSize(18)
          .fillColor('#1e3a8a')
          .font('Helvetica-Bold')
          .text('Key Findings', 50, doc.y);

        doc.moveDown(0.8);

        analysis.keyFindings.forEach((finding, idx) => {
          checkPageBreak(35);

          doc
            .fontSize(10)
            .fillColor('#1e293b')
            .font('Helvetica-Bold')
            .text(`${idx + 1}. `, 50, doc.y, { continued: true })
            .font('Helvetica')
            .text(finding, {
              width: pageWidth,
              lineGap: 2
            });

          doc.moveDown(0.4);
        });

        doc.moveDown(1);
      }

      /* Identified Risks */
      checkPageBreak(60);

      doc
        .fontSize(18)
        .fillColor('#1e3a8a')
        .font('Helvetica-Bold')
        .text('Identified Risks', 50, doc.y);

      doc.moveDown(0.8);

      const severityColors = {
        low: '#059669',
        medium: '#f59e0b',
        high: '#dc2626',
        critical: '#991b1b'
      };

      if (analysis.risks?.length) {
        analysis.risks.forEach((risk, idx) => {
          checkPageBreak(70);

          const color = severityColors[risk.severity?.toLowerCase()] || '#64748b';

          // Risk number and category
          doc
            .fontSize(11)
            .fillColor(color)
            .font('Helvetica-Bold')
            .text(`${idx + 1}. ${risk.category}`, 50, doc.y, { continued: true })
            .fontSize(9)
            .text(` [${risk.severity?.toUpperCase()}]`);

          doc.moveDown(0.3);

          
          doc
            .fontSize(9)
            .fillColor('#dc2626')
            .font('Helvetica-Bold')
            .text('Issue: ', 70, doc.y, { continued: true })
            .fillColor('#1e293b')
            .font('Helvetica')
            .text(risk.description, { width: pageWidth - 20, lineGap: 2 });

          doc.moveDown(0.3);

         
          doc
            .fontSize(9)
            .fillColor('#059669')
            .font('Helvetica-Bold')
            .text('Recommendation: ', 70, doc.y, { continued: true })
            .fillColor('#1e293b')
            .font('Helvetica')
            .text(risk.recommendation, { width: pageWidth - 20, lineGap: 2 });

          doc.moveDown(0.8);
        });
      }

      addFooter();

      /* =========================
        EXTRACTED CLAUSES
      ========================= */

      doc.addPage();
      doc.y = 60;

      doc
        .fontSize(18)
        .fillColor('#1e3a8a')
        .font('Helvetica-Bold')
        .text('Extracted Clauses', 50, doc.y);

      doc.moveDown(0.8);

      const clauseColors = {
        low: '#059669',
        medium: '#f59e0b',
        high: '#dc2626',
        critical: '#991b1b'
      };

      if (analysis.clauses?.length) {
        analysis.clauses.forEach((clause, idx) => {
          checkPageBreak(90);

          const color = clauseColors[clause.riskLevel?.toLowerCase()] || '#64748b';

       
          doc
            .fontSize(11)
            .fillColor(color)
            .font('Helvetica-Bold')
            .text(
              `${idx + 1}. ${clause.type?.toUpperCase() || 'CLAUSE'}`,
              50,
              doc.y,
              { continued: true }
            )
            .fontSize(9)
            .text(` [${clause.riskLevel?.toUpperCase()}]`);

          doc.moveDown(0.3);

         
          doc
            .fontSize(9)
            .fillColor('#475569')
            .font('Helvetica-Oblique')
            .text(`"${clause.text}"`, 70, doc.y, {
              width: pageWidth - 20,
              lineGap: 1
            });

          doc.moveDown(0.3);

          doc
            .fontSize(9)
            .fillColor('#64748b')
            .font('Helvetica-Bold')
            .text('Analysis: ', 70, doc.y, { continued: true })
            .fillColor('#1e293b')
            .font('Helvetica')
            .text(clause.explanation, { width: pageWidth - 20, lineGap: 1 });

          if (clause.notes?.length) {
            doc.moveDown(0.3);

            doc
              .fontSize(9)
              .fillColor('#64748b')
              .font('Helvetica-Bold')
              .text('Notes:', 70, doc.y);

            clause.notes.forEach(note => {
              doc
                .fontSize(8)
                .fillColor('#64748b')
                .font('Helvetica')
                .text(`• ${note.text}`, 90, doc.y, {
                  width: pageWidth - 40,
                  lineGap: 1
                });
            });
          }

          doc.moveDown(0.8);
        });
      }

      doc.moveDown(1.5);
      
      if (doc.y > pageHeight - 120) {
        addFooter();
        doc.addPage();
        doc.y = 60;
      }

      doc
        .fontSize(9)
        .fillColor('#78350f')
        .font('Helvetica-Bold')
        .text('Disclaimer: ', 50, doc.y, { continued: true })
        .font('Helvetica')
        .fillColor('#64748b')
        .text(
          'This analysis was generated using AI technology and should be reviewed by a qualified legal professional before making any legal decisions.',
          {
            width: pageWidth,
            lineGap: 2
          }
        );

      doc.moveDown(1);

      const metadata = [];
      metadata.push(`Generated: ${new Date().toLocaleString()}`);
      metadata.push(`AI Model: ${analysis.aiModel || 'GPT-4o-mini'}`);
      if (analysis.tokensUsed) metadata.push(`Tokens: ${analysis.tokensUsed.toLocaleString()}`);
      if (analysis.processingTime) metadata.push(`Time: ${(analysis.processingTime / 1000).toFixed(2)}s`);

      doc
        .fontSize(7)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text(metadata.join(' | '), 50, doc.y, {
          align: 'left',
          width: pageWidth
        });

      addFooter();
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateAnalysisPDF };