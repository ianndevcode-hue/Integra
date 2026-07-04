import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader, DataTable, Badge, Modal, EmptyState } from '../shared/UIComponents';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { ArrowDownCircle, Plus } from 'lucide-react';

export default function StockEntries() {
  const [entries, setEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ product_id: '', supplier_id: '', quantity: 1, unit_cost: 0, notes: '', invoice_number: '' });

  useEffect(() => {
    api.get('/api/saas/stock-movements?type=entry').then(r => setEntries(r.data?.data || r.data || [])).catch(() => {});
    api.get('/api/saas/products').then(r => setProducts(r.data?.data || r.data || [])).catch(() => {});
    api.get('/api/saas/suppliers').then(r => setSuppliers(r.data?.data || r.data || [])).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const prod = products.find(p => (p._id || p.id) === form.product_id);
    await api.post('/api/saas/stock-movements', {
      ...form, type: 'entry', quantity: parseFloat(form.quantity), unit_cost: parseFloat(form.unit_cost),
      product_name: prod?.name || '', supplier_name: suppliers.find(s => (s._id||s.id) === form.supplier_id)?.name || ''
    });
    setShowModal(false);
    setForm({ product_id: '', supplier_id: '', quantity: 1, unit_cost: 0, notes: '', invoice_number: '' });
    api.get('/api/saas/stock-movements?type=entry').then(r => setEntries(r.data?.data || r.data || []));
  };

  const columns = [
    { header: 'Produto', render: r => <span className="font-medium text-slate-900">{r.product_name}</span> },
    { header: 'Fornecedor', accessor: 'supplier_name' },
    { header: 'Qtd', render: r => <span className="font-mono text-emerald-600">+{r.quantity}</span>, align: 'right' },
    { header: 'Custo Unit.', render: r => <span className="font-mono">{formatCurrency(r.unit_cost)}</span>, align: 'right' },
    { header: 'Total', render: r => <span className="font-mono">{formatCurrency((r.quantity||0)*(r.unit_cost||0))}</span>, align: 'right' },
    { header: 'NF', accessor: 'invoice_number' },
    { header: 'Data', render: r => formatDateTime(r.created_at) },
  ];

  return (
    <div data-testid="stock-entries-page">
      <PageHeader title="Entradas de Estoque" subtitle="Registre compras e recebimentos">
        <button data-testid="add-entry" onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-all">
          <Plus size={16} /> Nova Entrada
        </button>
      </PageHeader>
      <DataTable columns={columns} data={entries} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Entrada de Estoque" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Produto</label>
              <select data-testid="entry-product-select" value={form.product_id} onChange={e => {
                const p = products.find(x => (x._id||x.id) === e.target.value);
                setForm({...form, product_id: e.target.value, unit_cost: p?.cost_price || 0});
              }} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" required>
                <option value="">Selecione o produto</option>
                {products.map(p => <option key={p._id||p.id} value={p._id||p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Fornecedor</label>
              <select value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                <option value="">Selecione (opcional)</option>
                {suppliers.map(s => <option key={s._id||s.id} value={s._id||s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Quantidade</label>
              <input type="number" min="1" step="1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Custo Unitário</label>
              <input type="number" step="0.01" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Nº Nota Fiscal</label>
              <input value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Observações</label>
              <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
          {form.product_id && form.quantity > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
              <span className="text-emerald-700 font-medium">Total: {formatCurrency(form.quantity * form.unit_cost)}</span>
            </div>
          )}
          <button type="submit" className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-medium py-2.5 rounded-lg transition-all">Registrar Entrada</button>
        </form>
      </Modal>
    </div>
  );
}
