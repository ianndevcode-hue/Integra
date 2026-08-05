const { v4: uuidv4 } = require('uuid');
const { readFile, writeFile, getNextId } = require('./DatabaseService');
const { generateNFSEDocument } = require('./PDFService');

function now() {
  return new Date().toISOString();
}

function formatDate(dateStr) {
  if (!dateStr) return now().split('T')[0];
  return dateStr.split('T')[0];
}

function generateCodigoVerificacao() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function buildNFSE(payload, company) {
  const numero = getNextId('nfse.json', 'numero');
  const codigoVerificacao = generateCodigoVerificacao();
  const competencia = formatDate(payload.competencia || payload.dataEmissao);

  const baseCalculoIss = Math.max(payload.valorServicos - (payload.deducoes || 0) - (payload.desconto || 0), 0);
  const aliquota = payload.aliquotaIss || 0.02;
  const valorIss = baseCalculoIss * aliquota;
  const valorLiquido = payload.valorServicos - valorIss - (payload.desconto || 0);

  const nfse = {
    id: numero,
    numero,
    codigoVerificacao,
    serie: payload.serie || 1,
    lote: payload.lote || 1,
    competencia,
    dataEmissao: now(),
    naturezaOperacao: payload.naturezaOperacao || '1',
    regimeEspecial: payload.regimeEspecial || '0',
    optanteSimplesNacional: payload.optanteSimplesNacional ? 'S' : 'N',
    incentivadorCultural: payload.incentivadorCultural ? 'S' : 'N',
    issRetido: payload.issRetido === 'S' ? 'S' : 'N',
    itemListaServico: payload.itemListaServico,
    codigoTributacaoMunicipio: payload.codigoTributacaoMunicipio || '',
    discriminacao: payload.discriminacao || payload.servicos?.map(s => s.descricao).join(', ') || 'Servicos prestados',
    valorServicos: payload.valorServicos,
    desconto: payload.desconto || 0,
    deducoes: payload.deducoes || 0,
    baseCalculoIss,
    aliquotaIss: aliquota,
    valorIss: Math.round(valorIss * 100) / 100,
    valorLiquido: Math.round(valorLiquido * 100) / 100,
    observacoes: payload.observacoes || '',
    cliente: payload.cliente || null,
    servicos: payload.servicos || [],
    empresa: company,
    rps: {
      numero: getNextId('rps.json', 'numero'),
      serie: payload.rpsSerie || '1',
      tipo: payload.rpsTipo || '1',
      dataEmissao: now(),
    },
    status: 'PENDING',
    statusHistorico: [{ status: 'PENDING', data: now(), mensagem: 'Aguardando transmissao' }],
    pdfPath: null,
    municipioTransmissao: null,
    protocoloRecebimento: null,
    numeroNfse: null,
    createdAt: now(),
    updatedAt: now(),
  };

  const nfses = readFile('nfse.json', []);
  nfses.push(nfse);
  writeFile('nfse.json', nfses);

  return nfse;
}

