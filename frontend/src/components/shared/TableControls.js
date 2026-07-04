import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Download, FileSpreadsheet } from 'lucide-react';
import { exportPDF, exportExcel } from '../../utils/exports';

export function Pagination({ page, pages, total, onPageChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 px-1" data-testid="pagination">
      <span className="text-xs text-slate-500">{total} registros | Página {page} de {pages}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="p-1.5 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"><ChevronLeft size={14} /></button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
          const p = page <= 3 ? i + 1 : Math.min(page - 2 + i, pages);
          return (
            <button key={p} onClick={() => onPageChange(p)} className={`w-8 h-8 rounded text-xs font-medium transition-colors ${p === page ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'border border-slate-200 hover:bg-slate-50'}`}>{p}</button>
          );
        })}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= pages} className="p-1.5 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input data-testid="search-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-56" />
    </div>
  );
}

export function FilterTabs({ options, value, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${value === v ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-100 border border-transparent'}`}>{label}</button>
      ))}
    </div>
  );
}

export function ExportButtons({ title, columns, data, filename }) {
  return (
    <div className="flex gap-1">
      <button onClick={() => exportPDF(title, columns, data, filename)} data-testid="export-pdf" className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" title="Exportar PDF">
        <Download size={13} /> PDF
      </button>
      <button onClick={() => exportExcel(title, columns, data, filename)} data-testid="export-excel" className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" title="Exportar Excel">
        <FileSpreadsheet size={13} /> Excel
      </button>
    </div>
  );
}
