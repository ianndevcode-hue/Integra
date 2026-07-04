import React from 'react';
import { PageHeader, EmptyState } from '../shared/UIComponents';
import { FileText, Shield } from 'lucide-react';

export default function SaaSFiscal() {
  return (
    <div data-testid="saas-fiscal-page">
      <PageHeader title="Módulo Fiscal" subtitle="NF-e e NFC-e" />
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-amber-50 rounded-lg"><Shield size={20} className="text-amber-600" /></div>
          <div>
            <h3 className="font-medium text-slate-900">Ambiente: Homologação</h3>
            <p className="text-xs text-slate-500">Configurações fiscais do microserviço</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Certificado A1', desc: 'Upload do certificado digital', status: 'Não configurado' },
            { title: 'CSC / Token NFC-e', desc: 'Código de segurança do contribuinte', status: 'Não configurado' },
            { title: 'Séries NF-e / NFC-e', desc: 'Séries de emissão configuradas', status: 'Padrão (1)' },
            { title: 'Emitir NF-e (Modelo 55)', desc: 'Emissão de Nota Fiscal Eletrônica', status: 'Disponível' },
            { title: 'Emitir NFC-e (Modelo 65)', desc: 'Nota Fiscal Consumidor', status: 'Disponível' },
            { title: 'DANFE / DANFCE', desc: 'Impressão de documentos auxiliares', status: 'Disponível' },
            { title: 'Cancelamento', desc: 'Cancelar notas emitidas', status: 'Disponível' },
            { title: 'Inutilização', desc: 'Inutilizar numeração', status: 'Disponível' },
            { title: 'Carta de Correção', desc: 'Emissão de CC-e', status: 'Disponível' },
          ].map(item => (
            <div key={item.title} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors cursor-pointer">
              <h4 className="text-sm font-medium text-slate-900">{item.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-2 bg-slate-100 text-slate-600">{item.status}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-6 text-center">Microserviço fiscal com NFePHP/sped-nfe - Estrutura pronta para integração</p>
      </div>
    </div>
  );
}
