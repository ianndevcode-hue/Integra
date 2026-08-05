const express = require('express');
const router = express.Router();
const { readFile, writeFile, getNextId } = require('../services/DatabaseService');
const { createCustomer, getCustomer, listCustomers } = require('../services/AsaasService');

router.get('/', (req, res) => {
  const clients = readFile('clients.json', []);
  res.json(clients);
});

router.get('/:id', (req, res) => {
  const clients = readFile('clients.json', []);
  const client = clients.find(c => c.id === parseInt(req.params.id));
  if (!client) return res.status(404).json({ error: 'Cliente nao encontrado' });
  res.json(client);
});

router.post('/', async (req, res) => {
  const clients = readFile('clients.json', []);
  const id = getNextId('clients.json');
  const client = { id, ...req.body, createdAt: new Date().toISOString() };
  clients.push(client);
  writeFile('clients.json', clients);
  res.status(201).json(client);
});

router.put('/:id', (req, res) => {
  const clients = readFile('clients.json', []);
  const idx = clients.findIndex(c => c.id === parseInt(req.params.id));
  if (idx < 0) return res.status(404).json({ error: 'Cliente nao encontrado' });
  clients[idx] = { ...clients[idx], ...req.body, updatedAt: new Date().toISOString() };
  writeFile('clients.json', clients);
  res.json(clients[idx]);
});

router.delete('/:id', (req, res) => {
  const clients = readFile('clients.json', []);
  const filtered = clients.filter(c => c.id !== parseInt(req.params.id));
  writeFile('clients.json', filtered);
  res.status(204).send();
});

router.post('/sync-asaas', async (req, res) => {
  try {
    const asaasCustomers = await listCustomers();
    const clients = readFile('clients.json', []);
    for (const ac of asaasCustomers.data || []) {
      const existing = clients.find(c => c.cpfCnpj === ac.cpfCnpj);
      if (!existing) {
        const id = getNextId('clients.json');
        clients.push({
          id,
          nome: ac.name,
          razaoSocial: ac.company,
          cpfCnpj: ac.cpfCnpj,
          email: ac.email,
          telefone: ac.mobilePhone,
          asaasId: ac.id,
          createdAt: new Date().toISOString(),
        });
      }
    }
    writeFile('clients.json', clients);
    res.json({ synced: clients.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
