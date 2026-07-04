import React from 'react';
import CrudPage from '../shared/CrudPage';
import { Badge } from '../shared/UIComponents';
import { formatCurrency } from '../../utils/helpers';

export default function AdminResellers() {
  const columns = [
    { header: 'Revendedor', render: r => <span className="font-medium text-slate-900">{r.name}</span> },
    { header: 'Email', accessor: 'email' },
    { header: 'Telefone', accessor: 'phone' },
    { header: 'Comissão', render: r => <span className="font-mono">{r.commission_rate || 0}%</span>, align: 'right' },
    { header: 'Clientes', render: r => r.total_clients || 0, align: 'right' },
    { header: 'Total Comissões', render: r => <span className="font-mono">{formatCurrency(r.total_commission || 0)}</span>, align: 'right' },
    { header: 'Status', render: r => <Badge variant={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Ativo' : 'Inativo'}</Badge> },
  ];
  return <CrudPage title="Revendedores" apiPath="/api/admin/resellers" columns={columns} accentColor="purple" testIdPrefix="admin-resellers"
    formFields={[
      { name: 'name', label: 'Nome', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Telefone' },
      { name: 'commission_rate', label: 'Taxa de Comissão (%)', type: 'number', step: '0.1' },
      { name: 'notes', label: 'Observações', type: 'textarea', fullWidth: true },
    ]} createLabel="Novo Revendedor" />;
}
