import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader } from '../shared/UIComponents';
import { Save } from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/api/admin/settings').then(r => setSettings(r.data)).catch(() => {}); }, []);

  const handleSave = async () => {
    setSaving(true);
    await api.put('/api/admin/settings', settings).catch(() => {});
    setSaving(false);
  };

  return (
    <div data-testid="admin-settings-page">
      <PageHeader title="Configurações" subtitle="Configurações gerais do sistema">
        <button onClick={handleSave} disabled={saving} data-testid="save-admin-settings" className="flex items-center gap-2 px-4 py-2 bg-brand-purple hover:bg-brand-purple-hover text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50">
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </PageHeader>
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'company_name', label: 'Nome da Empresa' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Telefone' },
            { key: 'website', label: 'Website' },
            { key: 'fiscal_default_env', label: 'Ambiente Fiscal Padrão' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">{f.label}</label>
              <input value={settings[f.key] || ''} onChange={e => setSettings({...settings, [f.key]: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
