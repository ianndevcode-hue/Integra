import React from 'react';
import { PageHeader, EmptyState } from '../shared/UIComponents';
import { FileCheck, Printer, FileSpreadsheet, Bell } from 'lucide-react';

export function NFePage() {
  return (
    <div data-testid="nfe-page">
      <PageHeader title="NF-e (Modelo 55)" subtitle="Notas Fiscais Eletrônicas" />
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          Módulo fiscal preparado para integração com NFePHP/sped-nfe, ACBr ou OpenAC.Net. Ambiente atual: <strong>Homologação</strong>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Emitir NF-e', desc: 'Emitir nota fiscal eletrônica modelo 55', status: 'Pronto para integração' },
            { title: 'Cancelamento', desc: 'Cancelar NF-e em até 24h', status: 'Pronto para integração' },
            { title: 'Carta de Correção', desc: 'CC-e para correções pós emissão', status: 'Pronto para integração' },
            { title: 'Inutilização', desc: 'Inutilizar faixa de numeração', status: 'Pronto para integração' },
            { title: 'DANFE', desc: 'Documento auxiliar da NF-e', status: 'Pronto para integração' },
            { title: 'Consulta Status', desc: 'Consultar status no SEFAZ', status: 'Pronto para integração' },
          ].map(item => (
            <div key={item.title} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors cursor-pointer">
              <h4 className="text-sm font-medium text-slate-900">{item.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-2 bg-blue-50 text-blue-600">{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function NFCePage() {
  return (
    <div data-testid="nfce-page">
      <PageHeader title="NFC-e (Modelo 65)" subtitle="Nota Fiscal Consumidor Eletrônica - Ideal para PDV, restaurantes e lojas" />
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800">
          NFC-e é emitida automaticamente pelo PDV ao finalizar a venda. Configuração: CSC/Token + Certificado A1 necessários.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Emissão Automática', desc: 'Emitida no momento da venda no PDV', icon: '🛒' },
            { title: 'DANFCE', desc: 'Impressão em cupom térmico 80mm', icon: '🖨️' },
            { title: 'Contingência', desc: 'Modo offline com envio posterior', icon: '⚡' },
            { title: 'Cancelamento', desc: 'Cancelar NFC-e em até 30min', icon: '❌' },
            { title: 'Rejeições', desc: 'Monitoramento e tratamento', icon: '⚠️' },
            { title: 'Logs Fiscais', desc: 'XML enviados e recebidos', icon: '📋' },
          ].map(item => (
            <div key={item.title} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
              <h4 className="text-sm font-medium text-slate-900">{item.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FiscalReports() {
  return (
    <div data-testid="fiscal-reports-page">
      <PageHeader title="Relatórios Fiscais" subtitle="Sped, XMLs e resumos" />
      <EmptyState icon={FileSpreadsheet} title="Sem relatórios fiscais" description="Os relatórios serão gerados quando houver notas emitidas." />
    </div>
  );
}

export function AdminAlerts() {
  return (
    <div data-testid="admin-alerts-page">
      <PageHeader title="Alertas do Sistema" subtitle="Notificações e alertas importantes" />
      <EmptyState icon={Bell} title="Nenhum alerta" description="Alertas de licenças vencendo, clientes inadimplentes e erros do sistema." />
    </div>
  );
}
