const axios = require('axios');

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

if (!ASAAS_API_KEY) {
  console.warn('ASAAS_API_KEY not configured');
}

const client = axios.create({
  baseURL: ASAAS_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY,
  },
});

async function createCustomer(data) {
  const response = await client.post('/customers', data);
  return response.data;
}

async function getCustomer(customerId) {
  const response = await client.get(`/customers/${customerId}`);
  return response.data;
}

async function listCustomers() {
  const response = await client.get('/customers', { params: { limit: 100 } });
  return response.data;
}

async function createCharge(data) {
  const response = await client.post('/payments', data);
  return response.data;
}

async function getCharge(chargeId) {
  const response = await client.get(`/payments/${chargeId}`);
  return response.data;
}

async function listCharges(params = {}) {
  const response = await client.get('/payments', { params });
  return response.data;
}

async function cancelCharge(chargeId) {
  const response = await client.delete(`/payments/${chargeId}`);
  return response.data;
}

async function refundCharge(chargeId, data = {}) {
  const response = await client.post(`/payments/${chargeId}/refund`, data);
  return response.data;
}

async function createPixCob(data) {
  const response = await client.post('/pix/qrCodes', data);
  return response.data;
}

async function getPixQrCode(chargeId) {
  const response = await client.get(`/payments/${chargeId}/pixQrCode`);
  return response.data;
}

async function getInvoicePdf(chargeId) {
  const response = await client.get(`/payments/${chargeId}/invoice`);
  return response.data;
}

module.exports = {
  createCustomer,
  getCustomer,
  listCustomers,
  createCharge,
  getCharge,
  listCharges,
  cancelCharge,
  refundCharge,
  createPixCob,
  getPixQrCode,
  getInvoicePdf,
};
