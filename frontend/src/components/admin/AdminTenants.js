import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatDate } from '../../utils/helpers';
import { PageHeader, DataTable, Badge, Modal } from '../shared/UIComponents';
import { Plus, Building2 } from 'lucide-react';

export default function AdminTenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ company_name: '', cnpj: '', email: '', phone: '' });

  useEffect(() => { loadTenants(); }, []);

  const loadTenants = () => {
    api.get('/api/admin/tenants').then(r => setTenants(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/tenants', form);
      setShowModal(false);
      setForm({ company_name: '', cnpj: '', email: '', phone: '' });
      loadTenants();
    } catch {}
  };

  const toggleTenant = async (id) => {
    await api.patch(`/api/admin/tenants/${id}/toggle`);
    loadTenants();
  };

  const columns = [
    { header: 'Empresa', accessor: 'company_name', render: r => <span className="font-medium text-slate-900">{r.company_name}</span> },
    { header: 'CNPJ', accessor: 'cnpj' },
    { header: 'Email', accessor: 'email' },
    { header: 'Telefone', accessor: 'phone' },
    { header: 'Status', render: r => <Badge variant={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Ativo' : 'Bloqueado'}</Badge> },
    { header: 'Criado', render: r => formatDate(r.created_at) },
    { header: 'Ações', render: r => (
      <button data-testid={`toggle-tenant-${r._id}`} onClick={(e) => { e.stopPropagation(); toggleTenant(r._id); }} className={`text-xs px-2 py-1 rounded ${r.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'} transition-colors`}>
        {r.is_active ? 'Bloquear' : 'Ativar'}
      </button>
    )},
  ];

  return (
    <div data-testid="admin-tenants-page">
      <PageHeader title="Clientes" subtitle={`${tenants.length} empresas cadastradas`}>
        <button data-testid="add-tenant-button" onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-purple hover:bg-brand-purple-hover text-white text-sm font-medium rounded-lg transition-all">
          <Plus size={16} /> Novo Cliente
        </button>
      </PageHeader>
      <DataTable columns={columns} data={tenants} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Cliente">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Nome da Empresa</label>
            <input data-testid="tenant-name-input" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" required />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">CNPJ</label>
            <input data-testid="tenant-cnpj-input" value={form.cnpj} onChange={e => setForm({...form, cnpj: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Email</label>
            <input data-testid="tenant-email-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" required />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Telefone</label>
            <input data-testid="tenant-phone-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
          <button type="submit" data-testid="save-tenant-button" className="w-full bg-brand-purple hover:bg-brand-purple-hover text-white font-medium py-2.5 rounded-lg transition-all">Cadastrar</button>
        </form>
      </Modal>
    </div>
  );
}
