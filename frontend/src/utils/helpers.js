export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
  } catch { return dateStr; }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr));
  } catch { return dateStr; }
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export const paymentMethodLabels = {
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão Crédito',
  cartao_debito: 'Cartão Débito',
  pix: 'PIX',
};
