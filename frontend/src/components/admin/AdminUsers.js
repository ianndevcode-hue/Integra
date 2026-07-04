import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader, DataTable, Badge } from '../shared/UIComponents';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api.get('/api/admin/users').then(r => setUsers(r.data?.data || r.data || [])).catch(() => {}); }, []);

  const roleLabels = { super_admin: 'Super Admin', admin: 'Admin', manager: 'Gerente', seller: 'Vendedor', cashier: 'Caixa', user: 'Usuário' };
  const roleColors = { super_admin: 'purple', admin: 'info', manager: 'warning', seller: 'default', cashier: 'success', user: 'default' };

  const columns = [
    { header: 'Nome', render: r => <span className="font-medium text-slate-900">{r.name}</span> },
    { header: 'Email', accessor: 'email' },
    { header: 'Perfil', render: r => <Badge variant={roleColors[r.role]}>{roleLabels[r.role] || r.role}</Badge> },
    { header: 'Tenant', render: r => r.tenant_id ? <span className="text-xs font-mono">{r.tenant_id.substring(0,8)}...</span> : <span className="text-slate-400">-</span> },
    { header: 'Status', render: r => <Badge variant={r.is_active !== false ? 'success' : 'danger'}>{r.is_active !== false ? 'Ativo' : 'Inativo'}</Badge> },
  ];

  return (
    <div data-testid="admin-users-page">
      <PageHeader title="Usuários" subtitle={`${users.length} usuários no sistema`} />
      <DataTable columns={columns} data={users} />
    </div>
  );
}
