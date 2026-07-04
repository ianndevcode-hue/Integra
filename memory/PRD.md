# Integra SYS - Product Requirements Document

## Overview
Integra SYS - ERP/PDV SaaS multi-tenant da Integra Code com 3 apps integrados pela mesma API.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB com route modules
- **Frontend**: React.js + Tailwind CSS + Recharts + jsPDF + XLSX
- **Auth**: JWT Bearer token via localStorage

## Apps Implementados

### Admin Master (`/admin`) - 15 telas
Seções: Painel | Clientes & Licenças | Rede & Integrações | Sistema
- Dashboard, Alertas, Clientes/Empresas, Licenças (7 status), Planos, Módulos, Editor de Módulos
- Revendedores, API Keys, Webhooks, Usuários, Logs, Relatórios, Suporte, Configurações

### Web SaaS (`/app`) - 30+ telas
Seções: Vendas | Cadastros | Estoque | Financeiro | Fiscal | Gestão
- **Vendas**: Dashboard, Vendas, Orçamentos/Cotações, Pedidos
- **Cadastros**: Produtos, Serviços, Imóveis, Veículos, Clientes, Fornecedores (com selects)
- **Estoque**: Visão Geral, Entradas, Saídas, Ajustes, Transferências
- **Financeiro**: Visão Geral, Contas a Receber, Contas a Pagar, Fluxo de Caixa, Movimentações, Comissões
- **Fiscal**: Painel, NF-e (55), NFC-e (65), Relatórios Fiscais
- **Gestão**: Relatórios (PDF/Excel), Usuários, Permissões, Config PDV (10 modos), Configurações, Suporte

### Mobile/PDV (`/pdv`)
Grid de produtos, Carrinho, Caixa, Pagamentos (4 formas), Sangria/Suprimento, Histórico, Online/Offline

## Status (2026-07-04)
- [x] 60+ telas implementadas nos 3 apps
- [x] Sidebars com seções colapsáveis e cores por categoria
- [x] Formulários com selects/busca em vez de digitação livre
- [x] Export PDF/Excel em relatórios
- [x] Parcelas automáticas no financeiro
- [x] Stock movements (entradas/saídas) com atualização automática

## Next: IndexedDB offline PDV, Google Auth, Dashboard drill-down, integração fiscal real
