import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { PageHeader, DataTable, Badge, Modal } from '../shared/UIComponents';
import { SearchBar, ExportButtons } from '../shared/TableControls';
import { Plus, Package } from 'lucide-react';
import { UNITS, ORIGINS, CST_ICMS, CSOSN, CST_PIS, CST_COFINS, CFOP_VENDA, ICMS_ALIQUOTAS, PIS_ALIQUOTAS, COFINS_ALIQUOTAS, CATEGORIES } from '../../utils/fiscalData';

const defaultForm = {
  name: '', sku: '', barcode: '', description: '', category: '', group: '', brand: '', unit: 'UN',
  cost_price: 0, sale_price: 0, stock_quantity: 0, min_stock: 0, pdv_enabled: true,
  ncm: '', cest: '', cfop: '5102', origin: '0', cst: '00', csosn: '102',
  icms_aliquota: '18', pis_cst: '01', pis_aliquota: '1.65', cofins_cst: '01', cofins_aliquota: '7.6',
};

export default function SaaSProducts() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({...defaultForm});
  const [tab, setTab] = useState('geral');

  useEffect(() => { loadProducts(); }, []);
  const loadProducts = () => api.get('/api/saas/products').then(r => setProducts(r.data?.data || r.data || [])).catch(() => {});

  const filtered = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search));

  const openCreate = () => { setForm({...defaultForm}); setEditItem(null); setTab('geral'); setShowModal(true); };
  const openEdit = (item) => { setForm({...defaultForm, ...item}); setEditItem(item); setTab('geral'); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {...form, cost_price: parseFloat(form.cost_price)||0, sale_price: parseFloat(form.sale_price)||0, stock_quantity: parseFloat(form.stock_quantity)||0, min_stock: parseFloat(form.min_stock)||0 };
    if (editItem) {
      await api.put(`/api/saas/products/${editItem._id || editItem.id}`, payload);
    } else {
      await api.post('/api/saas/products', payload);
    }
    setShowModal(false);
    loadProducts();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este produto?')) return;
    await api.delete(`/api/saas/products/${id}`);
    loadProducts();
  };

  const margin = (form.cost_price > 0) ? (((form.sale_price - form.cost_price) / form.cost_price) * 100).toFixed(1) : '0.0';

  const F = ({ label, children, span2 }) => (
    <div className={span2 ? 'md:col-span-2' : ''}>
      <label className="text-[10px] tracking-[0.15em] uppercase font-semibold text-slate-500 mb-1 block">{label}</label>
      {children}
    </div>
  );
  const I = ({ name, type = 'text', step, required, placeholder }) => (
    <input type={type} step={step} value={form[name]||''} onChange={e => setForm({...form, [name]: type==='number' ? parseFloat(e.target.value)||0 : e.target.value})}
      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" required={required} placeholder={placeholder} />
  );
  const S = ({ name, options }) => (
    <select value={form[name]||''} onChange={e => setForm({...form, [name]: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
      {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const columns = [
    { header: 'Produto', render: r => (<div><span className="font-medium text-slate-900">{r.name}</span><br/><span className="text-xs text-slate-500">{r.sku} {r.barcode ? `| ${r.barcode}` : ''}</span></div>) },
    { header: 'Categoria', accessor: 'category' },
    { header: 'Custo', render: r => <span className="font-mono text-xs">{formatCurrency(r.cost_price)}</span>, align: 'right' },
    { header: 'Venda', render: r => <span className="font-mono font-medium">{formatCurrency(r.sale_price)}</span>, align: 'right' },
    { header: 'Margem', render: r => <span className="font-mono text-xs text-emerald-600">{r.margin||0}%</span>, align: 'right' },
    { header: 'Estoque', render: r => (<span className={`font-mono ${r.stock_quantity <= r.min_stock ? 'text-red-600 font-semibold' : ''}`}>{r.stock_quantity}</span>), align: 'right' },
    { header: 'NCM', render: r => <span className="font-mono text-xs">{r.ncm || '-'}</span> },
    { header: '', render: r => (
      <div className="flex gap-1">
        <button onClick={(e) => {e.stopPropagation(); openEdit(r);}} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">Editar</button>
        <button onClick={(e) => {e.stopPropagation(); handleDelete(r._id||r.id);}} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors">Excluir</button>
      </div>
    )},
  ];

  const tabs = [
    { id: 'geral', label: 'Dados Gerais' },
    { id: 'precos', label: 'Preços e Estoque' },
    { id: 'fiscal', label: 'Dados Fiscais' },
    { id: 'icms', label: 'ICMS' },
    { id: 'piscofins', label: 'PIS/COFINS' },
  ];

  return (
    <div data-testid="saas-products-page">
      <PageHeader title="Produtos" subtitle={`${products.length} produtos cadastrados`}>
        <SearchBar value={search} onChange={setSearch} placeholder="Nome, SKU ou código de barras..." />
        <ExportButtons title="Produtos" columns={[{header:'Nome',accessor:'name'},{header:'SKU',accessor:'sku'},{header:'Categoria',accessor:'category'},{header:'Custo',getValue:r=>r.cost_price},{header:'Venda',getValue:r=>r.sale_price},{header:'Estoque',accessor:'stock_quantity'},{header:'NCM',accessor:'ncm'}]} data={filtered} filename="produtos" />
        <button data-testid="add-product-button" onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-all">
          <Plus size={16} /> Novo Produto
        </button>
      </PageHeader>
      <DataTable columns={columns} data={filtered} onRowClick={openEdit} />

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Editar Produto' : 'Novo Produto'} size="xl">
        <form onSubmit={handleSave}>
          {/* Tabs */}
          <div className="flex gap-1 mb-5 border-b border-slate-200 pb-0 -mt-2">
            {tabs.map(t => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-all ${tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'geral' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <F label="Nome do Produto" span2><I name="name" required placeholder="Ex: Notebook Dell Inspiron" /></F>
              <F label="SKU"><I name="sku" placeholder="Ex: NB-DELL-001" /></F>
              <F label="Código de Barras / EAN"><I name="barcode" placeholder="7891234567890" /></F>
              <F label="Categoria"><S name="category" options={['', ...CATEGORIES]} /></F>
              <F label="Grupo / Subgrupo"><I name="group" placeholder="Ex: Notebooks" /></F>
              <F label="Marca"><I name="brand" placeholder="Ex: Dell" /></F>
              <F label="Unidade de Medida"><S name="unit" options={UNITS} /></F>
              <F label="Descrição" span2><textarea value={form.description||''} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" rows={2} /></F>
              <F label="Opções">
                <div className="space-y-2 mt-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.pdv_enabled||false} onChange={e => setForm({...form, pdv_enabled: e.target.checked})} className="rounded border-slate-300 text-blue-600" />
                    Disponível no PDV
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.is_active!==false} onChange={e => setForm({...form, is_active: e.target.checked})} className="rounded border-slate-300 text-blue-600" />
                    Produto ativo
                  </label>
                </div>
              </F>
            </div>
          )}

          {tab === 'precos' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <F label="Preço de Custo (R$)"><I name="cost_price" type="number" step="0.01" /></F>
              <F label="Preço de Venda (R$)"><I name="sale_price" type="number" step="0.01" /></F>
              <F label="Margem de Lucro">
                <div className={`px-3 py-2 border rounded-lg text-sm font-mono font-medium ${parseFloat(margin)>0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {margin}%
                </div>
              </F>
              <F label="Estoque Atual"><I name="stock_quantity" type="number" /></F>
              <F label="Estoque Mínimo"><I name="min_stock" type="number" /></F>
            </div>
          )}

          {tab === 'fiscal' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <F label="NCM"><I name="ncm" placeholder="0000.00.00" /></F>
              <F label="CEST"><I name="cest" placeholder="00.000.00 (se aplicável)" /></F>
              <F label="CFOP de Venda"><S name="cfop" options={CFOP_VENDA} /></F>
              <F label="Origem da Mercadoria"><S name="origin" options={ORIGINS} /></F>
            </div>
          )}

          {tab === 'icms' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <F label="CST ICMS (Regime Normal)"><S name="cst" options={CST_ICMS} /></F>
              <F label="CSOSN (Simples Nacional)"><S name="csosn" options={CSOSN} /></F>
              <F label="Alíquota ICMS"><S name="icms_aliquota" options={ICMS_ALIQUOTAS} /></F>
              <F label="Base de Cálculo ICMS" span2>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
                  A base de cálculo será calculada automaticamente na emissão da NF-e/NFC-e com base no valor do produto, CST/CSOSN e alíquota selecionada.
                </div>
              </F>
            </div>
          )}

          {tab === 'piscofins' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <F label="CST PIS"><S name="pis_cst" options={CST_PIS} /></F>
              <F label="Alíquota PIS"><S name="pis_aliquota" options={PIS_ALIQUOTAS} /></F>
              <F label="CST COFINS"><S name="cofins_cst" options={CST_COFINS} /></F>
              <F label="Alíquota COFINS"><S name="cofins_aliquota" options={COFINS_ALIQUOTAS} /></F>
              <F label="Cálculo Automático" span2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                  PIS: {form.pis_aliquota}% sobre o valor | COFINS: {form.cofins_aliquota}% sobre o valor.
                  Para um produto de {formatCurrency(form.sale_price||0)}: PIS = {formatCurrency((form.sale_price||0) * (form.pis_aliquota||0) / 100)}, COFINS = {formatCurrency((form.sale_price||0) * (form.cofins_aliquota||0) / 100)}
                </div>
              </F>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-all">Cancelar</button>
            <button type="submit" data-testid="save-product-button" className="flex-1 bg-brand-blue hover:bg-brand-blue-hover text-white font-medium py-2.5 rounded-lg transition-all">
              {editItem ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
