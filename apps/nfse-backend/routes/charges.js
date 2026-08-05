const express = require('express');
const router = express.Router();
const { readFile, writeFile, getNextId } = require('../services/DatabaseService');
const { createCharge, getCharge, listCharges, cancelCharge, refundCharge, createPixCob, getPixQrCode, getInvoicePdf } = require('../services/AsaasService');

router.post('/', async (req, res) => {
  try {
    const charge = await createCharge(req.body);
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
    const charge = await getCharge(req.params.id);
    res.json(charge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await listCharges({
      limit: req.query.limit || 100,
      offset: req.query.offset || 0,
      customer: req.query.customer,
      status: req.query.status,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const result = await cancelCharge(req.params.id);
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
    const result = await refundCharge(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/pix', async (req, res) => {
  try {
    const pix = await createPixCob({ paymentId: req.params.id, ...req.body });
    res.status(201).json(pix);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/pix-qrcode', async (req, res) => {
  try {
    const pix = await getPixQrCode(req.params.id);
    res.json(pix);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/invoice', async (req, res) => {
  try {
    const invoice = await getInvoicePdf(req.params.id);
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
