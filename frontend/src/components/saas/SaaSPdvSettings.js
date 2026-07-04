import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader } from '../shared/UIComponents';
import { Save, MonitorSmartphone } from 'lucide-react';

const PDV_MODES = [
  { value: 'varejo', label: 'Mercado / Varejo' },
  { value: 'restaurante', label: 'Restaurante / Bar' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'oficina', label: 'Oficina / Assistência Técnica' },
  { value: 'veiculos', label: 'Veículos' },
  { value: 'imoveis', label: 'Imóveis' },
  { value: 'roupas', label: 'Roupas / Calçados' },
  { value: 'hortifruti', label: 'Hortifrúti' },
  { value: 'distribuidora', label: 'Distribuidora' },
];

export default function SaaSPdvSettings() {
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/api/saas/pdv-settings').then(r => setSettings(r.data)).catch(() => {}); }, []);

  const handleSave = async () => {
    setSaving(true);
    await api.put('/api/saas/pdv-settings', settings).catch(() => {});
    setSaving(false);
  };

  return (
    <div data-testid="saas-pdv-settings-page">
      <PageHeader title="Configurações do PDV" subtitle="Configure o comportamento do ponto de venda">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50">
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </PageHeader>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-sm tracking-[0.15em] uppercase font-semibold text-slate-500 mb-4">Modo do PDV</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PDV_MODES.map(mode => (
              <button key={mode.value} onClick={() => setSettings({...settings, mode: mode.value})}
                className={`p-3 rounded-lg border-2 text-left transition-all ${settings.mode === mode.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <MonitorSmartphone size={18} className={settings.mode === mode.value ? 'text-blue-600' : 'text-slate-400'} />
                <p className={`text-sm font-medium mt-1 ${settings.mode === mode.value ? 'text-blue-700' : 'text-slate-700'}`}>{mode.label}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-sm tracking-[0.15em] uppercase font-semibold text-slate-500 mb-4">Opções</h3>
          <div className="space-y-3">
            {[
              { key: 'allow_discount', label: 'Permitir Desconto' },
              { key: 'require_client', label: 'Exigir Cliente na Venda' },
              { key: 'auto_print', label: 'Impressão Automática' },
              { key: 'allow_surcharge', label: 'Permitir Acréscimo' },
              { key: 'allow_cancel', label: 'Permitir Cancelamento' },
              { key: 'offline_mode', label: 'Modo Offline Habilitado' },
            ].map(opt => (
              <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings[opt.key] || false} onChange={e => setSettings({...settings, [opt.key]: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
