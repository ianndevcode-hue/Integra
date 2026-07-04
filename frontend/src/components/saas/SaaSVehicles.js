import React from 'react';
import CrudPage from '../shared/CrudPage';
import { formatCurrency } from '../../utils/helpers';
import { Badge } from '../shared/UIComponents';

export default function SaaSVehicles() {
  const columns = [
    { header: 'Veículo', render: r => <span className="font-medium text-slate-900">{r.brand} {r.model}</span> },
    { header: 'Ano', accessor: 'year' },
    { header: 'Placa', accessor: 'plate' },
    { header: 'Cor', accessor: 'color' },
    { header: 'KM', render: r => <span className="font-mono">{r.mileage?.toLocaleString('pt-BR') || '-'}</span>, align: 'right' },
    { header: 'Valor Venda', render: r => <span className="font-mono">{formatCurrency(r.sale_price)}</span>, align: 'right' },
    { header: 'Status', render: r => <Badge variant={r.status === 'disponivel' ? 'success' : r.status === 'vendido' ? 'info' : 'warning'}>{r.status || 'Disponível'}</Badge> },
  ];
  return <CrudPage title="Veículos" apiPath="/api/saas/vehicles" columns={columns} testIdPrefix="saas-vehicles" exportable
    formFields={[
      { name: 'brand', label: 'Marca', required: true },
      { name: 'model', label: 'Modelo', required: true },
      { name: 'year', label: 'Ano' },
      { name: 'plate', label: 'Placa' },
      { name: 'chassis', label: 'Chassi' },
      { name: 'renavam', label: 'Renavam' },
      { name: 'color', label: 'Cor' },
      { name: 'mileage', label: 'Quilometragem', type: 'number' },
      { name: 'purchase_price', label: 'Valor Compra', type: 'number', step: '0.01' },
      { name: 'sale_price', label: 'Valor Venda', type: 'number', step: '0.01' },
      { name: 'owner', label: 'Proprietário' },
      { name: 'status', label: 'Status', type: 'select', options: [{ value: 'disponivel', label: 'Disponível' }, { value: 'reservado', label: 'Reservado' }, { value: 'vendido', label: 'Vendido' }] },
      { name: 'description', label: 'Descrição/Histórico', type: 'textarea', fullWidth: true },
    ]} createLabel="Novo Veículo" />;
}
