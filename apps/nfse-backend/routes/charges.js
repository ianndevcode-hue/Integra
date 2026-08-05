const express = require('express');
const router = express.Router();
const { readFile, writeFile, getNextId } = require('../services/DatabaseService');
const asaas = require('../services/AsaasService');

function asaasKey(req) {
  return req.headers['x-asaas-key'] || process.env.ASAAS_API_KEY;
}

router.post('/', async (req, res) => {
  try {
    const charge = await asaas.createCharge(req.body, asaasKey(req));
    const charges = readFile('charges.json', []);
    charges.push({ ...charge, createdAt: new Date().toISOString() });
    writeFile('charges.json', charges);
    res.status(201).json(charge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const charge = await asaas.getCharge(req.params.id, asaasKey(req));
    res.json(charge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await asaas.listCharges({
      limit: req.query.limit || 100,
      offset: req.query.offset || 0,
      customer: req.query.customer,
      status: req.query.status,
    }, asaasKey(req));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const result = await asaas.cancelCharge(req.params.id, asaasKey(req));
    const charges = readFile('charges.json', []);
    const idx = charges.findIndex(c => c.id === req.params.id);
    if (idx >= 0) {
      charges[idx].status = 'CANCELED';
      writeFile('charges.json', charges);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/refund', async (req, res) => {
  try {
    const result = await asaas.refundCharge(req.params.id, req.body, asaasKey(req));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/pix', async (req, res) => {
  try {
    const pix = await asaas.createPixCob({ paymentId: req.params.id, ...req.body }, asaasKey(req));
    res.status(201).json(pix);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/pix-qrcode', async (req, res) => {
  try {
    const pix = await asaas.getPixQrCode(req.params.id, asaasKey(req));
    res.json(pix);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/invoice', async (req, res) => {
  try {
    const invoice = await asaas.getInvoicePdf(req.params.id, asaasKey(req));
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
