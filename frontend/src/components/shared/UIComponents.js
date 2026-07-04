import React from 'react';
import { Package } from 'lucide-react';

export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function StatCard({ label, value, icon: Icon, color = 'blue', delay = 0 }) {
  const colorMap = {
    blue: 'text-brand-blue bg-blue-50',
    green: 'text-brand-green bg-emerald-50',
    purple: 'text-brand-purple bg-purple-50',
    red: 'text-red-600 bg-red-50',
    amber: 'text-amber-600 bg-amber-50',
  };
  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-5 h-full animate-fade-in-delay-${delay}`} data-testid={`stat-card-${label?.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500">{label}</p>
          <p className="text-2xl font-heading font-bold text-slate-900 mt-1">{value}</p>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${colorMap[color] || colorMap.blue}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Package, title = 'Nenhum registro encontrado', description = 'Comece adicionando um novo item.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-state">
      <div className="p-4 bg-slate-100 rounded-full mb-4">
        <Icon size={32} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-700">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}

export function DataTable({ columns, data, onRowClick }) {
  if (!data || data.length === 0) return <EmptyState />;
  return (
    <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
      <table className="w-full text-sm" data-testid="data-table">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/50">
            {columns.map((col, i) => (
              <th key={i} className={`px-4 py-3 text-left text-xs tracking-[0.15em] uppercase font-semibold text-slate-500 ${col.align === 'right' ? 'text-right' : ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr
              key={row.id || row._id || ri}
              className={`border-b border-slate-100 last:border-0 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col, ci) => (
                <td key={ci} className={`px-4 py-3 ${col.align === 'right' ? 'text-right font-mono' : ''}`}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Badge({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default}`}>
      {children}
    </span>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="modal-overlay">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-lg border border-slate-200 w-full ${sizes[size]} max-h-[90vh] overflow-y-auto animate-fade-in`}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-lg font-heading font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors" data-testid="modal-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
