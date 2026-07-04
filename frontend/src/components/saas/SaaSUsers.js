import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader, DataTable, Badge, Modal } from '../shared/UIComponents';
import { Plus } from 'lucide-react';

export default function SaaSUsers() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'seller' });

  useEffect(() => { loadUsers(); }, []);
  const loadUsers = () => api.get('/api/saas/users').then(r => setUsers(r.data)).catch(() => {});

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/api/saas/users', form);
    setShowModal(false);
    setForm({ name: '', email: '', password: '', role: 'seller' });
    loadUsers();
  };

  const roleLabels = { admin: 'Admin', manager: 'Gerente', seller: 'Vendedor', cashier: 'Caixa' };

  const columns = [
    { header: 'Nome', render: r => <span className="font-medium text-slate-900">{r.name}</span> },
    { header: 'Email', accessor: 'email' },
    { header: 'Perfil', render: r => <Badge variant="info">{roleLabels[r.role] || r.role}</Badge> },
    { header: 'Status', render: r => <Badge variant={r.is_active !== false ? 'success' : 'danger'}>{r.is_active !== false ? 'Ativo' : 'Inativo'}</Badge> },
  ];

  return (
    <div data-testid="saas-users-page">
      <PageHeader title="Usuários" subtitle="Gerencie os usuários da empresa">
        <button data-testid="add-user-button" onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-all">
          <Plus size={16} /> Novo Usuário
        </button>
      </PageHeader>
      <DataTable columns={columns} data={users} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Usuário">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Nome</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" required />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" required />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Senha</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" required />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Perfil</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
              <option value="admin">Administrador</option>
              <option value="manager">Gerente</option>
              <option value="seller">Vendedor</option>
              <option value="cashier">Caixa</option>
            </select>
          </div>
          <button type="submit" data-testid="save-user-button" className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-medium py-2.5 rounded-lg transition-all">Cadastrar</button>
        </form>
      </Modal>
    </div>
  );
}
