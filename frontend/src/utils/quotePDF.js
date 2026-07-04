import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function generateQuotePDF(quote, companyInfo = {}) {
  const doc = new jsPDF();
  const blue = [37, 99, 235];
  const gray = [100, 116, 139];
  const dark = [15, 23, 42];

  // Header bar
  doc.setFillColor(...blue);
  doc.rect(0, 0, 210, 32, 'F');

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.company_name || 'Integra SYS', 14, 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(companyInfo.cnpj ? `CNPJ: ${companyInfo.cnpj}` : '', 14, 22);
  doc.text(companyInfo.email || '', 14, 27);

  // Quote number + date
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`ORÇAMENTO ${quote.quote_number || ''}`, 196, 15, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const createdDate = quote.created_at ? new Date(quote.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  doc.text(`Data: ${createdDate}`, 196, 22, { align: 'right' });
  const expiresDate = quote.expires_at ? new Date(quote.expires_at).toLocaleDateString('pt-BR') : '';
  if (expiresDate) doc.text(`Validade: ${expiresDate}`, 196, 27, { align: 'right' });

  // Client info
  doc.setTextColor(...dark);
  let y = 42;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(quote.client_name || 'Consumidor Final', 14, y);
  if (quote.client_document) { y += 5; doc.text(`CPF/CNPJ: ${quote.client_document}`, 14, y); }
  if (quote.client_email) { y += 5; doc.text(`Email: ${quote.client_email}`, 14, y); }
  if (quote.client_phone) { y += 5; doc.text(`Tel: ${quote.client_phone}`, 14, y); }

  // Items table
  y += 10;
  const items = (quote.items || []).map((item, i) => [
    i + 1,
    item.product_name || '',
    item.quantity || 0,
    formatBRL(item.unit_price || 0),
    formatBRL(item.discount || 0),
    formatBRL((item.quantity || 0) * (item.unit_price || 0) - (item.discount || 0)),
  ]);

  doc.autoTable({
    startY: y,
    head: [['#', 'Produto / Serviço', 'Qtd', 'Valor Unit.', 'Desconto', 'Subtotal']],
    body: items,
    styles: { fontSize: 8, cellPadding: 3, textColor: dark },
    headStyles: { fillColor: [241, 245, 249], textColor: dark, fontStyle: 'bold', lineWidth: 0 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  // Totals
  const finalY = doc.lastAutoTable.finalY + 6;
  const totalsX = 150;

  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text('Subtotal:', totalsX, finalY);
  doc.setTextColor(...dark);
  doc.text(formatBRL(quote.subtotal || 0), 196, finalY, { align: 'right' });

  if (quote.discount > 0) {
    doc.setTextColor(239, 68, 68);
    doc.text('Desconto:', totalsX, finalY + 6);
    doc.text(`-${formatBRL(quote.discount)}`, 196, finalY + 6, { align: 'right' });
  }

  const totalY = finalY + (quote.discount > 0 ? 14 : 8);
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.5);
  doc.line(totalsX, totalY - 2, 196, totalY - 2);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...blue);
  doc.text('TOTAL:', totalsX, totalY + 4);
  doc.text(formatBRL(quote.total || 0), 196, totalY + 4, { align: 'right' });

  // Notes
  if (quote.notes) {
    const notesY = totalY + 16;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...dark);
    doc.text('OBSERVAÇÕES', 14, notesY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gray);
    const lines = doc.splitTextToSize(quote.notes, 180);
    doc.text(lines, 14, notesY + 6);
  }

  // Footer
  const pageH = doc.internal.pageSize.height;
  doc.setFontSize(7);
  doc.setTextColor(160, 174, 192);
  doc.text('Documento gerado pelo Integra SYS | Este orçamento não tem valor fiscal', 105, pageH - 10, { align: 'center' });
  doc.text(`${companyInfo.company_name || 'Integra SYS'} - ${companyInfo.phone || ''} - ${companyInfo.email || ''}`, 105, pageH - 6, { align: 'center' });

  return doc;
}

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}
