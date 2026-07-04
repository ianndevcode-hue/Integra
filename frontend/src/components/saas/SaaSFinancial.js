import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { PageHeader, DataTable, Badge, Modal } from '../shared/UIComponents';
import { Plus, DollarSign, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export default function SaaSFinancial() {
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'receivable', description: '', amount: 0, due_date: '', category: '' });

  useEffect(() => { loadEntries(); }, []);
  const loadEntries = () => api.get('/api/saas/financial').then(r => setEntries(r.data?.data || r.data || [])).catch(() => {});

  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter);

  const totals = entries.reduce((acc, e) => {
    if (e.type === 'receivable' && e.status === 'pending') acc.receivable += e.amount;
    if (e.type === 'payable' && e.status === 'pending') acc.payable += e.amount;
    return acc;
  }, { receivable: 0, payable: 0 });

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/api/saas/financial', { ...form, amount: parseFloat(form.amount) });
    setShowModal(false);
    setForm({ type: 'receivable', description: '', amount: 0, due_date: '', category: '' });
    loadEntries();
  };

  const markPaid = async (id) => {
    await api.patch(`/api/saas/financial/${id}/pay`);
    loadEntries();
  };

  const columns = [
    { header: 'Descrição', render: r => <span className="font-medium text-slate-900">{r.description}</span> },
    { header: 'Tipo', render: r => (
      <Badge variant={r.type === 'receivable' ? 'success' : 'danger'}>
        {r.type === 'receivable' ? 'A Receber' : 'A Pagar'}
      </Badge>
    )},
    { header: 'Valor', render: r => <span className={`font-mono font-medium ${r.type === 'receivable' ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(r.amount)}</span>, align: 'right' },
    { header: 'Vencimento', render: r => formatDate(r.due_date) },
    { header: 'Status', render: r => <Badge variant={r.status === 'paid' ? 'success' : 'warning'}>{r.status === 'paid' ? 'Pago' : 'Pendente'}</Badge> },
    { header: 'Ações', render: r => r.status === 'pending' ? (
      <button data-testid={`pay-entry-${r._id}`} onClick={() => markPaid(r._id)} className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors">Dar Baixa</button>
    ) : null },
  ];

  return (
    <div data-testid="saas-financial-page">
      <PageHeader title="Financeiro" subtitle="Contas a pagar e receber">
        <button data-testid="add-financial-button" onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-all">
          <Plus size={16} /> Nova Entrada
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4">
          <div className="p-2.5 bg-emerald-50 rounded-lg"><ArrowUpCircle size={20} className="text-emerald-600" /></div>
          <div>
            <p className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500">A Receber</p>
            <p className="text-xl font-heading font-bold text-emerald-600">{formatCurrency(totals.receivable)}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4">
          <div className="p-2.5 bg-red-50 rounded-lg"><ArrowDownCircle size={20} className="text-red-600" /></div>
          <div>
            <p className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500">A Pagar</p>
            <p className="text-xl font-heading font-bold text-red-600">{formatCurrency(totals.payable)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[['all', 'Todos'], ['receivable', 'A Receber'], ['payable', 'A Pagar']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === v ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>{l}</button>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Entrada">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Tipo</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
              <option value="receivable">A Receber</option>
              <option value="payable">A Pagar</option>
            </select>
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Descrição</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Valor</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" required />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Vencimento</label>
              <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" required />
            </div>
          </div>
          <button type="submit" data-testid="save-financial-button" className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-medium py-2.5 rounded-lg transition-all">Salvar</button>
        </form>
      </Modal>
    </div>
  );
}
