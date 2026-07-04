import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader, DataTable, Badge, Modal } from '../shared/UIComponents';
import { Plus, Search } from 'lucide-react';

export default function SaaSClients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', document: '', document_type: 'CPF', email: '', phone: '' });

  useEffect(() => { loadClients(); }, []);
  const loadClients = () => api.get('/api/saas/clients').then(r => setClients(r.data?.data || r.data || [])).catch(() => {});

  const filtered = clients.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.document?.includes(search));

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/api/saas/clients', form);
    setShowModal(false);
    setForm({ name: '', document: '', document_type: 'CPF', email: '', phone: '' });
    loadClients();
  };

  const columns = [
    { header: 'Nome', render: r => <span className="font-medium text-slate-900">{r.name}</span> },
    { header: 'Documento', render: r => (<span><span className="text-xs text-slate-400 mr-1">{r.document_type}</span>{r.document}</span>) },
    { header: 'Email', accessor: 'email' },
    { header: 'Telefone', accessor: 'phone' },
    { header: 'Status', render: r => <Badge variant={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Ativo' : 'Inativo'}</Badge> },
  ];

  return (
    <div data-testid="saas-clients-page">
      <PageHeader title="Clientes" subtitle={`${clients.length} clientes`}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input data-testid="client-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-56" />
        </div>
        <button data-testid="add-client-button" onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-all">
          <Plus size={16} /> Novo Cliente
        </button>
      </PageHeader>
      <DataTable columns={columns} data={filtered} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Cliente">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Nome</label>
            <input data-testid="client-name-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Tipo</label>
              <select value={form.document_type} onChange={e => setForm({...form, document_type: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Documento</label>
              <input value={form.document} onChange={e => setForm({...form, document: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Telefone</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <button type="submit" data-testid="save-client-button" className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-medium py-2.5 rounded-lg transition-all">Cadastrar</button>
        </form>
      </Modal>
    </div>
  );
}
