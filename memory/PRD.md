# Integra SYS - Product Requirements Document

## Overview
Integra SYS é um sistema ERP/PDV SaaS multi-tenant da Integra Code com 3 aplicativos separados integrados pela mesma API.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB
- **Frontend**: React.js com Tailwind CSS + Recharts
- **Database**: MongoDB
- **Auth**: JWT com httpOnly cookies + bcrypt

## Apps
1. **Admin Master** (`/admin`) - Painel da Integra Code (cor: roxo)
   - Dashboard analytics
   - Gestão de Clientes (Tenants)
   - Licenças
   - Planos e Módulos
   - Usuários do sistema
   - Logs de auditoria

2. **Web SaaS** (`/app`) - Sistema empresarial (cor: azul)
   - Dashboard com gráficos (vendas/pagamentos)
   - Produtos CRUD com busca
   - Clientes CRUD
   - Fornecedores CRUD
   - Vendas
   - Financeiro (contas a pagar/receber)
   - Fiscal (estrutura NF-e/NFC-e)
   - Usuários/Permissões
   - Configurações da empresa

3. **Mobile/PDV** (`/pdv`) - Ponto de venda (cor: verde)
   - Grid de produtos com busca
   - Carrinho de compras
   - Abertura/Fechamento de caixa
   - Sangria/Suprimento
   - Pagamentos (Dinheiro, Crédito, Débito, PIX)
   - Histórico de vendas
   - Indicador online/offline

## Implementation Status (2026-07-04)
- [x] Backend API completa com todos os endpoints
- [x] Auth JWT com cookies httpOnly + brute force protection
- [x] Seed data (10 produtos, 5 clientes, 3 fornecedores, 15 vendas, 10 financeiro, 3 planos, 1 tenant, 1 licença)
- [x] Landing page com seleção dos 3 apps
- [x] Admin Master (dashboard, tenants, licenças, planos, usuários, logs)
- [x] Web SaaS (dashboard com gráficos, produtos, clientes, fornecedores, vendas, financeiro, fiscal, usuários, configurações)
- [x] Mobile/PDV (grid produtos, carrinho, caixa, pagamentos, histórico, offline indicator)
- [x] Testing: 100% backend + 100% frontend

## User Personas
- **Super Admin**: Gerencia todo o sistema (planos, tenants, licenças)
- **Admin Tenant**: Gerencia sua empresa (produtos, usuários, configurações)
- **Gerente**: Acesso a relatórios e vendas
- **Vendedor**: Vendas e clientes
- **Caixa**: PDV e operações de caixa

## Prioritized Backlog

### P0 (Concluído)
- Auth JWT + role-based access
- 3 apps funcionais com navegação
- CRUD completo de produtos, clientes, fornecedores
- Dashboard com gráficos reais
- PDV com carrinho e pagamentos
- Caixa (abrir/fechar/sangria/suprimento)

### P1 (Próxima iteração)
- Google Auth para Web Apps
- Offline sync do PDV (IndexedDB)
- Edição inline de produtos/clientes
- Filtros avançados nas tabelas
- Relatórios exportáveis (PDF/Excel)

### P2 (Futuro)
- Microserviço fiscal PHP (NFePHP) real
- NF-e e NFC-e em homologação
- API Keys para revendedores
- Sistema de suporte/tickets
- Imóveis e Veículos módulos
- Notificações push
- Multi-idioma
