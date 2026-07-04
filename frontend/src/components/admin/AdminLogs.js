import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatDateTime } from '../../utils/helpers';
import { PageHeader, EmptyState } from '../shared/UIComponents';
import { FileText } from 'lucide-react';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get('/api/admin/logs').then(r => setLogs(r.data?.data || r.data || [])).catch(() => {}); }, []);

  return (
    <div data-testid="admin-logs-page">
      <PageHeader title="Logs de Auditoria" subtitle="Registro de ações do sistema" />
      {logs.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum log registrado" description="As ações do sistema serão registradas aqui." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {logs.map((log, i) => (
            <div key={log._id || i} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-900">{log.action}</p>
                <p className="text-xs text-slate-500">{log.user_name || 'Sistema'}</p>
              </div>
              <span className="text-xs text-slate-400">{formatDateTime(log.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
