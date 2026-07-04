export const UNITS = [
  { value: 'UN', label: 'UN - Unidade' },
  { value: 'KG', label: 'KG - Quilograma' },
  { value: 'LT', label: 'LT - Litro' },
  { value: 'MT', label: 'MT - Metro' },
  { value: 'M2', label: 'M² - Metro Quadrado' },
  { value: 'M3', label: 'M³ - Metro Cúbico' },
  { value: 'CX', label: 'CX - Caixa' },
  { value: 'PC', label: 'PC - Peça' },
  { value: 'PR', label: 'PR - Par' },
  { value: 'FD', label: 'FD - Fardo' },
  { value: 'DZ', label: 'DZ - Dúzia' },
  { value: 'SC', label: 'SC - Saco' },
  { value: 'RL', label: 'RL - Rolo' },
  { value: 'GL', label: 'GL - Galão' },
  { value: 'TON', label: 'TON - Tonelada' },
];

export const ORIGINS = [
  { value: '0', label: '0 - Nacional' },
  { value: '1', label: '1 - Estrangeira (importação direta)' },
  { value: '2', label: '2 - Estrangeira (mercado interno)' },
  { value: '3', label: '3 - Nacional (40% a 70% importado)' },
  { value: '4', label: '4 - Nacional (processos básicos)' },
  { value: '5', label: '5 - Nacional (até 40% importado)' },
  { value: '6', label: '6 - Estrangeira (sem similar nacional)' },
  { value: '7', label: '7 - Estrangeira (dec. lei similar)' },
  { value: '8', label: '8 - Nacional (acima de 70% importado)' },
];

export const CST_ICMS = [
  { value: '00', label: '00 - Tributada integralmente' },
  { value: '10', label: '10 - Tributada com ST' },
  { value: '20', label: '20 - Com redução de BC' },
  { value: '30', label: '30 - Isenta/não trib. com ST' },
  { value: '40', label: '40 - Isenta' },
  { value: '41', label: '41 - Não tributada' },
  { value: '50', label: '50 - Suspensão' },
  { value: '51', label: '51 - Diferimento' },
  { value: '60', label: '60 - ICMS cobrado por ST' },
  { value: '70', label: '70 - Com redução BC e ST' },
  { value: '90', label: '90 - Outros' },
];

export const CSOSN = [
  { value: '101', label: '101 - Tributada pelo SN com crédito' },
  { value: '102', label: '102 - Tributada pelo SN sem crédito' },
  { value: '103', label: '103 - Isenção de ICMS no SN' },
  { value: '201', label: '201 - Tributada com ST e crédito' },
  { value: '202', label: '202 - Tributada com ST sem crédito' },
  { value: '203', label: '203 - Isenção com ST' },
  { value: '300', label: '300 - Imune' },
  { value: '400', label: '400 - Não tributada pelo SN' },
  { value: '500', label: '500 - ICMS cobrado por ST' },
  { value: '900', label: '900 - Outros' },
];

export const CST_PIS = [
  { value: '01', label: '01 - Op. tributável (BC = valor)' },
  { value: '02', label: '02 - Op. tributável (BC = qtd)' },
  { value: '03', label: '03 - Op. tributável (BC = valor × qtd)' },
  { value: '04', label: '04 - Op. tributável monofásica' },
  { value: '05', label: '05 - Op. tributável ST' },
  { value: '06', label: '06 - Op. tributável alíquota zero' },
  { value: '07', label: '07 - Op. isenta da contribuição' },
  { value: '08', label: '08 - Op. sem incidência' },
  { value: '09', label: '09 - Op. com suspensão' },
  { value: '49', label: '49 - Outras operações de saída' },
  { value: '99', label: '99 - Outras operações' },
];

export const CST_COFINS = [
  { value: '01', label: '01 - Op. tributável (BC = valor)' },
  { value: '02', label: '02 - Op. tributável (BC = qtd)' },
  { value: '04', label: '04 - Op. tributável monofásica' },
  { value: '06', label: '06 - Op. tributável alíquota zero' },
  { value: '07', label: '07 - Op. isenta' },
  { value: '08', label: '08 - Op. sem incidência' },
  { value: '09', label: '09 - Op. com suspensão' },
  { value: '49', label: '49 - Outras de saída' },
  { value: '99', label: '99 - Outras operações' },
];

export const CFOP_VENDA = [
  { value: '5101', label: '5101 - Venda prod. estab. (dentro estado)' },
  { value: '5102', label: '5102 - Venda merc. adquirida (dentro estado)' },
  { value: '5103', label: '5103 - Venda prod. com encomenda (dentro)' },
  { value: '5104', label: '5104 - Venda merc. por conta/ordem (dentro)' },
  { value: '5405', label: '5405 - Venda merc. adquirida ST (dentro)' },
  { value: '5949', label: '5949 - Outra saída não especificada' },
  { value: '6101', label: '6101 - Venda prod. estab. (fora estado)' },
  { value: '6102', label: '6102 - Venda merc. adquirida (fora estado)' },
  { value: '6108', label: '6108 - Venda merc. adquirida (fora estado)' },
];

export const ICMS_ALIQUOTAS = [
  { value: '0', label: '0% - Isento/NT' },
  { value: '4', label: '4% - Interestadual importado' },
  { value: '7', label: '7% - Interestadual (S/SE p/ N/NE/CO)' },
  { value: '12', label: '12% - Interestadual' },
  { value: '17', label: '17% - Interna (alguns estados)' },
  { value: '18', label: '18% - Interna SP/MG/PR' },
  { value: '19', label: '19% - Interna RJ' },
  { value: '20', label: '20% - Interna DF' },
  { value: '25', label: '25% - Supérfluo' },
];

export const PIS_ALIQUOTAS = [
  { value: '0', label: '0,00% - Isento/NT' },
  { value: '0.65', label: '0,65% - Cumulativo' },
  { value: '1.65', label: '1,65% - Não cumulativo' },
];

export const COFINS_ALIQUOTAS = [
  { value: '0', label: '0,00% - Isento/NT' },
  { value: '3', label: '3,00% - Cumulativo' },
  { value: '7.6', label: '7,60% - Não cumulativo' },
];

export const CATEGORIES = [
  'Informática', 'Periféricos', 'Monitores', 'Componentes', 'Áudio',
  'Armazenamento', 'Cabos', 'Impressoras', 'Mobiliário', 'Software',
  'Eletrônicos', 'Celulares', 'Acessórios', 'Alimentos', 'Bebidas',
  'Vestuário', 'Calçados', 'Cosméticos', 'Limpeza', 'Papelaria',
  'Ferramentas', 'Automotivo', 'Pet Shop', 'Outros',
];
