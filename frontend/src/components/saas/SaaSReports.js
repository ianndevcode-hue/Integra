import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader, StatCard } from '../shared/UIComponents';
import { ExportButtons } from '../shared/TableControls';
import { formatCurrency } from '../../utils/helpers';
import { BarChart3, TrendingUp, ShoppingCart, Users, Package, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#2563EB', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

export default function SaaSReports() {
  const [tab, setTab] = useState('sales');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [salesReport, setSalesReport] = useState(null);
  const [productsReport, setProductsReport] = useState(null);
  const [financialReport, setFinancialReport] = useState(null);
  const [clientsReport, setClientsReport] = useState(null);

  useEffect(() => { loadReport(); }, [tab, dateRange]);

  const loadReport = async () => {
    const params = new URLSearchParams();
    if (dateRange.start) params.set('start_date', dateRange.start);
    if (dateRange.end) params.set('end_date', dateRange.end);
    try {
      if (tab === 'sales') {
        const r = await api.get(`/api/saas/reports/sales?${params}`);
        setSalesReport(r.data);
      } else if (tab === 'products') {
        const r = await api.get('/api/saas/reports/products');
        setProductsReport(r.data);
      } else if (tab === 'financial') {
        const r = await api.get(`/api/saas/reports/financial?${params}`);
        setFinancialReport(r.data);
      } else if (tab === 'clients') {
        const r = await api.get('/api/saas/reports/clients');
        setClientsReport(r.data);
      }
    } catch {}
  };

  const payLabels = { dinheiro: 'Dinheiro', cartao_credito: 'Crédito', cartao_debito: 'Débito', pix: 'PIX' };

  return (
    <div data-testid="saas-reports-page">
      <PageHeader title="Relatórios" subtitle="Relatórios gerenciais">
        <div className="flex items-center gap-2">
          <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
          <span className="text-xs text-slate-400">até</span>
          <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
        </div>
      </PageHeader>

      <div className="flex gap-2 mb-6">
        {[['sales', 'Vendas', ShoppingCart], ['products', 'Produtos', Package], ['financial', 'Financeiro', DollarSign], ['clients', 'Clientes', Users]].map(([v, l, Icon]) => (
          <button key={v} onClick={() => setTab(v)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === v ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-100 border border-transparent'}`}>
            <Icon size={16} /> {l}
          </button>
        ))}
      </div>

      {tab === 'sales' && salesReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Vendas" value={salesReport.total_count} icon={ShoppingCart} color="blue" />
            <StatCard label="Receita" value={formatCurrency(salesReport.total_revenue)} icon={TrendingUp} color="green" />
            <StatCard label="Ticket Médio" value={formatCurrency(salesReport.total_count > 0 ? salesReport.total_revenue / salesReport.total_count : 0)} icon={BarChart3} color="purple" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-sm tracking-[0.15em] uppercase font-semibold text-slate-500 mb-4">Vendas por Dia</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesReport.by_day}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Bar dataKey="total" fill="#2563EB" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-sm tracking-[0.15em] uppercase font-semibold text-slate-500 mb-4">Por Forma de Pagamento</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={salesReport.by_payment?.map(d => ({...d, name: payLabels[d.method] || d.method}))} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {salesReport.by_payment?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === 'products' && productsReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Produtos" value={productsReport.total_products} icon={Package} color="blue" />
            <StatCard label="Valor Custo" value={formatCurrency(productsReport.total_cost_value)} icon={DollarSign} color="red" />
            <StatCard label="Valor Venda" value={formatCurrency(productsReport.total_sale_value)} icon={TrendingUp} color="green" />
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm tracking-[0.15em] uppercase font-semibold text-slate-500">Produtos</h3>
              <ExportButtons title="Relatório de Produtos" columns={[{header:'Produto',accessor:'name'},{header:'SKU',accessor:'sku'},{header:'Estoque',accessor:'stock_quantity'},{header:'Custo',getValue:r=>r.cost_price},{header:'Venda',getValue:r=>r.sale_price}]} data={productsReport.products || []} filename="rel_produtos" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-3 py-2 text-left text-xs uppercase font-semibold text-slate-500">Produto</th>
                  <th className="px-3 py-2 text-right text-xs uppercase font-semibold text-slate-500">Estoque</th>
                  <th className="px-3 py-2 text-right text-xs uppercase font-semibold text-slate-500">Custo</th>
                  <th className="px-3 py-2 text-right text-xs uppercase font-semibold text-slate-500">Venda</th>
                  <th className="px-3 py-2 text-right text-xs uppercase font-semibold text-slate-500">Margem</th>
                </tr></thead>
                <tbody>
                  {(productsReport.products || []).map(p => (
                    <tr key={p._id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.stock_quantity}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(p.cost_price)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(p.sale_price)}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-600">{p.margin || 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'financial' && financialReport && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm tracking-[0.15em] uppercase font-semibold text-slate-500">Lançamentos Financeiros ({financialReport.total})</h3>
            <ExportButtons title="Relatório Financeiro" columns={[{header:'Descrição',accessor:'description'},{header:'Tipo',accessor:'type'},{header:'Valor',getValue:r=>r.amount},{header:'Status',accessor:'status'},{header:'Vencimento',accessor:'due_date'}]} data={financialReport.entries || []} filename="rel_financeiro" />
          </div>
          <div className="space-y-2">
            {(financialReport.entries || []).slice(0, 20).map(e => (
              <div key={e._id} className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <p className="text-sm font-medium">{e.description}</p>
                  <p className="text-xs text-slate-500">{e.type === 'receivable' ? 'A Receber' : 'A Pagar'} | {e.due_date?.slice(0,10)}</p>
                </div>
                <span className={`font-mono font-medium ${e.type === 'receivable' ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'clients' && clientsReport && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm tracking-[0.15em] uppercase font-semibold text-slate-500">Clientes ({clientsReport.total})</h3>
            <ExportButtons title="Relatório de Clientes" columns={[{header:'Nome',accessor:'name'},{header:'Documento',accessor:'document'},{header:'Email',accessor:'email'},{header:'Compras',getValue:r=>r.total_purchases}]} data={clientsReport.clients || []} filename="rel_clientes" />
          </div>
          <div className="space-y-2">
            {(clientsReport.clients || []).map(c => (
              <div key={c._id} className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.email} | {c.document}</p>
                </div>
                <span className="text-sm font-mono">{c.total_purchases || 0} compras</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
