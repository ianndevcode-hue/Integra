import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader, Badge, EmptyState } from '../shared/UIComponents';
import { Headphones, MessageSquare } from 'lucide-react';

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => { loadTickets(); }, [filter]);
  const loadTickets = () => {
    const params = filter ? `?status=${filter}` : '';
    api.get(`/api/admin/support${params}`).then(r => setTickets(r.data?.data || r.data || [])).catch(() => {});
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/api/admin/support/${id}`, { status });
    loadTickets();
  };

  const statusColors = { open: 'warning', in_progress: 'info', resolved: 'success', closed: 'default' };
  const statusLabels = { open: 'Aberto', in_progress: 'Em Andamento', resolved: 'Resolvido', closed: 'Fechado' };

  return (
    <div data-testid="admin-support-page">
      <PageHeader title="Suporte" subtitle="Chamados dos clientes" />
      <div className="flex gap-2 mb-4">
        {[['', 'Todos'], ['open', 'Abertos'], ['in_progress', 'Em Andamento'], ['resolved', 'Resolvidos']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === v ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-slate-600 hover:bg-slate-100 border border-transparent'}`}>{l}</button>
        ))}
      </div>
      {tickets.length === 0 ? <EmptyState icon={Headphones} title="Nenhum chamado" description="Os chamados de suporte aparecerão aqui." /> : (
        <div className="space-y-3">
          {tickets.map(t => (
            <div key={t._id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.subject || 'Sem assunto'}</p>
                  <p className="text-xs text-slate-500">{t.user_name} - {t.user_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusColors[t.status]}>{statusLabels[t.status] || t.status}</Badge>
                  <select value={t.status} onChange={e => updateStatus(t._id, e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1">
                    <option value="open">Aberto</option>
                    <option value="in_progress">Em Andamento</option>
                    <option value="resolved">Resolvido</option>
                    <option value="closed">Fechado</option>
                  </select>
                </div>
              </div>
              <p className="text-sm text-slate-600">{t.description || t.messages?.[0]?.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
