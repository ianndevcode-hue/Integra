import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { PageHeader, DataTable, Modal, EmptyState } from '../shared/UIComponents';
import { Pagination, SearchBar, FilterTabs, ExportButtons } from '../shared/TableControls';
import { Plus } from 'lucide-react';

export default function CrudPage({
  title, subtitle, apiPath, columns, formFields, accentColor = 'blue',
  searchable = true, filterable = false, filterOptions = [], exportable = false,
  exportTitle, testIdPrefix = 'crud', icon, paginated = true, createLabel = 'Novo',
  onDataLoaded, extraActions, hideCreate = false
}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});

  const colorMap = {
    blue: { btn: 'bg-brand-blue hover:bg-brand-blue-hover', ring: 'focus:ring-blue-300' },
    purple: { btn: 'bg-brand-purple hover:bg-brand-purple-hover', ring: 'focus:ring-purple-300' },
    green: { btn: 'bg-brand-green hover:bg-brand-green-hover', ring: 'focus:ring-emerald-300' },
  };
  const colors = colorMap[accentColor] || colorMap.blue;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (paginated) params.set('page', page);
      if (search) params.set('search', search);
      if (filter) params.set('status', filter);
      const res = await api.get(`${apiPath}?${params}`);
      const data = res.data;
      if (data.data) {
        setItems(data.data);
        setTotal(data.total || data.data.length);
        setPages(data.pages || 1);
      } else if (Array.isArray(data)) {
        setItems(data);
        setTotal(data.length);
      }
      onDataLoaded?.(data);
    } catch {} finally { setLoading(false); }
  }, [apiPath, page, search, filter, paginated, onDataLoaded]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => {
    const defaults = {};
    formFields?.forEach(f => { defaults[f.name] = f.default || ''; });
    setForm(defaults);
    setEditItem(null);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setForm({ ...item });
    setEditItem(item);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await api.put(`${apiPath}/${editItem._id || editItem.id}`, form);
      } else {
        await api.post(apiPath, form);
      }
      setShowModal(false);
      loadData();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir?')) return;
    try {
      await api.delete(`${apiPath}/${id}`);
      loadData();
    } catch {}
  };

  const exportCols = columns.filter(c => c.exportable !== false).map(c => ({
    header: c.header,
    accessor: c.accessor,
    getValue: c.exportValue
  }));

  return (
    <div data-testid={`${testIdPrefix}-page`}>
      <PageHeader title={title} subtitle={subtitle || `${total} registros`}>
        <div className="flex items-center gap-2 flex-wrap">
          {searchable && <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} />}
          {exportable && items.length > 0 && <ExportButtons title={exportTitle || title} columns={exportCols} data={items} filename={testIdPrefix} />}
          {!hideCreate && formFields && (
            <button data-testid={`${testIdPrefix}-add-button`} onClick={openCreate} className={`flex items-center gap-2 px-4 py-2 ${colors.btn} text-white text-sm font-medium rounded-lg transition-all`}>
              <Plus size={16} /> {createLabel}
            </button>
          )}
          {extraActions}
        </div>
      </PageHeader>

      {filterable && filterOptions.length > 0 && (
        <div className="mb-4">
          <FilterTabs options={[['', 'Todos'], ...filterOptions]} value={filter} onChange={v => { setFilter(v); setPage(1); }} />
        </div>
      )}

      <DataTable columns={[...columns, ...(formFields ? [{
        header: 'Ações',
        render: r => (
          <div className="flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">Editar</button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(r._id || r.id); }} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors">Excluir</button>
          </div>
        )
      }] : [])]} data={items} onRowClick={formFields ? openEdit : undefined} />

      {paginated && <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />}

      {formFields && (
        <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Editar' : createLabel} size="lg">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formFields.map(field => (
                <div key={field.name} className={field.fullWidth ? 'md:col-span-2' : ''}>
                  <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">{field.label}</label>
                  {field.type === 'select' ? (
                    <select value={form[field.name] || ''} onChange={e => setForm({...form, [field.name]: e.target.value})} className={`w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`}>
                      {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea value={form[field.name] || ''} onChange={e => setForm({...form, [field.name]: e.target.value})} className={`w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2 resize-none`} rows={3} />
                  ) : (
                    <input type={field.type || 'text'} step={field.step} value={form[field.name] || ''} onChange={e => setForm({...form, [field.name]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value})}
                      className={`w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm ${colors.ring} focus:outline-none focus:ring-2`} required={field.required} />
                  )}
                </div>
              ))}
            </div>
            <button type="submit" data-testid={`${testIdPrefix}-save-button`} className={`w-full ${colors.btn} text-white font-medium py-2.5 rounded-lg transition-all`}>
              {editItem ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
