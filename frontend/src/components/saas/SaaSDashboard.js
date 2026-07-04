import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { StatCard, Skeleton } from '../shared/UIComponents';
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['#2563EB', '#10B981', '#8B5CF6', '#F59E0B'];

export default function SaaSDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/saas/dashboard').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );

  const paymentLabels = { dinheiro: 'Dinheiro', cartao_credito: 'Cartão Crédito', cartao_debito: 'Cartão Débito', pix: 'PIX' };

  return (
    <div className="space-y-6" data-testid="saas-dashboard">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Visão geral do seu negócio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Produtos" value={data?.total_products || 0} icon={Package} color="blue" delay={1} />
        <StatCard label="Clientes" value={data?.total_clients || 0} icon={Users} color="green" delay={2} />
        <StatCard label="Vendas" value={data?.total_sales || 0} icon={ShoppingCart} color="purple" delay={3} />
        <StatCard label="Receita Total" value={formatCurrency(data?.total_revenue || 0)} icon={TrendingUp} color="blue" delay={4} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="A Receber" value={formatCurrency(data?.receivable || 0)} icon={DollarSign} color="green" />
        <StatCard label="A Pagar" value={formatCurrency(data?.payable || 0)} icon={DollarSign} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm tracking-[0.15em] uppercase font-semibold text-slate-500 mb-4">Vendas - Últimos 30 Dias</h2>
          {data?.daily_sales?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.daily_sales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => formatCurrency(v)} labelFormatter={v => `Data: ${v}`} />
                <Bar dataKey="total" fill="#2563EB" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-slate-500 py-16">Sem dados de vendas</p>}
        </div>

        {/* Payment Methods */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm tracking-[0.15em] uppercase font-semibold text-slate-500 mb-4">Formas de Pagamento</h2>
          {data?.sales_by_payment?.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.sales_by_payment.map(d => ({...d, name: paymentLabels[d.method] || d.method}))} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                    {data.sales_by_payment.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {data.sales_by_payment.map((d, i) => (
                  <div key={d.method} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: PIE_COLORS[i % PIE_COLORS.length]}} />
                      <span className="text-slate-600">{paymentLabels[d.method] || d.method}</span>
                    </div>
                    <span className="font-mono text-slate-900">{formatCurrency(d.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-center text-slate-500 py-16">Sem dados</p>}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {data?.low_stock?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-3">
            <AlertTriangle size={16} /> Alerta de Estoque Baixo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.low_stock.map(p => (
              <div key={p._id} className="bg-white rounded-lg p-3 border border-amber-200">
                <p className="text-sm font-medium text-slate-900">{p.name}</p>
                <p className="text-xs text-amber-700 mt-1">Estoque: {p.stock_quantity} | Mínimo: {p.min_stock}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sales */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm tracking-[0.15em] uppercase font-semibold text-slate-500 mb-4">Últimas Vendas</h2>
        {data?.recent_sales?.length > 0 ? (
          <div className="space-y-3">
            {data.recent_sales.map(s => (
              <div key={s._id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{s.sale_number} - {s.client_name}</p>
                  <p className="text-xs text-slate-500">{s.items?.length || 0} itens | {paymentLabels[s.payment_method] || s.payment_method}</p>
                </div>
                <span className="font-mono font-medium text-slate-900">{formatCurrency(s.total)}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-center text-slate-500 py-8">Nenhuma venda registrada</p>}
      </div>
    </div>
  );
}
