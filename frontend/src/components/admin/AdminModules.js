import React from 'react';
import CrudPage from '../shared/CrudPage';
import { Badge } from '../shared/UIComponents';
import { formatCurrency } from '../../utils/helpers';

export default function AdminModules() {
  const columns = [
    { header: 'ID', accessor: 'id', render: r => <span className="font-mono text-xs text-slate-500">{r.id}</span> },
    { header: 'Módulo', render: r => <span className="font-medium text-slate-900">{r.name}</span> },
    { header: 'Descrição', accessor: 'description' },
    { header: 'Status', render: r => <Badge variant={r.is_active !== false ? 'success' : 'danger'}>{r.is_active !== false ? 'Ativo' : 'Inativo'}</Badge> },
  ];
  return <CrudPage title="Módulos" apiPath="/api/admin/modules" columns={columns} accentColor="purple" testIdPrefix="admin-modules" paginated={false}
    formFields={[
      { name: 'name', label: 'Nome', required: true },
      { name: 'description', label: 'Descrição' },
      { name: 'id', label: 'Identificador (slug)', required: true },
    ]} createLabel="Novo Módulo" />;
}
