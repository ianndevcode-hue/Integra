import React from 'react';
import CrudPage from '../shared/CrudPage';
import { formatCurrency } from '../../utils/helpers';

export default function SaaSServices() {
  const columns = [
    { header: 'Serviço', render: r => <span className="font-medium text-slate-900">{r.name}</span>, exportable: true, accessor: 'name' },
    { header: 'Categoria', accessor: 'category' },
    { header: 'Preço', render: r => <span className="font-mono">{formatCurrency(r.price)}</span>, align: 'right', exportValue: r => r.price },
    { header: 'Tempo', accessor: 'estimated_time' },
    { header: 'Profissional', accessor: 'professional' },
    { header: 'Comissão', render: r => <span className="font-mono">{r.commission || 0}%</span>, align: 'right' },
  ];
  return <CrudPage title="Serviços" apiPath="/api/saas/services" columns={columns} testIdPrefix="saas-services" exportable
    formFields={[
      { name: 'name', label: 'Nome do Serviço', required: true },
      { name: 'category', label: 'Categoria' },
      { name: 'price', label: 'Preço', type: 'number', step: '0.01' },
      { name: 'estimated_time', label: 'Tempo Estimado' },
      { name: 'professional', label: 'Profissional Responsável' },
      { name: 'commission', label: 'Comissão (%)', type: 'number' },
      { name: 'service_code', label: 'Código Serviço Municipal' },
      { name: 'description', label: 'Descrição', type: 'textarea', fullWidth: true },
    ]} createLabel="Novo Serviço" />;
}
