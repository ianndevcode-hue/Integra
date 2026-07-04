import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader } from '../shared/UIComponents';
import { Save } from 'lucide-react';

export default function SaaSSettings() {
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/api/saas/settings').then(r => setSettings(r.data)).catch(() => {}); }, []);

  const handleSave = async () => {
    setSaving(true);
    const { _id, id, ...data } = settings;
    await api.put('/api/saas/settings', data).catch(() => {});
    setSaving(false);
  };

  return (
    <div data-testid="saas-settings-page">
      <PageHeader title="Configurações" subtitle="Dados da empresa">
        <button data-testid="save-settings-button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50">
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </PageHeader>
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Nome da Empresa</label>
            <input value={settings.company_name || ''} onChange={e => setSettings({...settings, company_name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">CNPJ</label>
            <input value={settings.cnpj || ''} onChange={e => setSettings({...settings, cnpj: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Email</label>
            <input value={settings.email || ''} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Telefone</label>
            <input value={settings.phone || ''} onChange={e => setSettings({...settings, phone: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
