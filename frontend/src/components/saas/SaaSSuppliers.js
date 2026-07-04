import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader, DataTable, Modal } from '../shared/UIComponents';
import { Plus } from 'lucide-react';

export default function SaaSSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', cnpj: '', email: '', phone: '' });

  useEffect(() => { loadSuppliers(); }, []);
  const loadSuppliers = () => api.get('/api/saas/suppliers').then(r => setSuppliers(r.data?.data || r.data || [])).catch(() => {});

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/api/saas/suppliers', form);
    setShowModal(false);
    setForm({ name: '', cnpj: '', email: '', phone: '' });
    loadSuppliers();
  };

  const columns = [
    { header: 'Fornecedor', render: r => <span className="font-medium text-slate-900">{r.name}</span> },
    { header: 'CNPJ', accessor: 'cnpj' },
    { header: 'Email', accessor: 'email' },
    { header: 'Telefone', accessor: 'phone' },
  ];

  return (
    <div data-testid="saas-suppliers-page">
      <PageHeader title="Fornecedores" subtitle={`${suppliers.length} fornecedores`}>
        <button data-testid="add-supplier-button" onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-all">
          <Plus size={16} /> Novo Fornecedor
        </button>
      </PageHeader>
      <DataTable columns={columns} data={suppliers} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Fornecedor">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Nome</label>
            <input data-testid="supplier-name-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" required />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">CNPJ</label>
            <input value={form.cnpj} onChange={e => setForm({...form, cnpj: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Telefone</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <button type="submit" data-testid="save-supplier-button" className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-medium py-2.5 rounded-lg transition-all">Cadastrar</button>
        </form>
      </Modal>
    </div>
  );
}
