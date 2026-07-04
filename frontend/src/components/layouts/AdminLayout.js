import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Building2, KeyRound, CreditCard, Users, FileText,
  Shield, LogOut, Menu, ChevronRight, ChevronDown, Puzzle, UserCheck, Globe, Webhook,
  Settings, Headphones, Sliders, BarChart3, Bell, BookOpen, Edit3
} from 'lucide-react';

const LOGO = 'https://customer-assets.emergentagent.com/job_4e2cd625-ade9-4dd7-89bf-7caab1ef00f2/artifacts/tbyxp0yk_image.png';

const navSections = [
  { label: 'Painel', items: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/alerts', icon: Bell, label: 'Alertas' },
  ]},
  { label: 'Clientes & Licenças', items: [
    { to: '/admin/tenants', icon: Building2, label: 'Clientes / Empresas' },
    { to: '/admin/licenses', icon: KeyRound, label: 'Licenças' },
    { to: '/admin/plans', icon: CreditCard, label: 'Planos' },
    { to: '/admin/modules', icon: Puzzle, label: 'Módulos' },
    { to: '/admin/module-editor', icon: Edit3, label: 'Editor de Módulos' },
  ]},
  { label: 'Rede & Integrações', items: [
    { to: '/admin/resellers', icon: UserCheck, label: 'Revendedores' },
    { to: '/admin/api-keys', icon: Globe, label: 'API Keys' },
    { to: '/admin/webhooks', icon: Webhook, label: 'Webhooks' },
  ]},
  { label: 'Sistema', items: [
    { to: '/admin/users', icon: Users, label: 'Usuários' },
    { to: '/admin/logs', icon: FileText, label: 'Logs de Auditoria' },
    { to: '/admin/reports', icon: BarChart3, label: 'Relatórios' },
    { to: '/admin/support', icon: Headphones, label: 'Suporte' },
    { to: '/admin/settings', icon: Settings, label: 'Configurações' },
  ]},
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const toggle = (label) => setCollapsed(p => ({...p, [label]: !p[label]}));

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[250px] bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="IC" className="h-9 w-9 rounded-lg" />
            <div>
              <span className="font-heading font-bold text-slate-900 text-sm leading-tight block">Integra SYS</span>
              <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-purple-600">Admin Master</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto scrollbar-thin">
          {navSections.map(section => (
            <div key={section.label} className="mb-1">
              <button onClick={() => toggle(section.label)} className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase font-semibold text-slate-400 hover:text-slate-600 transition-colors">
                {section.label}
                <ChevronDown size={10} className={`transition-transform ${collapsed[section.label] ? '-rotate-90' : ''}`} />
              </button>
              {!collapsed[section.label] && section.items.map(item => {
                const active = location.pathname === item.to || (item.to !== '/admin' && location.pathname.startsWith(item.to + '/')) || (item.to !== '/admin' && location.pathname === item.to);
                const isExact = location.pathname === item.to;
                const isActive = item.to === '/admin' ? isExact : active;
                return (
                  <Link key={item.to} to={item.to} data-testid={`admin-nav-${item.label.toLowerCase().replace(/[\s\/]/g,'-')}`} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150 ${isActive ? 'bg-purple-50 text-purple-700 border-l-2 border-purple-500 ml-0' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                    <item.icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200 bg-slate-50/50">
          <div className="px-3 py-1.5 mb-1">
            <p className="text-[13px] font-semibold text-slate-900 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button data-testid="admin-logout-button" onClick={logout} className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[13px] font-medium text-red-600 hover:bg-red-50 transition-all">
            <LogOut size={15} /><span>Sair do Sistema</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600" data-testid="admin-menu-toggle"><Menu size={24} /></button>
          <span className="font-heading font-bold text-slate-900">Admin Master</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
