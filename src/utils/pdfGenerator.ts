import { jsPDF } from 'jspdf';

function stripMarkdownFormatting(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
}

export function generateResumePDF(
  candidateName: string,
  companyName: string,
  markdownCV: string
): void {
  const doc = new jsPDF();

  const lineSpacing = 5.5;
  let cursorY = 18;
  const marginX = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxLineWidth = pageWidth - marginX * 2;

  const ensureSpace = (heightNeeded = 8) => {
    if (cursorY + heightNeeded > 278) {
      doc.addPage();
      cursorY = 18;
    }
  };

  // Document Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(17, 24, 39);
  const safeName = (candidateName || 'Candidate').trim();
  const titleLines = doc.splitTextToSize(safeName, maxLineWidth);
  for (const tLine of titleLines) {
    ensureSpace(8);
    doc.text(tLine, marginX, cursorY);
    cursorY += 7;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(107, 114, 128);
  const subtitle = `Tailored Resume · ${companyName || 'Target Role'}`;
  const subLines = doc.splitTextToSize(subtitle, maxLineWidth);
  for (const sLine of subLines) {
    ensureSpace(6);
    doc.text(sLine, marginX, cursorY);
    cursorY += 5.5;
  }

  cursorY += 2;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 7;

  const lines = (markdownCV || '').split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      cursorY += 2.5;
      continue;
    }

    if (/^---+$/.test(line)) {
      ensureSpace(6);
      cursorY += 1.5;
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
      cursorY += 5;
      continue;
    }

    if (line.startsWith('# ')) {
      ensureSpace(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(17, 24, 39);
      const wrapped = doc.splitTextToSize(stripMarkdownFormatting(line.slice(2).trim()), maxLineWidth);
      for (const w of wrapped) {
        ensureSpace(7);
        doc.text(w, marginX, cursorY);
        cursorY += 6.5;
      }
      cursorY += 1;
    } else if (line.startsWith('## ')) {
      ensureSpace(9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(37, 99, 235);
      const wrapped = doc.splitTextToSize(stripMarkdownFormatting(line.slice(3).trim()), maxLineWidth);
      for (const w of wrapped) {
        ensureSpace(6);
        doc.text(w, marginX, cursorY);
        cursorY += 6;
      }
    } else if (line.startsWith('### ')) {
      ensureSpace(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(37, 99, 235);
      const wrapped = doc.splitTextToSize(stripMarkdownFormatting(line.slice(4).trim()), maxLineWidth);
      for (const w of wrapped) {
        ensureSpace(6);
        doc.text(w, marginX, cursorY);
        cursorY += 5.8;
      }
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.8);
      doc.setTextColor(55, 65, 81);
      const cleanBullet = stripMarkdownFormatting(line.replace(/^[-*]\s*/, ''));
      const wrappedLines = doc.splitTextToSize(`•  ${cleanBullet}`, maxLineWidth - 4);
      for (const wLine of wrappedLines) {
        ensureSpace(6);
        doc.text(wLine, marginX + 3, cursorY);
        cursorY += lineSpacing;
      }
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.8);
      doc.setTextColor(55, 65, 81);
      const cleanLine = stripMarkdownFormatting(line);
      const wrappedLines = doc.splitTextToSize(cleanLine, maxLineWidth);
      for (const wLine of wrappedLines) {
        ensureSpace(6);
        doc.text(wLine, marginX, cursorY);
        cursorY += lineSpacing;
      }
    }
  }

  const cleanName = safeName.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const cleanCompany = (companyName || 'Target').replace(/[^a-zA-Z0-9_-]+/g, '_');
  doc.save(`${cleanName}_Resume_${cleanCompany}.pdf`);
}