async function transmitToMunicipality(nfse) {
  const municipioUrl = process.env.NFS_E_WEBSERVICE_URL;
  if (!municipioUrl) {
    return { success: false, message: 'URL do webservice municipal nao configurada' };
  }

  try {
    const payload = {
      NumeroLote: nfse.lote,
      CNPJ: nfse.empresa.cnpj,
      InscricaoMunicipal: nfse.empresa.inscricaoMunicipal,
      QtdeRPS: 1,
      RPS: [nfse.rps],
      ListaRPS: nfse.servicos.map(s => ({
        ItemListaServico: nfse.itemListaServico,
        CodigoCNAE: '',
        CodigoTributacaoMunicipio: nfse.codigoTributacaoMunicipio,
        Discriminacao: s.descricao,
        ValorServicos: s.valorTotal,
        ValorDeducoes: nfse.deducoes,
        ValorPIS: 0,
        ValorCOFINS: 0,
        ValorINSS: 0,
        ValorIR: 0,
        ValorCSLL: 0,
        IssRetido: nfse.issRetido,
        ValorISS: nfse.valorIss,
        ValorISSRetido: nfse.issRetido === 'S' ? nfse.valorIss : 0,
        OutrasRetencoes: 0,
        BaseCalculo: nfse.baseCalculoIss,
        Aliquota: nfse.aliquotaIss,
        ValorLiquido: nfse.valorLiquido,
      })),
    };

    const response = await fetch(municipioUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function emitNFSE(payload, company) {
  const nfse = buildNFSE(payload, company);

  if (!process.env.NFS_E_WEBSERVICE_URL) {
    nfse.status = 'GERADA';
    nfse.statusHistorico.push({ status: 'GERADA', data: now(), mensagem: 'NFS-e gerada localmente. Configure o webservice municipal para transmitir.' });

    const pdfPath = await generateNFSEDocument(nfse, company, nfse.cliente, nfse.servicos);
    nfse.pdfPath = pdfPath;

    const nfses = readFile('nfse.json', []);
    const idx = nfses.findIndex(n => n.id === nfse.id);
    if (idx >= 0) {
      nfses[idx] = nfse;
      writeFile('nfse.json', nfses);
    }
    return nfse;
  }

  const transmission = await transmitToMunicipality(nfse);

  if (transmission.success || transmission.Protocolo) {
    nfse.status = 'AUTHORIZED';
    nfse.protocoloRecebimento = transmission.Protocolo || transmission.protocoloRecebimento;
    nfse.numeroNfse = transmission.Numero || nfse.numero;
    nfse.statusHistorico.push({ status: 'AUTHORIZED', data: now(), mensagem: 'NFS-e autorizada', protocolo: nfse.protocoloRecebimento });
  } else {
    nfse.status = 'REJECTED';
    nfse.statusHistorico.push({ status: 'REJECTED', data: now(), mensagem: transmission.message || 'Rejeitada pelo municipio' });
  }

  const pdfPath = await generateNFSEDocument(nfse, company, nfse.cliente, nfse.servicos);
  nfse.pdfPath = pdfPath;

  const nfses = readFile('nfse.json', []);
  const idx = nfses.findIndex(n => n.id === nfse.id);
  if (idx >= 0) {
    nfses[idx] = nfse;
    writeFile('nfse.json', nfses);
  }

  return nfse;
}

function getNFSEById(id) {
  const nfses = readFile('nfse.json', []);
  return nfses.find(n => n.id === id) || null;
}

function listNFSE(filters = {}) {
  let nfses = readFile('nfse.json', []);
  if (filters.cnpjTomador) {
    nfses = nfses.filter(n => n.cliente?.cpfCnpj === filters.cnpjTomador);
  }
  if (filters.status) {
    nfses = nfses.filter(n => n.status === filters.status);
  }
  if (filters.dataInicio) {
    nfses = nfses.filter(n => n.dataEmissao >= filters.dataInicio);
  }
  if (filters.dataFim) {
    nfses = nfses.filter(n => n.dataEmissao <= filters.dataFim);
  }
  return nfses.sort((a, b) => b.numero - a.numero);
}

function cancelNFSE(id) {
  const nfses = readFile('nfse.json', []);
  const nfse = nfses.find(n => n.id === id);
  if (!nfse) return null;

  nfse.status = 'CANCELED';
  nfse.statusHistorico.push({ status: 'CANCELED', data: now(), mensagem: 'NFS-e cancelada' });
  nfse.updatedAt = now();

  const idx = nfses.findIndex(n => n.id === id);
  nfses[idx] = nfse;
  writeFile('nfse.json', nfses);
  return nfse;
}

module.exports = {
  emitNFSE,
  getNFSEById,
  listNFSE,
  cancelNFSE,
  buildNFSE,
};
