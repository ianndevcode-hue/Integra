import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function exportPDF(title, columns, data, filename = 'relatorio') {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 28);
  
  doc.autoTable({
    startY: 35,
    head: [columns.map(c => c.header)],
    body: data.map(row => columns.map(c => c.accessor ? row[c.accessor] : (c.getValue ? c.getValue(row) : ''))),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
  });
  
  doc.save(`${filename}.pdf`);
}

export function exportExcel(title, columns, data, filename = 'relatorio') {
  const wsData = [columns.map(c => c.header)];
  data.forEach(row => {
    wsData.push(columns.map(c => c.accessor ? row[c.accessor] : (c.getValue ? c.getValue(row) : '')));
  });
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
