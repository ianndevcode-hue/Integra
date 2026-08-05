const axios = require('axios');

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

function getClient(apiKey) {
  const key = apiKey || process.env.ASAAS_API_KEY;
  if (!key) {
    throw new Error('ASAAS_API_KEY nao configurada (configure no app ou no .env do backend)');
  }
  return axios.create({
    baseURL: ASAAS_API_URL,
    headers: {
      'Content-Type': 'application/json',
      'access_token': key,
    },
  });
}

async function createCustomer(data, apiKey) {
  const client = getClient(apiKey);
  const response = await client.post('/customers', data);
  return response.data;
}

async function getCustomer(customerId, apiKey) {
  const client = getClient(apiKey);
  const response = await client.get(`/customers/${customerId}`);
  return response.data;
}

async function listCustomers(apiKey) {
  const client = getClient(apiKey);
  const response = await client.get('/customers', { params: { limit: 100 } });
  return response.data;
}

async function createCharge(data, apiKey) {
  const client = getClient(apiKey);
  const response = await client.post('/payments', data);
  return response.data;
}

async function getCharge(chargeId, apiKey) {
  const client = getClient(apiKey);
  const response = await client.get(`/payments/${chargeId}`);
  return response.data;
}

async function listCharges(params = {}, apiKey) {
  const client = getClient(apiKey);
  const response = await client.get('/payments', { params });
  return response.data;
}

async function cancelCharge(chargeId, apiKey) {
  const client = getClient(apiKey);
  const response = await client.delete(`/payments/${chargeId}`);
  return response.data;
}

async function refundCharge(chargeId, data = {}, apiKey) {
  const client = getClient(apiKey);
  const response = await client.post(`/payments/${chargeId}/refund`, data);
  return response.data;
}

async function createPixCob(data, apiKey) {
  const client = getClient(apiKey);
  const response = await client.post('/pix/qrCodes', data);
  return response.data;
}

async function getPixQrCode(chargeId, apiKey) {
  const client = getClient(apiKey);
  const response = await client.get(`/payments/${chargeId}/pixQrCode`);
  return response.data;
}

async function getInvoicePdf(chargeId, apiKey) {
  const client = getClient(apiKey);
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
