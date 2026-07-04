import React from 'react';
import { PageHeader, EmptyState } from '../shared/UIComponents';
import { ArrowDownUp, BadgePercent, Send, ClipboardList } from 'lucide-react';

export function Transactions() {
  return (
    <div data-testid="transactions-page">
      <PageHeader title="Movimentações" subtitle="Todas as entradas e saídas financeiras" />
      <EmptyState icon={ArrowDownUp} title="Nenhuma movimentação" description="As movimentações financeiras serão exibidas aqui automaticamente." />
    </div>
  );
}

export function Commissions() {
  return (
    <div data-testid="commissions-page">
      <PageHeader title="Comissões" subtitle="Gestão de comissões de vendedores" />
      <EmptyState icon={BadgePercent} title="Nenhuma comissão" description="As comissões serão calculadas automaticamente com base nas vendas." />
    </div>
  );
}

export function Quotes() {
  return (
    <div data-testid="quotes-page">
      <PageHeader title="Orçamentos / Cotações" subtitle="Envie cotações para clientes e fornecedores via PDF ou link" />
      <EmptyState icon={Send} title="Nenhum orçamento" description="Crie orçamentos para enviar aos seus clientes ou fornecedores." />
    </div>
  );
}

export function Orders() {
  return (
    <div data-testid="orders-page">
      <PageHeader title="Pedidos" subtitle="Gerencie pedidos de compra e venda" />
      <EmptyState icon={ClipboardList} title="Nenhum pedido" description="Os pedidos aparecerão aqui quando criados a partir de orçamentos ou vendas." />
    </div>
  );
}
