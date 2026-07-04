import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { PageHeader, DataTable, Badge, Modal } from '../shared/UIComponents';
import { Plus, Search, Package } from 'lucide-react';

export default function SaaSProducts() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', barcode: '', category: '', unit: 'UN', cost_price: 0, sale_price: 0, stock_quantity: 0, min_stock: 0, ncm: '', cfop: '5102' });

  useEffect(() => { loadProducts(); }, []);
  const loadProducts = () => api.get('/api/saas/products').then(r => setProducts(r.data?.data || r.data || [])).catch(() => {});

  const filtered = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/api/saas/products', { ...form, cost_price: parseFloat(form.cost_price), sale_price: parseFloat(form.sale_price), stock_quantity: parseFloat(form.stock_quantity), min_stock: parseFloat(form.min_stock) });
    setShowModal(false);
    setForm({ name: '', sku: '', barcode: '', category: '', unit: 'UN', cost_price: 0, sale_price: 0, stock_quantity: 0, min_stock: 0, ncm: '', cfop: '5102' });
    loadProducts();
  };

  const columns = [
    { header: 'Produto', render: r => (<div><span className="font-medium text-slate-900">{r.name}</span><br/><span className="text-xs text-slate-500">{r.sku}</span></div>) },
    { header: 'Categoria', accessor: 'category' },
    { header: 'Custo', render: r => formatCurrency(r.cost_price), align: 'right' },
    { header: 'Venda', render: r => <span className="font-medium">{formatCurrency(r.sale_price)}</span>, align: 'right' },
    { header: 'Estoque', render: r => (<span className={`font-mono ${r.stock_quantity <= r.min_stock ? 'text-red-600 font-semibold' : 'text-slate-900'}`}>{r.stock_quantity}</span>), align: 'right' },
    { header: 'Status', render: r => <Badge variant={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Ativo' : 'Inativo'}</Badge> },
  ];

  return (
    <div data-testid="saas-products-page">
      <PageHeader title="Produtos" subtitle={`${products.length} produtos`}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input data-testid="product-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-56" />
        </div>
        <button data-testid="add-product-button" onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-all">
          <Plus size={16} /> Novo Produto
        </button>
      </PageHeader>
      <DataTable columns={columns} data={filtered} />
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Produto" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Nome</label>
              <input data-testid="product-name-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" required />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">SKU</label>
              <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Código de Barras</label>
              <input value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Categoria</label>
              <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Preço de Custo</label>
              <input type="number" step="0.01" data-testid="product-cost-input" value={form.cost_price} onChange={e => setForm({...form, cost_price: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Preço de Venda</label>
              <input type="number" step="0.01" data-testid="product-price-input" value={form.sale_price} onChange={e => setForm({...form, sale_price: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Estoque</label>
              <input type="number" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Estoque Mínimo</label>
              <input type="number" value={form.min_stock} onChange={e => setForm({...form, min_stock: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">NCM</label>
              <input value={form.ncm} onChange={e => setForm({...form, ncm: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">CFOP</label>
              <input value={form.cfop} onChange={e => setForm({...form, cfop: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
          <button type="submit" data-testid="save-product-button" className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-medium py-2.5 rounded-lg transition-all">Cadastrar Produto</button>
        </form>
      </Modal>
    </div>
  );
}
