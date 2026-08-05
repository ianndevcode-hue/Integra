require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/auth');
const clientsRoutes = require('./routes/clients');
const servicesRoutes = require('./routes/services');
const nfseRoutes = require('./routes/nfse');
const chargesRoutes = require('./routes/charges');

const app = express();
const PORT = process.env.PORT || 3335;

fs.mkdirSync(process.env.DATA_PATH || './data', { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  const key = req.headers['x-internal-key'];
  if (key && key !== process.env.INTERNAL_KEY) {
    return res.status(403).json({ error: 'Chave interna invalida' });
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/nfse', nfseRoutes);
app.use('/api/charges', chargesRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'nfse-backend' }));

app.listen(PORT, () => {
  console.log(`NFS-e Backend running on port ${PORT}`);
});
