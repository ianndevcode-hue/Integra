import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader, Badge, Modal, EmptyState } from '../shared/UIComponents';
import { formatDateTime } from '../../utils/helpers';
import { Plus, Key, Copy, Trash2 } from 'lucide-react';

export default function AdminApiKeys() {
  const [keys, setKeys] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', tenant_id: '', description: '' });
  const [newKey, setNewKey] = useState(null);

  useEffect(() => { loadKeys(); }, []);
  const loadKeys = () => api.get('/api/admin/api-keys').then(r => setKeys(r.data)).catch(() => {});

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await api.post('/api/admin/api-keys', form);
    setNewKey(res.data.key);
    setForm({ name: '', tenant_id: '', description: '' });
    loadKeys();
  };

  const revokeKey = async (id) => {
    if (!window.confirm('Revogar esta API Key?')) return;
    await api.patch(`/api/admin/api-keys/${id}/revoke`);
    loadKeys();
  };

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
  };

  return (
    <div data-testid="admin-api-keys-page">
      <PageHeader title="API Keys" subtitle={`${keys.length} chaves`}>
        <button data-testid="add-api-key" onClick={() => { setShowModal(true); setNewKey(null); }} className="flex items-center gap-2 px-4 py-2 bg-brand-purple hover:bg-brand-purple-hover text-white text-sm font-medium rounded-lg transition-all">
          <Plus size={16} /> Nova Key
        </button>
      </PageHeader>

      {keys.length === 0 ? <EmptyState icon={Key} title="Nenhuma API Key" description="Crie uma nova chave de API." /> : (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {keys.map(k => (
            <div key={k._id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${k.is_active ? 'bg-purple-50' : 'bg-slate-100'}`}>
                  <Key size={16} className={k.is_active ? 'text-purple-600' : 'text-slate-400'} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{k.name || 'API Key'}</p>
                  <p className="text-xs font-mono text-slate-500">{k.key_preview}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{formatDateTime(k.created_at)}</span>
                <Badge variant={k.is_active ? 'success' : 'danger'}>{k.is_active ? 'Ativa' : 'Revogada'}</Badge>
                {k.is_active && (
                  <button onClick={() => revokeKey(k._id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors">Revogar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={newKey ? 'Key Criada' : 'Nova API Key'}>
        {newKey ? (
          <div className="space-y-4">
            <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">Copie a chave agora. Ela não será exibida novamente.</p>
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg">
              <code className="text-xs font-mono flex-1 break-all">{newKey}</code>
              <button onClick={() => copyKey(newKey)} className="p-2 hover:bg-slate-200 rounded"><Copy size={14} /></button>
            </div>
            <button onClick={() => setShowModal(false)} className="w-full bg-brand-purple text-white py-2.5 rounded-lg">Fechar</button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Nome</label>
              <input data-testid="api-key-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" required />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Descrição</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <button type="submit" className="w-full bg-brand-purple hover:bg-brand-purple-hover text-white font-medium py-2.5 rounded-lg transition-all">Criar Key</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
