const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.resolve(process.env.DATA_PATH || './data');
fs.mkdirSync(DATA_PATH, { recursive: true });

function formatMoney(value) {
  return value.toFixed(2).replace('.', ',');
}

function generateNFSEDocument(nfse, company, client, items) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(DATA_PATH, `nfse-${nfse.numero}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const primaryColor = '#2563EB';
    const secondaryColor = '#475569';
    const borderColor = '#E2E8F0';

    doc.rect(0, 0, doc.page.width, 140).fill(primaryColor);
    doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('INTEGRA CODE', 50, 50);
    doc.fontSize(12).font('Helvetica').text('Nota Fiscal de Servico Eletronica - NFS-e', 50, 80);
    doc.fontSize(10).text(`${company.razaoSocial} | CNPJ: ${company.cnpj}`, 50, 100);

    doc.fillColor('#000000').fontSize(10).font('Helvetica');
    doc.text(`Numero: ${nfse.numero}`, 50, 160);
    doc.text(`Competencia: ${nfse.competencia}`, 50, 175);
    doc.text(`Data/Hora Emissao: ${nfse.dataEmissao}`, 50, 190);
    doc.text(`Natureza da Operacao: ${nfse.naturezaOperacao || 'Prestacao de Servicos'}`, 50, 205);
    doc.text(`Regime Especial: ${nfse.regimeEspecial || 'Nenhum'}`, 50, 220);

    doc.moveTo(50, 240).lineTo(550, 240).strokeColor(borderColor).stroke();

    doc.font('Helvetica-Bold').fontSize(11).fillColor(primaryColor).text('PRESTADOR DE SERVICOS', 50, 250);
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    doc.text(`${company.razaoSocial}`, 50, 265);
    doc.text(`CNPJ: ${company.cnpj}`, 50, 280);
    doc.text(`Inscr. Municipal: ${company.inscricaoMunicipal}`, 50, 295);
    doc.text(`${company.endereco}, ${company.numero} ${company.complemento || ''}`, 50, 310);
    doc.text(`${company.bairro} - ${company.cidade}/${company.uf} - CEP: ${company.cep}`, 50, 325);
    doc.text(`Tel: ${company.telefone} | Email: ${company.email}`, 50, 340);

    doc.moveTo(50, 360).lineTo(550, 360).strokeColor(borderColor).stroke();

    doc.font('Helvetica-Bold').fontSize(11).fillColor(primaryColor).text('TOMADOR DE SERVICOS', 50, 370);
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    if (client) {
      doc.text(`${client.razaoSocial || client.nome}`, 50, 385);
      doc.text(`Doc: ${client.cpfCnpj}`, 50, 400);
      doc.text(`Inscr. Municipal: ${client.inscricaoMunicipal || 'Nao informada'}`, 50, 415);
      if (client.endereco) {
        doc.text(`${client.endereco}, ${client.numero || 'SN'} ${client.complemento || ''}`, 50, 430);
        doc.text(`${client.bairro || ''} - ${client.cidade || ''}/${client.uf || ''} - CEP: ${client.cep || ''}`, 50, 445);
      }
    } else {
      doc.text('Consumidor Final / Nao informado', 50, 385);
    }

    doc.moveTo(50, 470).lineTo(550, 470).strokeColor(borderColor).stroke();

    doc.font('Helvetica-Bold').fontSize(11).fillColor(primaryColor).text('DISCRIMINACAO DOS SERVICOS', 50, 480);

    const tableTop = 500;
    const colX = [50, 280, 350, 420, 550];
    const headers = ['Item', 'Descricao', 'Qtde', 'Valor Unit.', 'Valor Total'];
    doc.font('Helvetica-Bold').fontSize(9);
    headers.forEach((h, i) => doc.text(h, colX[i], tableTop));

    doc.moveTo(50, tableTop + 12).lineTo(550, tableTop + 12).strokeColor(borderColor).stroke();

    let y = tableTop + 20;
    doc.font('Helvetica').fontSize(9);
    items.forEach((item, idx) => {
      doc.text(`${idx + 1}`, colX[0], y);
      doc.text(item.descricao.substring(0, 40), colX[1], y);
      doc.text(String(item.quantidade || 1), colX[2], y);
      doc.text(`R$ ${formatMoney(item.valorUnitario)}`, colX[3], y);
      doc.text(`R$ ${formatMoney(item.valorTotal)}`, colX[4], y);
      y += 14;
    });

    y += 10;
    doc.moveTo(350, y).lineTo(550, y).strokeColor(borderColor).stroke();
    y += 14;

    const issRetido = nfse.issRetido === 'S';
    doc.font('Helvetica');
    doc.text('Valor Servicos:', 350, y);
    doc.text(`R$ ${formatMoney(nfse.valorServicos)}`, colX[4], y);
    y += 14;
    doc.text('Descontos:', 350, y);
    doc.text(`R$ ${formatMoney(nfse.desconto || 0)}`, colX[4], y);
    y += 14;
    doc.text('Deducoes:', 350, y);
    doc.text(`R$ ${formatMoney(nfse.deducoes || 0)}`, colX[4], y);
    y += 14;
    doc.text('Base de Calculo ISS:', 350, y);
    doc.text(`R$ ${formatMoney(nfse.baseCalculoIss)}`, colX[4], y);
    y += 14;
    doc.text(`ISS Retido: ${issRetido ? 'Sim' : 'Nao'}`, 350, y);
    y += 14;
    doc.text('Valor ISS:', 350, y);
    doc.text(`R$ ${formatMoney(nfse.valorIss)}`, colX[4], y);
    y += 14;
    doc.text('Valor Liquido:', 350, y);
    doc.font('Helvetica-Bold');
    doc.text(`R$ ${formatMoney(nfse.valorLiquido)}`, colX[4], y);

    y += 30;
    doc.font('Helvetica').fontSize(9).fillColor(secondaryColor);
    doc.text(`Observacoes: ${nfse.observacoes || 'Nenhuma observacao.'}`);
    doc.text(`Codigo Verificacao: ${nfse.codigoVerificacao || ''}`);
    if (nfse.numeroRps) {
      doc.text(`RPS Numero: ${nfse.numeroRps}`);
    }

    y += 20;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor);
    doc.text('Documento gerado por Integra Code - www.integracode.com.br', 50, y);

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = {
  generateNFSEDocument,
};
