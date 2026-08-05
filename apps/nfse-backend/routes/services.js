const express = require('express');
const router = express.Router();
const { readFile, writeFile, getNextId } = require('../services/DatabaseService');

router.get('/', (req, res) => {
  const services = readFile('services.json', []);
  res.json(services);
});

router.get('/:id', (req, res) => {
  const services = readFile('services.json', []);
  const service = services.find(s => s.id === parseInt(req.params.id));
  if (!service) return res.status(404).json({ error: 'Servico nao encontrado' });
  res.json(service);
});

router.post('/', (req, res) => {
  const services = readFile('services.json', []);
  const id = getNextId('services.json');
  const service = { id, ...req.body, createdAt: new Date().toISOString() };
  services.push(service);
  writeFile('services.json', services);
  res.status(201).json(service);
});

router.put('/:id', (req, res) => {
  const services = readFile('services.json', []);
  const idx = services.findIndex(s => s.id === parseInt(req.params.id));
  if (idx < 0) return res.status(404).json({ error: 'Servico nao encontrado' });
  services[idx] = { ...services[idx], ...req.body, updatedAt: new Date().toISOString() };
  writeFile('services.json', services);
  res.json(services[idx]);
});

router.delete('/:id', (req, res) => {
  const services = readFile('services.json', []);
  const filtered = services.filter(s => s.id !== parseInt(req.params.id));
  writeFile('services.json', filtered);
  res.status(204).send();
});

module.exports = router;
