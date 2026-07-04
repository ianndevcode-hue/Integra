import React from 'react';
import { PageHeader, EmptyState } from '../shared/UIComponents';
import { RefreshCw, ArrowDownUp } from 'lucide-react';

export function StockAdjustments() {
  return (
    <div data-testid="stock-adjustments-page">
      <PageHeader title="Ajustes de Estoque" subtitle="Correções e inventário" />
      <EmptyState icon={RefreshCw} title="Nenhum ajuste registrado" description="Registre ajustes de inventário quando houver diferenças entre estoque físico e sistema." />
    </div>
  );
}

export function StockTransfers() {
  return (
    <div data-testid="stock-transfers-page">
      <PageHeader title="Transferências de Estoque" subtitle="Entre filiais e depósitos" />
      <EmptyState icon={ArrowDownUp} title="Nenhuma transferência" description="Transfira produtos entre filiais ou depósitos quando necessário." />
    </div>
  );
}
