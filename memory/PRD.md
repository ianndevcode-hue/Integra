# Integra SYS - PRD v3

## Implementado (2026-07-04)

### 1. Produtos com Campos Fiscais Completos
- Modal com 5 abas: Dados Gerais | Preços e Estoque | Dados Fiscais | ICMS | PIS/COFINS
- Todos campos fiscais com SELECTS: NCM, CEST, CFOP (9 opções), Origem (9), CST ICMS (11), CSOSN (10), Alíquota ICMS (9), CST PIS (11), CST COFINS (9), Alíquotas PIS/COFINS
- Cálculo automático de margem e base de cálculo
- Categoria e Unidade via select

### 2. Fluxo Orçamento → Pedido → Venda → NFC-e
- Orçamentos com busca de produtos, select de cliente, validade configurável, desconto, observações
- Botão "Gerar Pedido" converte orçamento em pedido
- Botão "Faturar" converte pedido em venda
- Fluxo visual: Orçamento → Pedido → Venda → NFC-e
- Backend: /api/saas/quotes, /api/saas/orders com numeração automática

### 3. IndexedDB para PDV Offline
- offlineDB.js: saveOfflineSale, getPendingSales, markSaleSynced, syncPendingSales
- Cache de produtos e clientes no IndexedDB
- Quando offline: salva venda localmente com status "pendente_sync"
- Quando volta online: auto-sync via syncPendingSales
- Indicador visual de vendas pendentes no header do PDV
- Modal de sucesso diferenciado (online vs offline)
- Filtro por categorias no grid de produtos
- Seleção de cliente no carrinho
- Campo de desconto geral

## Credenciais
- Admin: admin@integracode.com / Integra@2024
- SaaS: admin@empresademo.com.br / Demo@2024
- PDV: caixa@empresademo.com.br / Demo@2024
