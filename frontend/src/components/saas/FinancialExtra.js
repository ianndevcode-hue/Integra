import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers';
import { PageHeader, DataTable, Badge, Modal, StatCard, EmptyState } from '../shared/UIComponents';
import { Plus, Send, FileText, ShoppingCart, Search, Trash2, ArrowRight, ClipboardList, Copy, BadgePercent, Download, Share2 } from 'lucide-react';
import { generateQuotePDF } from '../../utils/quotePDF';

// ===== QUOTES (Orçamentos) =====
export function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ client_id: '', client_name: '', items: [], discount: 0, notes: '', validity_days: 15 });
  const [searchProd, setSearchProd] = useState('');

  const [companyInfo, setCompanyInfo] = useState({});

  useEffect(() => { load(); }, []);
  const load = () => {
    api.get('/api/saas/quotes').then(r => setQuotes(r.data?.data || r.data || [])).catch(() => {});
    api.get('/api/saas/products').then(r => setProducts(r.data?.data || r.data || [])).catch(() => {});
    api.get('/api/saas/clients').then(r => setClients(r.data?.data || r.data || [])).catch(() => {});
    api.get('/api/saas/settings').then(r => setCompanyInfo(r.data || {})).catch(() => {});
  };

  const downloadPDF = (quote) => {
    const doc = generateQuotePDF(quote, companyInfo);
    doc.save(`orcamento_${quote.quote_number || 'novo'}.pdf`);
  };

  const sharePDF = async (quote) => {
    const doc = generateQuotePDF(quote, companyInfo);
    const blob = doc.output('blob');
    const file = new File([blob], `orcamento_${quote.quote_number}.pdf`, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: `Orçamento ${quote.quote_number}`, text: `Orçamento para ${quote.client_name || 'cliente'}`, files: [file] });
    } else {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  const addItem = (prod) => {
    setForm(f => {
      const existing = f.items.find(i => i.product_id === (prod._id||prod.id));
      if (existing) return {...f, items: f.items.map(i => i.product_id === (prod._id||prod.id) ? {...i, quantity: i.quantity + 1} : i)};
      return {...f, items: [...f.items, { product_id: prod._id||prod.id, product_name: prod.name, quantity: 1, unit_price: prod.sale_price, discount: 0 }]};
    });
  };

  const removeItem = (pid) => setForm(f => ({...f, items: f.items.filter(i => i.product_id !== pid)}));
  const updateItem = (pid, field, val) => setForm(f => ({...f, items: f.items.map(i => i.product_id === pid ? {...i, [field]: parseFloat(val)||0} : i)}));
  const subtotal = form.items.reduce((s, i) => s + (i.quantity * i.unit_price - i.discount), 0);
  const total = subtotal - (parseFloat(form.discount)||0);

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.items.length === 0) return;
    await api.post('/api/saas/quotes', { ...form, subtotal, total, discount: parseFloat(form.discount)||0 });
    setShowModal(false);
    setForm({ client_id: '', client_name: '', items: [], discount: 0, notes: '', validity_days: 15 });
    load();
  };

  const convertToOrder = async (quote) => {
    await api.post('/api/saas/orders', { quote_id: quote._id, client_id: quote.client_id, client_name: quote.client_name, items: quote.items, subtotal: quote.subtotal, total: quote.total, discount: quote.discount, notes: `Convertido do orçamento #${quote.quote_number}` });
    await api.patch(`/api/saas/quotes/${quote._id}/status`, { status: 'converted' });
    load();
  };

  const statusColors = { draft: 'default', sent: 'info', approved: 'success', rejected: 'danger', expired: 'warning', converted: 'purple' };
  const statusLabels = { draft: 'Rascunho', sent: 'Enviado', approved: 'Aprovado', rejected: 'Rejeitado', expired: 'Expirado', converted: 'Convertido' };

  const filteredProds = products.filter(p => p.name?.toLowerCase().includes(searchProd.toLowerCase()) || p.sku?.toLowerCase().includes(searchProd.toLowerCase()));

  const columns = [
    { header: 'Nº', render: r => <span className="font-mono font-medium">{r.quote_number}</span> },
    { header: 'Cliente', render: r => <span className="font-medium text-slate-900">{r.client_name || 'Sem cliente'}</span> },
    { header: 'Itens', render: r => r.items?.length || 0 },
    { header: 'Total', render: r => <span className="font-mono font-medium">{formatCurrency(r.total)}</span>, align: 'right' },
    { header: 'Status', render: r => <Badge variant={statusColors[r.status]}>{statusLabels[r.status] || r.status}</Badge> },
    { header: 'Validade', render: r => formatDate(r.expires_at) },
    { header: 'Ações', render: r => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => downloadPDF(r)} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors flex items-center gap-1" title="Baixar PDF">
          <Download size={10} /> PDF
        </button>
        <button onClick={() => sharePDF(r)} className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition-colors flex items-center gap-1" title="Compartilhar">
          <Share2 size={10} />
        </button>
        {r.status !== 'converted' && (
          <button onClick={() => convertToOrder(r)} className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors flex items-center gap-1">
            <ArrowRight size={10} /> Pedido
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div data-testid="quotes-page">
      <PageHeader title="Orçamentos / Cotações" subtitle={`${quotes.length} orçamentos`}>
        <button data-testid="add-quote" onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-all"><Plus size={16} /> Novo Orçamento</button>
      </PageHeader>
      <DataTable columns={columns} data={quotes} />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Orçamento" size="xl">
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-[10px] tracking-[0.15em] uppercase font-semibold text-slate-500 mb-1 block">Cliente</label>
              <select value={form.client_id} onChange={e => { const c = clients.find(x => (x._id||x.id) === e.target.value); setForm({...form, client_id: e.target.value, client_name: c?.name || ''}); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="">Consumidor Final</option>
                {clients.map(c => <option key={c._id||c.id} value={c._id||c.id}>{c.name} {c.document ? `(${c.document})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] tracking-[0.15em] uppercase font-semibold text-slate-500 mb-1 block">Validade (dias)</label>
              <select value={form.validity_days} onChange={e => setForm({...form, validity_days: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                {[7,10,15,30,45,60,90].map(d => <option key={d} value={d}>{d} dias</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] tracking-[0.15em] uppercase font-semibold text-slate-500 mb-1 block">Desconto Geral (R$)</label>
              <input type="number" step="0.01" value={form.discount} onChange={e => setForm({...form, discount: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>

          {/* Product search and add */}
          <div className="mb-3">
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={searchProd} onChange={e => setSearchProd(e.target.value)} placeholder="Buscar produto para adicionar..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            {searchProd && (
              <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg mb-2">
                {filteredProds.slice(0, 8).map(p => (
                  <button key={p._id||p.id} type="button" onClick={() => { addItem(p); setSearchProd(''); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex justify-between border-b border-slate-100 last:border-0">
                    <span>{p.name} <span className="text-slate-400">({p.sku})</span></span>
                    <span className="font-mono text-emerald-600">{formatCurrency(p.sale_price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items table */}
          {form.items.length > 0 ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 border-b">
                  <th className="px-3 py-2 text-left text-[10px] uppercase font-semibold text-slate-500">Produto</th>
                  <th className="px-3 py-2 text-center text-[10px] uppercase font-semibold text-slate-500 w-20">Qtd</th>
                  <th className="px-3 py-2 text-right text-[10px] uppercase font-semibold text-slate-500 w-28">Unit.</th>
                  <th className="px-3 py-2 text-right text-[10px] uppercase font-semibold text-slate-500 w-28">Subtotal</th>
                  <th className="w-8"></th>
                </tr></thead>
                <tbody>
                  {form.items.map(item => (
                    <tr key={item.product_id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium">{item.product_name}</td>
                      <td className="px-3 py-2"><input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.product_id, 'quantity', e.target.value)} className="w-16 text-center border border-slate-200 rounded px-1 py-1 text-sm" /></td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                      <td className="px-3 py-2 text-right font-mono font-medium">{formatCurrency(item.quantity * item.unit_price)}</td>
                      <td className="px-1"><button type="button" onClick={() => removeItem(item.product_id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center mb-3">
              <p className="text-sm text-slate-500">Busque e adicione produtos acima</p>
            </div>
          )}

          {/* Totals */}
          <div className="bg-slate-50 rounded-lg p-3 mb-4 flex justify-end gap-6 text-sm">
            <span className="text-slate-500">Subtotal: <span className="font-mono font-medium text-slate-900">{formatCurrency(subtotal)}</span></span>
            {form.discount > 0 && <span className="text-red-600">Desconto: -{formatCurrency(form.discount)}</span>}
            <span className="text-slate-900 font-semibold">Total: <span className="font-mono text-lg">{formatCurrency(total)}</span></span>
          </div>

          <div>
            <label className="text-[10px] tracking-[0.15em] uppercase font-semibold text-slate-500 mb-1 block">Observações</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} />
          </div>

          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={form.items.length === 0} className="flex-1 bg-brand-blue hover:bg-brand-blue-hover text-white font-medium py-2.5 rounded-lg disabled:opacity-40">Salvar Orçamento</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


// ===== ORDERS (Pedidos) =====
export function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => { api.get('/api/saas/orders').then(r => setOrders(r.data?.data || r.data || [])).catch(() => {}); }, []);

  const convertToSale = async (order) => {
    await api.post('/api/saas/sales', { client_id: order.client_id, client_name: order.client_name, items: order.items, discount: order.discount || 0, payment_method: 'dinheiro', notes: `Pedido #${order.order_number}` });
    await api.patch(`/api/saas/orders/${order._id}/status`, { status: 'completed' });
    api.get('/api/saas/orders').then(r => setOrders(r.data?.data || r.data || []));
  };

  const statusColors = { pending: 'warning', confirmed: 'info', in_progress: 'purple', completed: 'success', cancelled: 'danger' };
  const statusLabels = { pending: 'Pendente', confirmed: 'Confirmado', in_progress: 'Em Andamento', completed: 'Concluído', cancelled: 'Cancelado' };

  const columns = [
    { header: 'Nº', render: r => <span className="font-mono font-medium">{r.order_number}</span> },
    { header: 'Cliente', render: r => <span className="font-medium text-slate-900">{r.client_name || 'Consumidor Final'}</span> },
    { header: 'Itens', render: r => r.items?.length || 0 },
    { header: 'Total', render: r => <span className="font-mono font-medium">{formatCurrency(r.total)}</span>, align: 'right' },
    { header: 'Status', render: r => <Badge variant={statusColors[r.status]}>{statusLabels[r.status] || r.status}</Badge> },
    { header: 'Origem', render: r => r.quote_id ? <Badge variant="info">Orçamento</Badge> : <Badge variant="default">Direto</Badge> },
    { header: 'Data', render: r => formatDateTime(r.created_at) },
    { header: 'Ações', render: r => r.status !== 'completed' && r.status !== 'cancelled' ? (
      <button onClick={(e) => {e.stopPropagation(); convertToSale(r);}} className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 flex items-center gap-1"><ShoppingCart size={10} /> Faturar</button>
    ) : null },
  ];

  return (
    <div data-testid="orders-page">
      <PageHeader title="Pedidos" subtitle={`${orders.length} pedidos | Fluxo: Orçamento → Pedido → Venda → NFC-e`} />
      {orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8">
          <EmptyState icon={ClipboardList} title="Nenhum pedido" description="Pedidos são criados a partir de orçamentos aprovados ou diretamente." />
          <div className="mt-6 flex justify-center">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium">Orçamento</span>
              <ArrowRight size={14} />
              <span className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg font-medium">Pedido</span>
              <ArrowRight size={14} />
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-medium">Venda</span>
              <ArrowRight size={14} />
              <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg font-medium">NFC-e</span>
            </div>
          </div>
        </div>
      ) : <DataTable columns={columns} data={orders} />}
    </div>
  );
}


// ===== TRANSACTIONS =====
export function Transactions() {
  const [entries, setEntries] = useState([]);
  useEffect(() => { api.get('/api/saas/financial').then(r => setEntries(r.data?.data || r.data || [])).catch(() => {}); }, []);

  const columns = [
    { header: 'Descrição', render: r => <span className="font-medium text-slate-900">{r.description}</span> },
    { header: 'Tipo', render: r => <Badge variant={r.type === 'receivable' ? 'success' : 'danger'}>{r.type === 'receivable' ? 'Entrada' : 'Saída'}</Badge> },
    { header: 'Valor', render: r => <span className={`font-mono font-medium ${r.type === 'receivable' ? 'text-emerald-600' : 'text-red-600'}`}>{r.type === 'receivable' ? '+' : '-'}{formatCurrency(r.amount)}</span>, align: 'right' },
    { header: 'Vencimento', render: r => formatDate(r.due_date) },
    { header: 'Status', render: r => <Badge variant={r.status === 'paid' ? 'success' : 'warning'}>{r.status === 'paid' ? 'Liquidado' : 'Pendente'}</Badge> },
    { header: 'Categoria', accessor: 'category' },
  ];

  const totalIn = entries.filter(e => e.type === 'receivable' && e.status === 'paid').reduce((s, e) => s + (e.amount||0), 0);
  const totalOut = entries.filter(e => e.type === 'payable' && e.status === 'paid').reduce((s, e) => s + (e.amount||0), 0);

  return (
    <div data-testid="transactions-page">
      <PageHeader title="Movimentações Financeiras" subtitle="Todas as entradas e saídas" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Entradas" value={formatCurrency(totalIn)} color="green" />
        <StatCard label="Total Saídas" value={formatCurrency(totalOut)} color="red" />
        <StatCard label="Saldo" value={formatCurrency(totalIn - totalOut)} color={totalIn - totalOut >= 0 ? 'blue' : 'red'} />
      </div>
      <DataTable columns={columns} data={entries} />
    </div>
  );
}


// ===== COMMISSIONS =====
export function Commissions() {
  return (
    <div data-testid="commissions-page">
      <PageHeader title="Comissões" subtitle="Gestão de comissões de vendedores" />
      <EmptyState icon={BadgePercent} title="Nenhuma comissão" description="Comissões são calculadas automaticamente sobre vendas realizadas por cada vendedor." />
    </div>
  );
}
