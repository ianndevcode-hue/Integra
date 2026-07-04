import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, LayoutDashboard, Smartphone, ArrowRight } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_4e2cd625-ade9-4dd7-89bf-7caab1ef00f2/artifacts/tbyxp0yk_image.png';

const apps = [
  {
    to: '/admin/login',
    icon: Shield,
    title: 'Admin Master',
    description: 'Painel da Integra Code para gerenciar clientes, licenças, planos e configurações do sistema.',
    color: 'purple',
    bg: 'bg-purple-50 hover:bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
    testId: 'go-admin'
  },
  {
    to: '/app/login',
    icon: LayoutDashboard,
    title: 'Web SaaS',
    description: 'Sistema empresarial com dashboard, produtos, vendas, financeiro, fiscal e relatórios.',
    color: 'blue',
    bg: 'bg-blue-50 hover:bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    testId: 'go-saas'
  },
  {
    to: '/pdv/login',
    icon: Smartphone,
    title: 'Mobile / PDV',
    description: 'Ponto de venda com venda rápida, carrinho, caixa, pagamentos e sincronização offline.',
    color: 'green',
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    testId: 'go-pdv'
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={LOGO_URL} alt="Integra Code" className="h-10 w-10 rounded-lg" />
          <div>
            <h1 className="font-heading font-bold text-slate-900">Integra SYS</h1>
            <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-slate-500">by Integra Code</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-slate-900 tracking-tight">
              Selecione o Aplicativo
            </h2>
            <p className="text-slate-500 mt-2 max-w-xl mx-auto">
              O Integra SYS possui três módulos independentes integrados pela mesma API.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {apps.map((app, i) => (
              <Link
                key={app.to}
                to={app.to}
                data-testid={app.testId}
                className={`group bg-white border ${app.border} rounded-lg p-6 transition-all duration-200 hover:shadow-md animate-fade-in-delay-${i + 1}`}
              >
                <div className={`w-12 h-12 rounded-lg ${app.bg} flex items-center justify-center mb-4 transition-colors`}>
                  <app.icon size={24} className={app.text} />
                </div>
                <h3 className="font-heading font-bold text-lg text-slate-900 mb-2">{app.title}</h3>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed">{app.description}</p>
                <div className={`flex items-center gap-1 text-sm font-medium ${app.text} group-hover:gap-2 transition-all`}>
                  Acessar <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs text-slate-400">Integra SYS v2.0 - ERP/PDV SaaS Multi-tenant | Integra Code</p>
        </div>
      </footer>
    </div>
  );
}
