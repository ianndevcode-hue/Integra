import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { PageHeader, DataTable, Badge } from '../shared/UIComponents';

export default function AdminLicenses() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/licenses').then(r => setLicenses(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const columns = [
    { header: 'Tenant', accessor: 'tenant_id', render: r => <span className="font-medium text-slate-900">{r.tenant_id?.substring(0,8)}...</span> },
    { header: 'Plano', accessor: 'plan_name' },
    { header: 'Módulos', render: r => <span className="text-xs">{(r.modules || []).length} módulos</span> },
    { header: 'Max Usuários', accessor: 'max_users', align: 'right' },
    { header: 'Status', render: r => <Badge variant={r.status === 'active' ? 'success' : 'danger'}>{r.status === 'active' ? 'Ativa' : 'Inativa'}</Badge> },
    { header: 'Expira em', render: r => formatDate(r.expires_at) },
  ];

  return (
    <div data-testid="admin-licenses-page">
      <PageHeader title="Licenças" subtitle={`${licenses.length} licenças`} />
      <DataTable columns={columns} data={licenses} />
    </div>
  );
}
