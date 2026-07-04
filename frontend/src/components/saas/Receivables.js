import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader, DataTable, Badge, Modal, StatCard } from '../shared/UIComponents';
import { FilterTabs, ExportButtons } from '../shared/TableControls';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { Plus, TrendingUp } from 'lucide-react';

export default function Receivables() {
  const [entries, setEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ description: '', amount: 0, due_date: '', client_id: '', category: 'vendas', installments: 1 });

  useEffect(() => { load(); }, [filter]);
  const load = () => {
    const params = filter ? `?type_filter=receivable&status=${filter}` : '?type_filter=receivable';
    api.get(`/api/saas/financial${params}`).then(r => setEntries(r.data?.data || r.data || [])).catch(() => {});
    api.get('/api/saas/clients').then(r => setClients(r.data?.data || r.data || [])).catch(() => {});
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const inst = parseInt(form.installments) || 1;
    const amount = parseFloat(form.amount) / inst;
    for (let i = 0; i < inst; i++) {
      const due = new Date(form.due_date);
      due.setMonth(due.getMonth() + i);
      await api.post('/api/saas/financial', {
        type: 'receivable', description: inst > 1 ? `${form.description} (${i+1}/${inst})` : form.description,
        amount, due_date: due.toISOString().split('T')[0], category: form.category, client_id: form.client_id,
        client_name: clients.find(c => (c._id||c.id) === form.client_id)?.name || ''
      });
    }
    setShowModal(false);
    setForm({ description: '', amount: 0, due_date: '', client_id: '', category: 'vendas', installments: 1 });
    load();
  };

  const markPaid = async (id) => { await api.patch(`/api/saas/financial/${id}/pay`); load(); };
  const total = entries.reduce((s, e) => s + (e.status === 'pending' ? (e.amount||0) : 0), 0);
  const overdue = entries.filter(e => e.status === 'pending' && e.due_date < new Date().toISOString());

  const columns = [
    { header: 'Descrição', render: r => <span className="font-medium text-slate-900">{r.description}</span> },
    { header: 'Cliente', render: r => r.client_name || '-' },
    { header: 'Valor', render: r => <span className="font-mono font-medium text-emerald-600">{formatCurrency(r.amount)}</span>, align: 'right' },
    { header: 'Vencimento', render: r => {
      const isOverdue = r.status === 'pending' && r.due_date < new Date().toISOString();
      return <span className={isOverdue ? 'text-red-600 font-medium' : ''}>{formatDate(r.due_date)}</span>;
    }},
    { header: 'Status', render: r => <Badge variant={r.status === 'paid' ? 'success' : 'warning'}>{r.status === 'paid' ? 'Recebido' : 'Pendente'}</Badge> },
    { header: '', render: r => r.status === 'pending' ? <button onClick={() => markPaid(r._id)} className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100">Dar Baixa</button> : null },
  ];

  return (
    <div data-testid="receivables-page">
      <PageHeader title="Contas a Receber" subtitle={`Total pendente: ${formatCurrency(total)}`}>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-all"><Plus size={16} /> Novo Recebível</button>
      </PageHeader>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Pendente" value={formatCurrency(total)} icon={TrendingUp} color="green" />
        <StatCard label="Vencidos" value={overdue.length} icon={TrendingUp} color="red" />
        <StatCard label="Total Títulos" value={entries.length} icon={TrendingUp} color="blue" />
      </div>
      <div className="mb-4"><FilterTabs options={[['', 'Todos'], ['pending', 'Pendentes'], ['paid', 'Recebidos']]} value={filter} onChange={setFilter} /></div>
      <DataTable columns={columns} data={entries} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Conta a Receber" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Descrição</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Cliente</label>
              <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                <option value="">Selecione (opcional)</option>
                {clients.map(c => <option key={c._id||c.id} value={c._id||c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Categoria</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                {['vendas','servicos','comissoes','alugueis','outros'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Valor Total</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Parcelas</label>
              <select value={form.installments} onChange={e => setForm({...form, installments: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x de {formatCurrency((parseFloat(form.amount)||0)/n)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">1º Vencimento</label>
              <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" required />
            </div>
          </div>
          <button type="submit" className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-medium py-2.5 rounded-lg transition-all">Cadastrar</button>
        </form>
      </Modal>
    </div>
  );
}
