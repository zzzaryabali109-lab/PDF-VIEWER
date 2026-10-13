import { jsPDF } from "jspdf";
import type { PdfDocumentData } from "./pdf-utils";

export function exportCleanedPdf(documentData: PdfDocumentData) {
  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
    orientation: "portrait",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54; // 0.75 in
  const contentWidth = pageWidth - margin * 2;

  documentData.pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage("letter", "portrait");
    }

    let y = margin;

    // Header
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      documentData.metadata.filename,
      margin,
      margin - 20
    );
    doc.text(
      "Processed with Adobe Acrobat Clean View",
      pageWidth - margin,
      margin - 20,
      { align: "right" }
    );

    // Rule below header
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(margin, margin - 12, pageWidth - margin, margin - 12);

    // Sections
    page.sections.forEach((section) => {
      // Check for page overflow
      if (y > pageHeight - margin - 30) {
        doc.addPage("letter", "portrait");
        y = margin;
      }

      if (section.type === "heading" && section.content) {
        y += 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(20, 20, 20);
        const splitHeading = doc.splitTextToSize(section.content, contentWidth);
        doc.text(splitHeading, margin, y);
        y += splitHeading.length * 20 + 8;
      } else if (section.type === "subheading" && section.content) {
        y += 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        const splitSub = doc.splitTextToSize(section.content, contentWidth);
        doc.text(splitSub, margin, y);
        y += splitSub.length * 16 + 6;
      } else if (section.type === "paragraph" && section.content) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        const splitPara = doc.splitTextToSize(section.content, contentWidth);
        doc.text(splitPara, margin, y);
        y += splitPara.length * 14 + 10;
      } else if (section.type === "list" && section.items) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        section.items.forEach((item) => {
          doc.text("•", margin + 6, y);
          const splitItem = doc.splitTextToSize(item, contentWidth - 20);
          doc.text(splitItem, margin + 18, y);
          y += splitItem.length * 14 + 4;
        });
        y += 6;
      } else if (section.type === "table" && section.tableData) {
        const { headers, rows } = section.tableData;
        const colCount = Math.max(headers.length, ...rows.map((r) => r.length));
        if (colCount > 0) {
          y += 6;
          const colWidth = contentWidth / colCount;
          const rowHeight = 20;

          // Table Header Background
          doc.setFillColor(245, 245, 248);
          doc.rect(margin, y, contentWidth, rowHeight, "F");
          doc.setDrawColor(220, 220, 225);
          doc.rect(margin, y, contentWidth, rowHeight, "S");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(30, 30, 30);
          headers.forEach((h, colIdx) => {
            doc.text(h, margin + colIdx * colWidth + 6, y + 13);
          });
          y += rowHeight;

          // Rows
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(50, 50, 50);

          rows.forEach((row, rowIdx) => {
            if (y > pageHeight - margin - 25) {
              doc.addPage("letter", "portrait");
              y = margin;
            }

            if (rowIdx % 2 === 1) {
              doc.setFillColor(250, 250, 252);
              doc.rect(margin, y, contentWidth, rowHeight, "F");
            }
            doc.setDrawColor(230, 230, 235);
            doc.rect(margin, y, contentWidth, rowHeight, "S");

            row.forEach((cell, cellIdx) => {
              doc.text(cell, margin + cellIdx * colWidth + 6, y + 13);
            });
            y += rowHeight;
          });
          y += 12;
        }
      }
    });

    // Footer
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - margin + 10, pageWidth - margin, pageHeight - margin + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Page ${page.pageNumber} of ${documentData.numPages}`,
      pageWidth / 2,
      pageHeight - margin + 22,
      { align: "center" }
    );
  });

  const cleanName = `${documentData.metadata.filename.replace(/\.pdf$/i, "")}_Cleaned.pdf`;
  doc.save(cleanName);
}
