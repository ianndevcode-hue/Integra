# Integra SYS - Product Requirements Document

## Overview
Integra SYS é um sistema ERP/PDV SaaS multi-tenant da Integra Code com 3 aplicativos separados integrados pela mesma API.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB with route modules
- **Frontend**: React.js com Tailwind CSS + Recharts + jsPDF + XLSX
- **Database**: MongoDB
- **Auth**: JWT com httpOnly cookies + bcrypt + brute force protection

## Apps & Screens

### APP 1 - Admin Master (`/admin`) - Cor: Roxo
1. Login Master
2. Dashboard Master (15+ indicadores)
3. Clientes (Tenants) - CRUD com busca/filtros/paginação
4. Licenças - CRUD com status (active/trial/pending/suspended/blocked/expired/cancelled)
5. Planos - CRUD com módulos
6. Módulos - 14 módulos do sistema
7. Revendedores - CRUD com comissões
8. API Keys - Criar/Revogar/Copiar
9. Webhooks - CRUD
10. Usuários - Listagem com filtros
11. Logs de Auditoria - Registro de ações
12. Suporte - Chamados dos clientes
13. Configurações - Config gerais do sistema

### APP 2 - Web SaaS (`/app`) - Cor: Azul
**Principal:** Dashboard com gráficos e 15+ indicadores
**Cadastros:** Produtos (12 campos fiscais), Serviços, Imóveis, Veículos, Clientes (com crédito/histórico), Fornecedores
**Operações:** Estoque (com alertas), Vendas, Financeiro (a pagar/receber/fluxo de caixa), Fiscal (NF-e/NFC-e estrutura)
**Gestão:** Relatórios (Vendas/Produtos/Financeiro/Clientes com export PDF/Excel), Usuários, Permissões, Config PDV (10 modos), Configurações, Suporte

### APP 3 - Mobile/PDV (`/pdv`) - Cor: Verde
- Grid de produtos com busca por nome/código de barras/SKU
- Carrinho com +/- quantidade e remoção
- Abertura/Fechamento de caixa com resumo
- Sangria e Suprimento
- Pagamentos (Dinheiro, Crédito, Débito, PIX, Misto)
- Histórico de vendas do dia
- Indicador online/offline
- 10 modos PDV configuráveis

## Implementation Status (2026-07-04)
- [x] Backend API completa com 60+ endpoints em route modules
- [x] Auth JWT com cookies + brute force + roles
- [x] Seed data completo (12 produtos, 7 clientes, 3 fornecedores, 5 serviços, 20 vendas, 15 financeiro, 3 planos, 2 revendedores)
- [x] Admin Master: 13 telas funcionais
- [x] Web SaaS: 17 telas funcionais com sidebar por seções
- [x] Mobile/PDV: Tela completa com grid/carrinho/caixa/pagamentos
- [x] Relatórios com export PDF e Excel
- [x] Paginação em todas as tabelas
- [x] Filtros avançados (status, busca, tipo)
- [x] Testing: 94-100% backend + 100% frontend

## P1 - Próxima Iteração
- Google Auth para Web Apps
- IndexedDB offline sync real no PDV
- Dashboard interativos com drill-down
- Módulos de Mesas/Comandas (restaurante)
- Módulos de Ordens de Serviço (oficina)

## P2 - Futuro
- Microserviço fiscal PHP real (NFePHP/sped-nfe)
- Impressão térmica/Bluetooth
- Integração com Asaas (pagamentos)
- PWA para PDV
- NFS-e para serviços
