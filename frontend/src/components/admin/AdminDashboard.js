import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { StatCard, Skeleton } from '../shared/UIComponents';
import { Building2, Users, KeyRound, CreditCard, TrendingUp, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/dashboard').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Visão geral do sistema Integra SYS</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Clientes" value={data?.total_tenants || 0} icon={Building2} color="purple" delay={1} />
        <StatCard label="Usuários" value={data?.total_users || 0} icon={Users} color="blue" delay={2} />
        <StatCard label="Licenças Ativas" value={data?.active_licenses || 0} icon={KeyRound} color="green" delay={3} />
        <StatCard label="MRR" value={formatCurrency(data?.mrr || 0)} icon={TrendingUp} color="purple" delay={4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm tracking-[0.15em] uppercase font-semibold text-slate-500 mb-4">Clientes Recentes</h2>
          {data?.recent_tenants?.length > 0 ? (
            <div className="space-y-3">
              {data.recent_tenants.map((t, i) => (
                <div key={t._id || i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.company_name}</p>
                    <p className="text-xs text-slate-500">{t.email}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {t.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">Nenhum cliente cadastrado</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm tracking-[0.15em] uppercase font-semibold text-slate-500 mb-4">Resumo do Sistema</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Planos Disponíveis</span>
              <span className="font-mono font-medium text-slate-900">{data?.total_plans || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Licenças Total</span>
              <span className="font-mono font-medium text-slate-900">{data?.total_licenses || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Clientes Ativos</span>
              <span className="font-mono font-medium text-emerald-600">{data?.active_tenants || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
