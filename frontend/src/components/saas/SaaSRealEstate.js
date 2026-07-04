import React from 'react';
import CrudPage from '../shared/CrudPage';
import { formatCurrency } from '../../utils/helpers';
import { Badge } from '../shared/UIComponents';

export default function SaaSRealEstate() {
  const columns = [
    { header: 'Imóvel', render: r => <span className="font-medium text-slate-900">{r.title || r.type}</span> },
    { header: 'Tipo', accessor: 'type' },
    { header: 'Finalidade', render: r => <Badge variant={r.purpose === 'venda' ? 'info' : r.purpose === 'aluguel' ? 'success' : 'purple'}>{r.purpose || '-'}</Badge> },
    { header: 'Valor', render: r => <span className="font-mono">{formatCurrency(r.value)}</span>, align: 'right' },
    { header: 'Proprietário', accessor: 'owner' },
    { header: 'Status', render: r => <Badge variant={r.status === 'disponivel' ? 'success' : r.status === 'vendido' ? 'info' : 'warning'}>{r.status || 'Disponível'}</Badge> },
    { header: 'Cidade', render: r => r.city || r.address?.city || '-' },
  ];
  return <CrudPage title="Imóveis" apiPath="/api/saas/real-estate" columns={columns} testIdPrefix="saas-real-estate" exportable
    formFields={[
      { name: 'title', label: 'Título', required: true },
      { name: 'type', label: 'Tipo', type: 'select', options: [{ value: '', label: 'Selecione' }, { value: 'casa', label: 'Casa' }, { value: 'apartamento', label: 'Apartamento' }, { value: 'terreno', label: 'Terreno' }, { value: 'comercial', label: 'Comercial' }, { value: 'rural', label: 'Rural' }] },
      { name: 'purpose', label: 'Finalidade', type: 'select', options: [{ value: 'venda', label: 'Venda' }, { value: 'aluguel', label: 'Aluguel' }, { value: 'administracao', label: 'Administração' }] },
      { name: 'value', label: 'Valor', type: 'number', step: '0.01' },
      { name: 'owner', label: 'Proprietário' },
      { name: 'commission', label: 'Comissão (%)', type: 'number' },
      { name: 'area', label: 'Área (m²)', type: 'number' },
      { name: 'bedrooms', label: 'Quartos', type: 'number' },
      { name: 'street', label: 'Endereço' },
      { name: 'city', label: 'Cidade' },
      { name: 'state', label: 'Estado' },
      { name: 'zip', label: 'CEP' },
      { name: 'status', label: 'Status', type: 'select', options: [{ value: 'disponivel', label: 'Disponível' }, { value: 'reservado', label: 'Reservado' }, { value: 'vendido', label: 'Vendido' }, { value: 'alugado', label: 'Alugado' }] },
      { name: 'description', label: 'Descrição', type: 'textarea', fullWidth: true },
    ]} createLabel="Novo Imóvel" />;
}
