import { jsPDF } from 'jspdf';

export function generateResumePDF(candidateName: string, companyName: string, markdownCV: string) {
  const doc = new jsPDF();
  
  const lineSpacing = 6;
  let cursorY = 20;
  const marginX = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxLineWidth = pageWidth - marginX * 2;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(26, 43, 76); // Deep Navy Blue
  doc.text(candidateName, marginX, cursorY);
  cursorY += 8;

  // Subtitle
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Tailored Resume for Application to ${companyName}`, marginX, cursorY);
  cursorY += 10;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 8;

  // Parse lines from markdownCV
  const lines = markdownCV.split('\n');

  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      cursorY += 3;
      continue;
    }

    // Check page height overrun
    if (cursorY > 270) {
      doc.addPage();
      cursorY = 20;
    }

    if (line.startsWith('# ')) {
      // H1 Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(26, 43, 76);
      doc.text(line.replace('# ', '').trim(), marginX, cursorY);
      cursorY += 8;
    } else if (line.startsWith('### ')) {
      // H3 Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(41, 128, 185); // Blue Accent
      doc.text(line.replace('### ', '').trim(), marginX, cursorY);
      cursorY += 7;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Bullet point
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      const bulletText = `•  ${line.replace(/^[-*]\s*/, '')}`;
      const wrappedLines = doc.splitTextToSize(bulletText, maxLineWidth);
      for (const wLine of wrappedLines) {
        if (cursorY > 270) {
          doc.addPage();
          cursorY = 20;
        }
        doc.text(wLine, marginX + 3, cursorY);
        cursorY += lineSpacing;
      }
    } else {
      // Regular text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      // Strip markdown bold markers for clean PDF rendering
      const cleanLine = line.replace(/\*\*/g, '');
      const wrappedLines = doc.splitTextToSize(cleanLine, maxLineWidth);
      for (const wLine of wrappedLines) {
        if (cursorY > 270) {
          doc.addPage();
          cursorY = 20;
        }
        doc.text(wLine, marginX, cursorY);
        cursorY += lineSpacing;
      }
    }
  }

  const fileName = `${candidateName.replace(/\s+/g, '_')}_Resume_${companyName.replace(/\s+/g, '')}.pdf`;
  doc.save(fileName);
}
