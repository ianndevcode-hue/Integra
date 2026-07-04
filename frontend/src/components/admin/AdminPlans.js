import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { PageHeader, DataTable, Badge, Modal } from '../shared/UIComponents';
import { Plus } from 'lucide-react';

const ALL_MODULES = ['products','clients','sales','financial','inventory','suppliers','reports','fiscal','pdv','api','support'];

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: 0, modules: [], max_users: 5 });

  useEffect(() => { loadPlans(); }, []);
  const loadPlans = () => api.get('/api/admin/plans').then(r => setPlans(r.data)).catch(() => {});

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/api/admin/plans', form);
    setShowModal(false);
    setForm({ name: '', description: '', price: 0, modules: [], max_users: 5 });
    loadPlans();
  };

  const toggleModule = (mod) => {
    setForm(f => ({ ...f, modules: f.modules.includes(mod) ? f.modules.filter(m => m !== mod) : [...f.modules, mod] }));
  };

  const columns = [
    { header: 'Plano', accessor: 'name', render: r => <span className="font-medium text-slate-900">{r.name}</span> },
    { header: 'Descrição', accessor: 'description' },
    { header: 'Preço', render: r => <span className="font-mono">{formatCurrency(r.price)}</span>, align: 'right' },
    { header: 'Módulos', render: r => <span className="text-xs">{(r.modules||[]).length}</span> },
    { header: 'Max Usuários', accessor: 'max_users', align: 'right' },
    { header: 'Status', render: r => <Badge variant={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Ativo' : 'Inativo'}</Badge> },
  ];

  return (
    <div data-testid="admin-plans-page">
      <PageHeader title="Planos" subtitle={`${plans.length} planos`}>
        <button data-testid="add-plan-button" onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-purple hover:bg-brand-purple-hover text-white text-sm font-medium rounded-lg transition-all">
          <Plus size={16} /> Novo Plano
        </button>
      </PageHeader>
      <DataTable columns={columns} data={plans} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Plano">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Nome</label>
            <input data-testid="plan-name-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" required />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Descrição</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Preço (R$)</label>
              <input type="number" step="0.01" data-testid="plan-price-input" value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value)})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Max Usuários</label>
              <input type="number" value={form.max_users} onChange={e => setForm({...form, max_users: parseInt(e.target.value)})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Módulos</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ALL_MODULES.map(mod => (
                <button key={mod} type="button" onClick={() => toggleModule(mod)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.modules.includes(mod) ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {mod}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" data-testid="save-plan-button" className="w-full bg-brand-purple hover:bg-brand-purple-hover text-white font-medium py-2.5 rounded-lg transition-all">Cadastrar</button>
        </form>
      </Modal>
    </div>
  );
}
