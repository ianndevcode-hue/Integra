const express = require('express');
const router = express.Router();
const { emitNFSE, getNFSEById, listNFSE, cancelNFSE } = require('../services/NFSEService');
const { readFile, writeFile, getNextId } = require('../services/DatabaseService');
const fs = require('fs');
const path = require('path');

function getCompany() {
  return {
    razaoSocial: process.env.EMPRESA_RAZAO_SOCIAL || 'Integra Code Solucoes em Tecnologia LTDA',
    nomeFantasia: process.env.EMPRESA_NOME_FANTASIA || 'Integra Code',
    cnpj: process.env.EMPRESA_CNPJ || '00000000000100',
    inscricaoMunicipal: process.env.EMPRESA_INSCRICAO_MUNICIPAL || '0000000',
    endereco: process.env.EMPRESA_ENDERECO || 'Rua Exemplo',
    numero: process.env.EMPRESA_NUMERO || '123',
    complemento: process.env.EMPRESA_COMPLEMENTO || 'Sala 1',
    bairro: process.env.EMPRESA_BAIRRO || 'Centro',
    cidade: process.env.EMPRESA_CIDADE || 'Sao Paulo',
    uf: process.env.EMPRESA_UF || 'SP',
    cep: process.env.EMPRESA_CEP || '00000000',
    telefone: process.env.EMPRESA_TELEFONE || '11999999999',
    email: process.env.EMPRESA_EMAIL || 'contato@integracode.com.br',
  };
}

router.post('/emitir', async (req, res) => {
  try {
    const company = getCompany();
    const payload = req.body;
    const nfse = await emitNFSE(payload, company);
    res.status(201).json(nfse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/consultar/:id', (req, res) => {
  const nfse = getNFSEById(parseInt(req.params.id));
  if (!nfse) return res.status(404).json({ error: 'NFS-e nao encontrada' });
  res.json(nfse);
});

router.get('/listar', (req, res) => {
  const filters = {
    cnpjTomador: req.query.cnpjTomador,
    status: req.query.status,
    dataInicio: req.query.dataInicio,
    dataFim: req.query.dataFim,
  };
  const nfses = listNFSE(filters);
  res.json(nfses);
});

router.post('/cancelar/:id', (req, res) => {
  const nfse = cancelNFSE(parseInt(req.params.id));
  if (!nfse) return res.status(404).json({ error: 'NFS-e nao encontrada' });
  res.json(nfse);
});

router.get('/pdf/:id', (req, res) => {
  const nfse = getNFSEById(parseInt(req.params.id));
  if (!nfse || !nfse.pdfPath) return res.status(404).json({ error: 'PDF nao encontrado' });
  res.sendFile(nfse.pdfPath);
});

module.exports = router;
