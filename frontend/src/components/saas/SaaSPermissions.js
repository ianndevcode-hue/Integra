import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PageHeader, Badge } from '../shared/UIComponents';
import { Lock, Check } from 'lucide-react';

export default function SaaSPermissions() {
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    api.get('/api/saas/permissions').then(r => setPermissions(r.data)).catch(() => {});
    api.get('/api/saas/users').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const togglePermission = async (perm) => {
    if (!selectedUser) return;
    const current = selectedUser.permissions || [];
    const updated = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm];
    await api.put(`/api/saas/users/${selectedUser._id}`, { permissions: updated });
    setSelectedUser({...selectedUser, permissions: updated});
    setUsers(prev => prev.map(u => u._id === selectedUser._id ? {...u, permissions: updated} : u));
  };

  const grouped = permissions.reduce((acc, p) => {
    (acc[p.group] = acc[p.group] || []).push(p);
    return acc;
  }, {});

  return (
    <div data-testid="saas-permissions-page">
      <PageHeader title="Permissões" subtitle="Controle de acesso por usuário" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-3">Usuários</h3>
          <div className="space-y-1">
            {users.map(u => (
              <button key={u._id} onClick={() => setSelectedUser(u)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${selectedUser?._id === u._id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                <p className="font-medium">{u.name}</p>
                <p className="text-xs text-slate-500">{u.role}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-4">
          {selectedUser ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-slate-900">{selectedUser.name}</h3>
                  <p className="text-xs text-slate-500">{selectedUser.email} | {selectedUser.role}</p>
                </div>
                <Badge variant="info">{(selectedUser.permissions || []).length} permissões</Badge>
              </div>
              <div className="space-y-4">
                {Object.entries(grouped).map(([group, perms]) => (
                  <div key={group}>
                    <h4 className="text-xs tracking-[0.15em] uppercase font-semibold text-slate-500 mb-2">{group}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {perms.map(p => {
                        const active = (selectedUser.permissions || []).includes(p.id);
                        return (
                          <button key={p.id} onClick={() => togglePermission(p.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${active ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${active ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                              {active && <Check size={10} className="text-white" />}
                            </div>
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              <Lock size={20} className="mr-2" /> Selecione um usuário para gerenciar permissões
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
