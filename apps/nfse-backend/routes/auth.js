const express = require('express');
const router = express.Router();
const { readFile, writeFile } = require('../services/DatabaseService');

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = readFile('users.json', []);
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Credenciais invalidas' });
  const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
  res.json({ accessToken: token, user: { id: user.id, name: user.name, email: user.email } });
});

router.get('/me', (req, res) => {
  const users = readFile('users.json', []);
  if (users.length === 0) {
    const defaultUser = { id: 1, name: 'Integra Code', email: 'admin@integracode.com.br', password: 'admin123', role: 'admin' };
    writeFile('users.json', [defaultUser]);
    return res.json(defaultUser);
  }
  res.json(users[0]);
});

module.exports = router;
