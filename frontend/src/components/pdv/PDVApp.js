import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import {
  ShoppingCart, Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone,
  LogOut, DoorOpen, DoorClosed, ArrowDownCircle, ArrowUpCircle, History, X, Wifi, WifiOff
} from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_4e2cd625-ade9-4dd7-89bf-7caab1ef00f2/artifacts/tbyxp0yk_image.png';

export default function PDVApp() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [cashRegister, setCashRegister] = useState(null);
  const [showCashModal, setShowCashModal] = useState(null); // 'open', 'close', 'sangria', 'suprimento'
  const [cashAmount, setCashAmount] = useState('');
  const [cashReason, setCashReason] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [showHistory, setShowHistory] = useState(false);
  const [salesHistory, setSalesHistory] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCashRegister();
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  const loadProducts = () => api.get('/api/pdv/products').then(r => setProducts(r.data)).catch(() => {});
  const loadCashRegister = () => api.get('/api/pdv/cash-register').then(r => setCashRegister(r.data)).catch(() => {});
  const loadHistory = () => api.get('/api/pdv/sales').then(r => { setSalesHistory(r.data); setShowHistory(true); }).catch(() => {});

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search) || p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === (product._id || product.id));
      if (existing) return prev.map(i => i.product_id === (product._id || product.id) ? {...i, quantity: i.quantity + 1} : i);
      return [...prev, { product_id: product._id || product.id, product_name: product.name, quantity: 1, unit_price: product.sale_price, discount: 0 }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.product_id === productId) {
        const newQty = i.quantity + delta;
        return newQty > 0 ? {...i, quantity: newQty} : i;
      }
      return i;
    }));
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(i => i.product_id !== productId));

  const cartTotal = cart.reduce((sum, i) => sum + (i.quantity * i.unit_price - i.discount), 0);

  const handleOpenCash = async () => {
    try {
      const res = await api.post('/api/pdv/cash-register/open', { initial_amount: parseFloat(cashAmount || 0) });
      setCashRegister(res.data);
      setShowCashModal(null);
      setCashAmount('');
    } catch {}
  };

  const handleCloseCash = async () => {
    try {
      await api.post('/api/pdv/cash-register/close', { notes: cashReason });
      setCashRegister(null);
      setShowCashModal(null);
      setCashReason('');
    } catch {}
  };

  const handleMovement = async (type) => {
    try {
      await api.post('/api/pdv/cash-register/movement', { type, amount: parseFloat(cashAmount), reason: cashReason });
      loadCashRegister();
      setShowCashModal(null);
      setCashAmount('');
      setCashReason('');
    } catch {}
  };

  const handleFinalizeSale = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      if (isOnline) {
        await api.post('/api/pdv/sales', { items: cart, payment_method: paymentMethod, client_name: 'Consumidor Final', discount: 0 });
      } else {
        // Save locally for offline sync
        const offlineSales = JSON.parse(localStorage.getItem('pdv_offline_sales') || '[]');
        offlineSales.push({
          items: cart, payment_method: paymentMethod, client_name: 'Consumidor Final',
          total: cartTotal, created_at: new Date().toISOString(), sync_status: 'pending'
        });
        localStorage.setItem('pdv_offline_sales', JSON.stringify(offlineSales));
      }
      setCart([]);
      setShowPayment(false);
      loadCashRegister();
    } catch {} finally { setProcessing(false); }
  };

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC]" data-testid="pdv-app">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="IC" className="h-8 w-8 rounded-lg" />
          <div>
            <span className="font-heading font-bold text-slate-900 text-sm">Integra PDV</span>
            <span className="block text-[10px] tracking-[0.15em] uppercase font-semibold text-emerald-600">
              {cashRegister ? 'Caixa Aberto' : 'Caixa Fechado'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`} data-testid="pdv-online-status">
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <button onClick={loadHistory} data-testid="pdv-history-button" className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"><History size={18} /></button>
          {!cashRegister ? (
            <button onClick={() => setShowCashModal('open')} data-testid="pdv-open-cash-button" className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-green text-white text-xs font-medium rounded-lg hover:bg-brand-green-hover transition-all">
              <DoorOpen size={14} /> Abrir Caixa
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={() => setShowCashModal('sangria')} data-testid="pdv-sangria-button" className="flex items-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-all">
                <ArrowDownCircle size={12} /> Sangria
              </button>
              <button onClick={() => setShowCashModal('suprimento')} data-testid="pdv-suprimento-button" className="flex items-center gap-1 px-2 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-all">
                <ArrowUpCircle size={12} /> Suprimento
              </button>
              <button onClick={() => setShowCashModal('close')} data-testid="pdv-close-cash-button" className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-all">
                <DoorClosed size={12} /> Fechar
              </button>
            </div>
          )}
          <button onClick={logout} data-testid="pdv-logout-button" className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-all"><LogOut size={18} /></button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Products grid */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="pdv-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produto, código de barras ou SKU..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {filteredProducts.map(p => (
                <button
                  key={p._id || p.id}
                  data-testid={`pdv-product-${p.sku}`}
                  onClick={() => cashRegister && addToCart(p)}
                  disabled={!cashRegister}
                  className={`bg-white border border-slate-200 rounded-lg p-3 text-left hover:border-emerald-300 hover:bg-emerald-50/50 transition-all ${!cashRegister ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.sku}</p>
                  <p className="text-base font-heading font-bold text-emerald-600 mt-1">{formatCurrency(p.sale_price)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Estoque: {p.stock_quantity}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart sidebar */}
        <div className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-emerald-600" />
              <span className="font-heading font-semibold text-slate-900 text-sm">Carrinho</span>
            </div>
            <span className="text-xs text-slate-500">{cart.length} itens</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <ShoppingCart size={32} className="text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Carrinho vazio</p>
                <p className="text-xs text-slate-400">Adicione produtos para iniciar</p>
              </div>
            ) : cart.map(item => (
              <div key={item.product_id} className="bg-slate-50 rounded-lg p-3 animate-fade-in">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-slate-900 flex-1 pr-2">{item.product_name}</p>
                  <button onClick={() => removeFromCart(item.product_id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.product_id, -1)} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100"><Minus size={12} /></button>
                    <span className="w-8 text-center text-sm font-mono font-medium">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product_id, 1)} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100"><Plus size={12} /></button>
                  </div>
                  <span className="font-mono font-medium text-sm text-slate-900">{formatCurrency(item.quantity * item.unit_price)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Cash register info */}
          {cashRegister && (
            <div className="px-3 py-2 border-t border-slate-100 bg-emerald-50/50">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Saldo do caixa:</span>
                <span className="font-mono font-medium text-emerald-700">{formatCurrency(cashRegister.current_amount)}</span>
              </div>
              <div className="flex justify-between text-xs mt-0.5">
                <span className="text-slate-500">Vendas: {cashRegister.total_sales_count || 0}</span>
                <span className="font-mono text-slate-600">{formatCurrency(cashRegister.total_sales)}</span>
              </div>
            </div>
          )}

          {/* Total + Pay */}
          <div className="p-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-600">Total</span>
              <span className="text-2xl font-heading font-bold text-slate-900">{formatCurrency(cartTotal)}</span>
            </div>
            <button
              data-testid="pdv-pay-button"
              onClick={() => cart.length > 0 && setShowPayment(true)}
              disabled={cart.length === 0 || !cashRegister}
              className="w-full py-3 bg-brand-green hover:bg-brand-green-hover text-white font-heading font-bold text-lg rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Pagar
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPayment(false)} />
          <div className="relative bg-white rounded-lg w-full max-w-md animate-fade-in p-6" data-testid="pdv-payment-modal">
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-1">Finalizar Venda</h2>
            <p className="text-3xl font-heading font-bold text-emerald-600 mb-6">{formatCurrency(cartTotal)}</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { value: 'dinheiro', icon: Banknote, label: 'Dinheiro' },
                { value: 'cartao_credito', icon: CreditCard, label: 'Crédito' },
                { value: 'cartao_debito', icon: CreditCard, label: 'Débito' },
                { value: 'pix', icon: Smartphone, label: 'PIX' },
              ].map(pm => (
                <button
                  key={pm.value}
                  data-testid={`pdv-payment-${pm.value}`}
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${paymentMethod === pm.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <pm.icon size={20} className={paymentMethod === pm.value ? 'text-emerald-600' : 'text-slate-400'} />
                  <span className={`text-sm font-medium ${paymentMethod === pm.value ? 'text-emerald-700' : 'text-slate-600'}`}>{pm.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPayment(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-all">Cancelar</button>
              <button
                data-testid="pdv-confirm-sale-button"
                onClick={handleFinalizeSale}
                disabled={processing}
                className="flex-1 py-2.5 bg-brand-green hover:bg-brand-green-hover text-white font-medium rounded-lg transition-all disabled:opacity-50"
              >
                {processing ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Modal */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCashModal(null)} />
          <div className="relative bg-white rounded-lg w-full max-w-sm animate-fade-in p-6" data-testid="pdv-cash-modal">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">
              {showCashModal === 'open' && 'Abrir Caixa'}
              {showCashModal === 'close' && 'Fechar Caixa'}
              {showCashModal === 'sangria' && 'Sangria'}
              {showCashModal === 'suprimento' && 'Suprimento'}
            </h2>
            {showCashModal === 'close' ? (
              <div className="space-y-3">
                {cashRegister && (
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Abertura:</span><span className="font-mono">{formatCurrency(cashRegister.initial_amount)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Vendas:</span><span className="font-mono text-emerald-600">{formatCurrency(cashRegister.total_sales)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Sangrias:</span><span className="font-mono text-red-600">-{formatCurrency(cashRegister.total_sangria)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Suprimentos:</span><span className="font-mono text-blue-600">+{formatCurrency(cashRegister.total_suprimento)}</span></div>
                    <div className="flex justify-between border-t pt-2 font-semibold"><span>Saldo Final:</span><span className="font-mono">{formatCurrency(cashRegister.current_amount)}</span></div>
                  </div>
                )}
                <textarea value={cashReason} onChange={e => setCashReason(e.target.value)} placeholder="Observações (opcional)" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} />
                <button onClick={handleCloseCash} data-testid="pdv-confirm-close-cash" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all">Fechar Caixa</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Valor</label>
                  <input data-testid="pdv-cash-amount" type="number" step="0.01" value={cashAmount} onChange={e => setCashAmount(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" autoFocus />
                </div>
                {(showCashModal === 'sangria' || showCashModal === 'suprimento') && (
                  <div>
                    <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Motivo</label>
                    <input value={cashReason} onChange={e => setCashReason(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                  </div>
                )}
                <button
                  data-testid="pdv-confirm-cash-action"
                  onClick={() => {
                    if (showCashModal === 'open') handleOpenCash();
                    else handleMovement(showCashModal);
                  }}
                  className="w-full py-2.5 bg-brand-green hover:bg-brand-green-hover text-white font-medium rounded-lg transition-all"
                >
                  Confirmar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto animate-fade-in" data-testid="pdv-history-modal">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h2 className="font-heading font-semibold text-slate-900">Vendas do Dia</h2>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-2">
              {salesHistory.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhuma venda hoje</p>
              ) : salesHistory.map(s => (
                <div key={s._id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{s.sale_number}</span>
                    <span className="font-mono font-bold text-emerald-600">{formatCurrency(s.total)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{s.items?.length} itens | {s.payment_method}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
