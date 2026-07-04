import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Building2, KeyRound, CreditCard, Users, FileText,
  Shield, LogOut, Menu, ChevronRight, Puzzle, UserCheck, Globe, Webhook,
  Settings, Headphones
} from 'lucide-react';

const LOGO = 'https://customer-assets.emergentagent.com/job_4e2cd625-ade9-4dd7-89bf-7caab1ef00f2/artifacts/tbyxp0yk_image.png';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/tenants', icon: Building2, label: 'Clientes' },
  { to: '/admin/licenses', icon: KeyRound, label: 'Licenças' },
  { to: '/admin/plans', icon: CreditCard, label: 'Planos' },
  { to: '/admin/modules', icon: Puzzle, label: 'Módulos' },
  { to: '/admin/resellers', icon: UserCheck, label: 'Revendedores' },
  { to: '/admin/api-keys', icon: Globe, label: 'API Keys' },
  { to: '/admin/webhooks', icon: Webhook, label: 'Webhooks' },
  { to: '/admin/users', icon: Users, label: 'Usuários' },
  { to: '/admin/logs', icon: FileText, label: 'Logs' },
  { to: '/admin/support', icon: Headphones, label: 'Suporte' },
  { to: '/admin/settings', icon: Settings, label: 'Configurações' },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="IC" className="h-8 w-8 rounded-lg" />
            <div>
              <span className="font-heading font-bold text-slate-900 text-sm">Integra SYS</span>
              <span className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-purple-600">Admin Master</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map(item => {
            const active = location.pathname === item.to || (item.to !== '/admin' && location.pathname.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to} data-testid={`admin-nav-${item.label.toLowerCase().replace(/\s/g,'-')}`} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${active ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                <item.icon size={16} />
                <span>{item.label}</span>
                {active && <ChevronRight size={12} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-1.5 mb-1">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button data-testid="admin-logout-button" onClick={logout} className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[13px] font-medium text-red-600 hover:bg-red-50 transition-all">
            <LogOut size={16} /><span>Sair</span>
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
