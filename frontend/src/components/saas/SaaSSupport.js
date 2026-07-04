import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader, Badge, EmptyState, Modal } from '../shared/UIComponents';
import { Headphones, Plus } from 'lucide-react';

export default function SaaSSupport() {
  const [tickets, setTickets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium' });

  useEffect(() => { loadTickets(); }, []);
  const loadTickets = () => api.get('/api/saas/support').then(r => setTickets(r.data)).catch(() => {});

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/api/saas/support', form);
    setShowModal(false);
    setForm({ subject: '', description: '', priority: 'medium' });
    loadTickets();
  };

  const statusColors = { open: 'warning', in_progress: 'info', resolved: 'success', closed: 'default' };
  const statusLabels = { open: 'Aberto', in_progress: 'Em Andamento', resolved: 'Resolvido', closed: 'Fechado' };
  const priorityColors = { low: 'default', medium: 'warning', high: 'danger', urgent: 'danger' };

  return (
    <div data-testid="saas-support-page">
      <PageHeader title="Suporte" subtitle="Abra chamados de suporte">
        <button data-testid="add-ticket" onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-all">
          <Plus size={16} /> Novo Chamado
        </button>
      </PageHeader>
      {tickets.length === 0 ? <EmptyState icon={Headphones} title="Nenhum chamado" description="Abra um chamado se precisar de ajuda." /> : (
        <div className="space-y-3">
          {tickets.map(t => (
            <div key={t._id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.description?.substring(0, 100)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={priorityColors[t.priority]}>{t.priority}</Badge>
                  <Badge variant={statusColors[t.status]}>{statusLabels[t.status] || t.status}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Chamado">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Assunto</label>
            <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" required />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Prioridade</label>
            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Descrição</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" rows={4} required />
          </div>
          <button type="submit" className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-medium py-2.5 rounded-lg transition-all">Enviar Chamado</button>
        </form>
      </Modal>
    </div>
  );
}
