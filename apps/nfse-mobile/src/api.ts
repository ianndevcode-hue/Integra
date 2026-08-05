import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConfig } from '../types';

const STORAGE_KEY = '@integra_nfse_config';

const defaultConfig: AppConfig = {
  apiUrl: 'http://localhost:3335',
  internalKey: 'integra-nfse-internal-key-2024',
  empresa: {
    razaoSocial: 'Integra Code Solucoes em Tecnologia LTDA',
    nomeFantasia: 'Integra Code',
    cnpj: '00000000000100',
    inscricaoMunicipal: '0000000',
    endereco: 'Rua Exemplo',
    numero: '123',
    complemento: 'Sala 1',
    bairro: 'Centro',
    cidade: 'Sao Paulo',
    uf: 'SP',
    cep: '00000000',
    telefone: '11999999999',
    email: 'contato@integracode.com.br',
  },
};

async function getConfig(): Promise<AppConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig;
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    return defaultConfig;
  }
}

async function setConfig(config: Partial<AppConfig>) {
  const current = await getConfig();
  const updated = { ...current, ...config };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('@integra_nfse_token');
  } catch {
    return null;
  }
}

async function setToken(token: string) {
  await AsyncStorage.setItem('@integra_nfse_token', token);
}

async function clearToken() {
  await AsyncStorage.removeItem('@integra_nfse_token');
}

export async function api<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const config = await getConfig();
  const token = await getToken();

  const url = `${config.apiUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Internal-Key': config.internalKey,
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export { getConfig, setConfig, getToken, setToken, clearToken, defaultConfig };
