import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader, StatCard, DataTable, Badge, EmptyState } from '../shared/UIComponents';
import { SearchBar, FilterTabs, ExportButtons } from '../shared/TableControls';
import { formatCurrency } from '../../utils/helpers';
import { Warehouse, AlertTriangle, PackageX, Package } from 'lucide-react';

export default function SaaSInventory() {
  const [data, setData] = useState({ data: [], summary: {} });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => { loadData(); }, [search, filter]);
  const loadData = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filter) params.set('filter_type', filter);
    api.get(`/api/saas/inventory?${params}`).then(r => setData(r.data)).catch(() => {});
  };

  const columns = [
    { header: 'Produto', render: r => (<div><span className="font-medium text-slate-900">{r.name}</span><br/><span className="text-xs text-slate-500">{r.sku}</span></div>), accessor: 'name' },
    { header: 'Categoria', accessor: 'category' },
    { header: 'Estoque', render: r => (<span className={`font-mono font-medium ${r.stock_quantity <= r.min_stock ? 'text-red-600' : r.stock_quantity <= r.min_stock * 2 ? 'text-amber-600' : 'text-slate-900'}`}>{r.stock_quantity}</span>), align: 'right' },
    { header: 'Mínimo', render: r => <span className="font-mono">{r.min_stock}</span>, align: 'right' },
    { header: 'Custo Unit.', render: r => <span className="font-mono">{formatCurrency(r.cost_price)}</span>, align: 'right' },
    { header: 'Valor Estoque', render: r => <span className="font-mono">{formatCurrency((r.stock_quantity || 0) * (r.cost_price || 0))}</span>, align: 'right' },
    { header: 'Status', render: r => r.stock_quantity <= 0 ? <Badge variant="danger">Sem Estoque</Badge> : r.stock_quantity <= r.min_stock ? <Badge variant="warning">Baixo</Badge> : <Badge variant="success">Normal</Badge> },
  ];

  const s = data.summary || {};

  return (
    <div data-testid="saas-inventory-page">
      <PageHeader title="Estoque" subtitle="Controle de estoque">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar produto..." />
        <ExportButtons title="Estoque" columns={columns.map(c => ({ header: c.header, accessor: c.accessor }))} data={data.data || []} filename="estoque" />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Itens" value={s.total_items || 0} icon={Package} color="blue" />
        <StatCard label="Valor Total" value={formatCurrency(s.total_value || 0)} icon={Warehouse} color="green" />
        <StatCard label="Estoque Baixo" value={s.low_stock || 0} icon={AlertTriangle} color="amber" />
        <StatCard label="Sem Estoque" value={s.out_of_stock || 0} icon={PackageX} color="red" />
      </div>

      <div className="mb-4">
        <FilterTabs options={[['', 'Todos'], ['low_stock', 'Estoque Baixo'], ['out_of_stock', 'Sem Estoque']]} value={filter} onChange={setFilter} />
      </div>

      <DataTable columns={columns} data={data.data || []} />
    </div>
  );
}
