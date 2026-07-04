import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import {
  UtensilsCrossed, Users, Plus, X, Trash2, Search, ShoppingCart, CreditCard,
  Banknote, Smartphone, ChevronRight, Clock, User, SplitSquareHorizontal
} from 'lucide-react';

const STATUS_COLORS = { free: 'border-emerald-300 bg-emerald-50', occupied: 'border-blue-300 bg-blue-50', reserved: 'border-amber-300 bg-amber-50', cleaning: 'border-slate-300 bg-slate-100' };
const STATUS_TEXT = { free: 'Livre', occupied: 'Ocupada', reserved: 'Reservada', cleaning: 'Limpeza' };
const STATUS_DOT = { free: 'bg-emerald-500', occupied: 'bg-blue-500', reserved: 'bg-amber-500', cleaning: 'bg-slate-400' };

export default function RestaurantMode() {
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [showAddItems, setShowAddItems] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [searchProd, setSearchProd] = useState('');
  const [newItems, setNewItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [peopleCount, setPeopleCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { loadTables(); loadProducts(); }, []);

  const loadTables = () => api.get('/api/pdv/tables').then(r => setTables(r.data)).catch(() => {});
  const loadProducts = () => api.get('/api/pdv/products').then(r => setProducts(r.data)).catch(() => {});

  const selectTable = async (table) => {
    setSelectedTable(table);
    if (table.status === 'occupied' && table.current_order_id) {
      try {
        const res = await api.get(`/api/pdv/table-orders?table_id=${table._id||table.id}`);
        const orders = res.data;
        const open = orders.find(o => o.status === 'open' || o.status === 'in_progress');
        setActiveOrder(open || null);
      } catch { setActiveOrder(null); }
    } else {
      setActiveOrder(null);
    }
  };

  const openTable = async () => {
    try {
      const res = await api.post('/api/pdv/table-orders', {
        table_id: selectedTable._id || selectedTable.id,
        table_name: selectedTable.name,
        customer_name: customerName,
        people_count: parseInt(peopleCount) || 1
      });
      setActiveOrder(res.data);
      setCustomerName('');
      setPeopleCount(1);
      loadTables();
    } catch {}
  };

  const addItemToNew = (prod) => {
    setNewItems(prev => {
      const existing = prev.find(i => i.product_id === (prod._id || prod.id));
      if (existing) return prev.map(i => i.product_id === (prod._id || prod.id) ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product_id: prod._id || prod.id, product_name: prod.name, quantity: 1, unit_price: prod.sale_price, notes: '' }];
    });
  };

  const sendItems = async () => {
    if (!activeOrder || newItems.length === 0) return;
    try {
      const res = await api.post(`/api/pdv/table-orders/${activeOrder._id || activeOrder.id}/items`, { items: newItems });
      setActiveOrder(res.data);
      setNewItems([]);
      setShowAddItems(false);
    } catch {}
  };

  const removeItem = async (index) => {
    if (!activeOrder) return;
    try {
      const res = await api.delete(`/api/pdv/table-orders/${activeOrder._id || activeOrder.id}/items/${index}`);
      setActiveOrder(res.data);
    } catch {}
  };

  const closeTable = async () => {
    if (!activeOrder) return;
    setProcessing(true);
    try {
      await api.patch(`/api/pdv/table-orders/${activeOrder._id || activeOrder.id}/close`, { payment_method: paymentMethod });
      setActiveOrder(null);
      setSelectedTable(null);
      setShowPayment(false);
      loadTables();
    } catch {} finally { setProcessing(false); }
  };

  const filteredProds = products.filter(p => !searchProd || p.name?.toLowerCase().includes(searchProd.toLowerCase()) || p.sku?.toLowerCase().includes(searchProd.toLowerCase()));

  const freeCount = tables.filter(t => t.status === 'free').length;
  const occupiedCount = tables.filter(t => t.status === 'occupied').length;

  return (
    <div className="h-full flex flex-col" data-testid="restaurant-mode">
      {/* Header stats */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-slate-600">{freeCount} Livres</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-xs font-medium text-slate-600">{occupiedCount} Ocupadas</span>
        </div>
        <div className="text-xs text-slate-400">|</div>
        <span className="text-xs text-slate-500">{tables.length} mesas no total</span>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Tables Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {tables.map(table => (
              <button
                key={table._id || table.id}
                data-testid={`table-${table.number}`}
                onClick={() => selectTable(table)}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${STATUS_COLORS[table.status]} ${selectedTable?._id === table._id ? 'ring-2 ring-blue-500 scale-[1.02]' : 'hover:scale-[1.01]'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-heading font-bold text-slate-900 text-lg">{table.number}</span>
                  <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[table.status]}`} />
                </div>
                <p className="text-[11px] font-medium text-slate-600">{table.name}</p>
                <p className="text-[10px] text-slate-400">{STATUS_TEXT[table.status]} | {table.seats} lug.</p>
                {table.status === 'occupied' && <p className="text-[10px] text-blue-600 mt-1 font-medium">Comanda ativa</p>}
              </button>
            ))}
          </div>
        </div>

        {/* Order Panel */}
        <div className="w-80 lg:w-96 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
          {selectedTable ? (
            <>
              {/* Table Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-slate-900">{selectedTable.name}</h3>
                    <p className="text-xs text-slate-500">{STATUS_TEXT[selectedTable.status]} | {selectedTable.area}</p>
                  </div>
                  <button onClick={() => { setSelectedTable(null); setActiveOrder(null); }} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>
              </div>

              {!activeOrder && selectedTable.status === 'free' ? (
                /* Open table form */
                <div className="p-4 space-y-3 flex-1">
                  <h4 className="text-sm font-semibold text-slate-900">Abrir Mesa</h4>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1 block">Nome do Cliente</label>
                    <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Ex: João" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1 block">Pessoas</label>
                    <select value={peopleCount} onChange={e => setPeopleCount(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => <option key={n} value={n}>{n} pessoa{n>1?'s':''}</option>)}
                    </select>
                  </div>
                  <button data-testid="open-table-button" onClick={openTable} className="w-full py-2.5 bg-brand-green hover:bg-brand-green-hover text-white font-medium rounded-lg transition-all">
                    Abrir Mesa
                  </button>
                </div>
              ) : activeOrder ? (
                <>
                  {/* Order info */}
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-mono font-medium text-blue-600">{activeOrder.order_number}</span>
                    <span className="text-slate-500">{activeOrder.customer_name || 'Cliente'} | {activeOrder.people_count || 1}p</span>
                  </div>

                  {/* Items */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
                    {(activeOrder.items || []).length === 0 ? (
                      <div className="text-center py-8">
                        <UtensilsCrossed size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">Nenhum item na comanda</p>
                      </div>
                    ) : (activeOrder.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-2 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-[13px] font-medium text-slate-900">{item.quantity}x {item.product_name}</p>
                          {item.notes && <p className="text-[10px] text-amber-600">Obs: {item.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{formatCurrency(item.quantity * item.unit_price)}</span>
                          <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-mono">{formatCurrency(activeOrder.subtotal || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Taxa de Serviço (10%)</span><span className="font-mono">{formatCurrency(activeOrder.service_fee || 0)}</span></div>
                    <div className="flex justify-between font-semibold text-sm pt-1 border-t border-slate-200"><span>Total</span><span className="font-mono text-emerald-600">{formatCurrency(activeOrder.total || 0)}</span></div>
                    {(activeOrder.people_count || 1) > 1 && (
                      <div className="flex justify-between text-slate-400"><span>Por pessoa ({activeOrder.people_count})</span><span className="font-mono">{formatCurrency((activeOrder.total || 0) / (activeOrder.people_count || 1))}</span></div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-3 border-t border-slate-200 flex gap-2">
                    <button data-testid="add-items-button" onClick={() => setShowAddItems(true)} className="flex-1 py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5">
                      <Plus size={14} /> Itens
                    </button>
                    <button data-testid="close-table-button" onClick={() => setShowPayment(true)} disabled={(activeOrder.items||[]).length === 0}
                      className="flex-1 py-2.5 bg-brand-green hover:bg-brand-green-hover text-white text-sm font-medium rounded-lg transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
                      <CreditCard size={14} /> Fechar
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center p-4">
                  <div>
                    <Clock size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Mesa ocupada sem comanda ativa</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-4">
              <div>
                <UtensilsCrossed size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-700">Modo Restaurante</p>
                <p className="text-xs text-slate-500 mt-1">Selecione uma mesa para iniciar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Items Modal */}
      {showAddItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddItems(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-heading font-bold text-slate-900">Adicionar Itens - {selectedTable?.name}</h2>
              <button onClick={() => setShowAddItems(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input autoFocus value={searchProd} onChange={e => setSearchProd(e.target.value)} placeholder="Buscar produto..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
                {filteredProds.slice(0, 30).map(p => (
                  <button key={p._id||p.id} onClick={() => addItemToNew(p)} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-left hover:bg-blue-50 hover:border-blue-300 transition-all">
                    <p className="text-[12px] font-medium text-slate-900 truncate">{p.name}</p>
                    <p className="text-sm font-heading font-bold text-emerald-600 mt-0.5">{formatCurrency(p.sale_price)}</p>
                  </button>
                ))}
              </div>
              {/* New items preview */}
              {newItems.length > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Itens para enviar ({newItems.length}):</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {newItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.quantity}x</span>
                          <span className="truncate">{item.product_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input value={item.notes || ''} onChange={e => setNewItems(prev => prev.map((x, j) => j === i ? {...x, notes: e.target.value} : x))} placeholder="Obs..." className="w-24 text-xs border border-slate-200 rounded px-2 py-1" />
                          <span className="font-mono text-xs">{formatCurrency(item.quantity * item.unit_price)}</span>
                          <button onClick={() => setNewItems(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-2">
              <button onClick={() => { setShowAddItems(false); setNewItems([]); }} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50">Cancelar</button>
              <button data-testid="send-items-button" onClick={sendItems} disabled={newItems.length === 0}
                className="flex-1 py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white font-medium rounded-lg disabled:opacity-40 flex items-center justify-center gap-1.5">
                <ShoppingCart size={14} /> Enviar para Cozinha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPayment(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-md animate-fade-in p-6">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-1">Fechar {selectedTable?.name}</h2>
            <p className="text-xs text-slate-500 mb-1">{activeOrder.order_number} | {activeOrder.customer_name || 'Cliente'}</p>
            <p className="text-2xl font-heading font-bold text-emerald-600 mb-4">{formatCurrency(activeOrder.total || 0)}</p>

            {(activeOrder.people_count || 1) > 1 && (
              <div className="bg-slate-50 rounded-lg p-3 mb-4 flex items-center gap-2">
                <SplitSquareHorizontal size={16} className="text-slate-400" />
                <span className="text-sm text-slate-600">Dividir por {activeOrder.people_count} = <strong>{formatCurrency((activeOrder.total || 0) / (activeOrder.people_count || 1))}</strong>/pessoa</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { value: 'dinheiro', icon: Banknote, label: 'Dinheiro' },
                { value: 'cartao_credito', icon: CreditCard, label: 'Crédito' },
                { value: 'cartao_debito', icon: CreditCard, label: 'Débito' },
                { value: 'pix', icon: Smartphone, label: 'PIX' },
              ].map(pm => (
                <button key={pm.value} onClick={() => setPaymentMethod(pm.value)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all ${paymentMethod === pm.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <pm.icon size={16} className={paymentMethod === pm.value ? 'text-emerald-600' : 'text-slate-400'} />
                  <span className={`text-sm font-medium ${paymentMethod === pm.value ? 'text-emerald-700' : 'text-slate-600'}`}>{pm.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPayment(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50">Voltar</button>
              <button data-testid="confirm-close-table" onClick={closeTable} disabled={processing}
                className="flex-1 py-2.5 bg-brand-green hover:bg-brand-green-hover text-white font-medium rounded-lg disabled:opacity-50">
                {processing ? 'Processando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
