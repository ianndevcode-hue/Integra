import React from 'react';
import CrudPage from '../shared/CrudPage';
import { Badge } from '../shared/UIComponents';

export default function AdminWebhooks() {
  const columns = [
    { header: 'URL', render: r => <span className="font-mono text-xs text-slate-700 truncate max-w-xs inline-block">{r.url}</span> },
    { header: 'Eventos', render: r => <span className="text-xs">{r.events?.join(', ') || '-'}</span> },
    { header: 'Status', render: r => <Badge variant={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Ativo' : 'Inativo'}</Badge> },
  ];
  return <CrudPage title="Webhooks" apiPath="/api/admin/webhooks" columns={columns} accentColor="purple" testIdPrefix="admin-webhooks" paginated={false}
    formFields={[
      { name: 'url', label: 'URL do Webhook', required: true, fullWidth: true },
      { name: 'events', label: 'Eventos (separados por vírgula)' },
      { name: 'description', label: 'Descrição' },
    ]} createLabel="Novo Webhook" />;
}
