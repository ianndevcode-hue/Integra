import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader, DataTable, Modal } from '../shared/UIComponents';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { Plus } from 'lucide-react';

export default function StockExits() {
  const [entries, setEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ product_id: '', quantity: 1, reason: 'venda', notes: '' });

  useEffect(() => {
    api.get('/api/saas/stock-movements?type=exit').then(r => setEntries(r.data?.data || r.data || [])).catch(() => {});
    api.get('/api/saas/products').then(r => setProducts(r.data?.data || r.data || [])).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const prod = products.find(p => (p._id||p.id) === form.product_id);
    await api.post('/api/saas/stock-movements', { ...form, type: 'exit', quantity: parseFloat(form.quantity), product_name: prod?.name || '' });
    setShowModal(false);
    api.get('/api/saas/stock-movements?type=exit').then(r => setEntries(r.data?.data || r.data || []));
  };

  const reasons = [{ value: 'venda', label: 'Venda' }, { value: 'perda', label: 'Perda/Avaria' }, { value: 'devolucao_fornecedor', label: 'Devolução a Fornecedor' }, { value: 'consumo', label: 'Consumo Interno' }, { value: 'brinde', label: 'Brinde' }, { value: 'outro', label: 'Outro' }];

  const columns = [
    { header: 'Produto', render: r => <span className="font-medium text-slate-900">{r.product_name}</span> },
    { header: 'Qtd', render: r => <span className="font-mono text-red-600">-{r.quantity}</span>, align: 'right' },
    { header: 'Motivo', render: r => reasons.find(x=>x.value===r.reason)?.label || r.reason },
    { header: 'Observações', accessor: 'notes' },
    { header: 'Data', render: r => formatDateTime(r.created_at) },
  ];

  return (
    <div data-testid="stock-exits-page">
      <PageHeader title="Saídas de Estoque" subtitle="Registre saídas manuais">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-all"><Plus size={16} /> Nova Saída</button>
      </PageHeader>
      <DataTable columns={columns} data={entries} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Saída de Estoque">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Produto</label>
            <select value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" required>
              <option value="">Selecione</option>
              {products.map(p => <option key={p._id||p.id} value={p._id||p.id}>{p.name} (Estoque: {p.stock_quantity})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Quantidade</label>
              <input type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Motivo</label>
              <select value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Observações</label>
            <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
          </div>
          <button type="submit" className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-medium py-2.5 rounded-lg transition-all">Registrar Saída</button>
        </form>
      </Modal>
    </div>
  );
}
