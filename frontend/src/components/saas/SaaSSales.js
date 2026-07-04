import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatCurrency, formatDateTime, paymentMethodLabels } from '../../utils/helpers';
import { PageHeader, DataTable, Badge } from '../shared/UIComponents';

export default function SaaSSales() {
  const [sales, setSales] = useState([]);
  useEffect(() => { api.get('/api/saas/sales').then(r => setSales(r.data?.data || r.data || [])).catch(() => {}); }, []);

  const columns = [
    { header: 'Venda', render: r => <span className="font-medium text-slate-900">{r.sale_number}</span> },
    { header: 'Cliente', accessor: 'client_name' },
    { header: 'Itens', render: r => <span>{r.items?.length || 0}</span> },
    { header: 'Pagamento', render: r => paymentMethodLabels[r.payment_method] || r.payment_method },
    { header: 'Total', render: r => <span className="font-mono font-medium">{formatCurrency(r.total)}</span>, align: 'right' },
    { header: 'Fiscal', render: r => <Badge variant={r.fiscal_status === 'emitida' ? 'success' : 'warning'}>{r.fiscal_status === 'emitida' ? 'Emitida' : 'Pendente'}</Badge> },
    { header: 'Data', render: r => formatDateTime(r.created_at) },
  ];

  return (
    <div data-testid="saas-sales-page">
      <PageHeader title="Vendas" subtitle={`${sales.length} vendas registradas`} />
      <DataTable columns={columns} data={sales} />
    </div>
  );
}
