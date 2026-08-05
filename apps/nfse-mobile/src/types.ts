export interface Cliente {
  id: number;
  nome: string;
  razaoSocial?: string;
  cpfCnpj: string;
  email?: string;
  telefone?: string;
  inscricaoMunicipal?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  asaasId?: string;
  createdAt?: string;
}

export interface Servico {
  id: number;
  descricao: string;
  itemListaServico: string;
  codigoTributacaoMunicipio?: string;
  aliquotaIss: number;
  unidade: string;
  valorUnitario: number;
  createdAt?: string;
}

export interface ServicoItem {
  servicoId: number;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface Empresa {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoMunicipal: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
}

export interface NFSECreate {
  competencia: string;
  itemListaServico: string;
  codigoTributacaoMunicipio?: string;
  naturezaOperacao?: string;
  regimeEspecial?: string;
  optanteSimplesNacional?: boolean;
  incentivadorCultural?: boolean;
  issRetido: string;
  discriminacao?: string;
  valorServicos: number;
  desconto?: number;
  deducoes?: number;
  aliquotaIss?: number;
  observacoes?: string;
  cliente?: Partial<Cliente>;
  servicos: ServicoItem[];
  rpsSerie?: string;
  rpsTipo?: string;
}

export interface NFSENota {
  id: number;
  numero: number;
  serie: number;
  lote: number;
  competencia: string;
  dataEmissao: string;
  naturezaOperacao: string;
  regimeEspecial: string;
  optanteSimplesNacional: string;
  incentivadorCultural: string;
  issRetido: string;
  itemListaServico: string;
  discriminacao: string;
  valorServicos: number;
  desconto: number;
  deducoes: number;
  baseCalculoIss: number;
  aliquotaIss: number;
  valorIss: number;
  valorLiquido: number;
  observacoes: string;
  cliente: Partial<Cliente> | null;
  servicos: ServicoItem[];
  status: string;
  statusHistorico: Array<{ status: string; data: string; mensagem: string; protocolo?: string }>;
  pdfPath: string | null;
  protocoloRecebimento?: string;
  numeroNfse?: string;
  codigoVerificacao?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cobranca {
  id: string;
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'CASH' | 'INSTALLMENT';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
  status: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCodeId?: string;
  pixEncodedImage?: string;
  createdAt?: string;
}

export interface AppConfig {
  apiUrl: string;
  internalKey: string;
  empresa: Empresa;
}
