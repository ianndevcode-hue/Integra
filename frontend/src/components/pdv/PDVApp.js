import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import { saveOfflineSale, getPendingSales, syncPendingSales, cacheProducts, getCachedProducts } from '../../utils/offlineDB';
import RestaurantMode from './RestaurantMode';
import {
  ShoppingCart, Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone,
  LogOut, DoorOpen, DoorClosed, ArrowDownCircle, ArrowUpCircle, History, X, Wifi, WifiOff,
  RefreshCw, CloudOff, CheckCircle2, AlertCircle, User, UtensilsCrossed, Store
} from 'lucide-react';

const LOGO = 'https://customer-assets.emergentagent.com/job_4e2cd625-ade9-4dd7-89bf-7caab1ef00f2/artifacts/tbyxp0yk_image.png';

export default function PDVApp() {
  const { user, logout } = useAuth();
  const [pdvMode, setPdvMode] = useState('varejo'); // 'varejo' or 'restaurante'
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [cashRegister, setCashRegister] = useState(null);
  const [showCashModal, setShowCashModal] = useState(null);
  const [cashAmount, setCashAmount] = useState('');
  const [cashReason, setCashReason] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [showHistory, setShowHistory] = useState(false);
  const [salesHistory, setSalesHistory] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [processing, setProcessing] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    loadProducts();
    loadCashRegister();
    checkPending();
    const onOnline = () => { setIsOnline(true); autoSync(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  const loadProducts = async () => {
    try {
      const res = await api.get('/api/pdv/products');
      const data = res.data;
      setProducts(data);
      // Cache for offline
      await cacheProducts(data);
      // Extract categories
      const cats = [...new Set(data.map(p => p.category).filter(Boolean))];
      setCategories(cats);
    } catch {
      // Fallback to cached products if offline
      const cached = await getCachedProducts();
      if (cached.length > 0) {
        setProducts(cached);
        setCategories([...new Set(cached.map(p => p.category).filter(Boolean))]);
      }
    }
  };

  const loadCashRegister = () => api.get('/api/pdv/cash-register').then(r => setCashRegister(r.data)).catch(() => {});
  const loadHistory = () => api.get('/api/pdv/sales').then(r => { setSalesHistory(r.data); setShowHistory(true); }).catch(() => {});

  const checkPending = async () => {
    try {
      const pending = await getPendingSales();
      setPendingSync(pending.length);
    } catch {}
  };

  const autoSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncPendingSales(api.post.bind(api));
      await checkPending();
      if (result.synced > 0) {
        loadCashRegister();
      }
    } catch {} finally { setSyncing(false); }
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !category || p.category === category;
    return matchSearch && matchCat;
  });

  const addToCart = (product) => {
    setCart(prev => {
      const pid = product._id || product.id;
      const existing = prev.find(i => i.product_id === pid);
      if (existing) return prev.map(i => i.product_id === pid ? {...i, quantity: i.quantity + 1} : i);
      return [...prev, { product_id: pid, product_name: product.name, quantity: 1, unit_price: product.sale_price, discount: 0 }];
    });
  };

  const updateQty = (pid, delta) => setCart(prev => prev.map(i => i.product_id === pid ? {...i, quantity: Math.max(1, i.quantity + delta)} : i));
  const removeFromCart = (pid) => setCart(prev => prev.filter(i => i.product_id !== pid));
  const updateItemDiscount = (pid, val) => setCart(prev => prev.map(i => i.product_id === pid ? {...i, discount: parseFloat(val)||0} : i));
  const cartSubtotal = cart.reduce((sum, i) => sum + (i.quantity * i.unit_price - i.discount), 0);
  const cartTotal = cartSubtotal - (parseFloat(discount)||0);

  const handleOpenCash = async () => {
    try {
      const res = await api.post('/api/pdv/cash-register/open', { initial_amount: parseFloat(cashAmount || 0) });
      setCashRegister(res.data);
      setShowCashModal(null); setCashAmount('');
    } catch {}
  };

  const handleCloseCash = async () => {
    try {
      await api.post('/api/pdv/cash-register/close', { notes: cashReason });
      setCashRegister(null); setShowCashModal(null); setCashReason('');
    } catch {}
  };

  const handleMovement = async (type) => {
    try {
      await api.post('/api/pdv/cash-register/movement', { type, amount: parseFloat(cashAmount), reason: cashReason });
      loadCashRegister();
      setShowCashModal(null); setCashAmount(''); setCashReason('');
    } catch {}
  };

  const searchClients = async (q) => {
    setClientSearch(q);
    if (q.length >= 2) {
      try {
        const res = await api.get(`/api/pdv/clients?search=${q}`);
        setClients(res.data);
      } catch {}
    }
  };

  const handleFinalizeSale = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    const saleData = {
      items: cart, payment_method: paymentMethod,
      client_id: selectedClient?._id || selectedClient?.id || null,
      client_name: selectedClient?.name || 'Consumidor Final',
      discount: parseFloat(discount)||0, total: cartTotal
    };

    try {
      if (isOnline) {
        const res = await api.post('/api/pdv/sales', saleData);
        setLastSale(res.data);
      } else {
        // Save offline with IndexedDB
        saleData.offline = true;
        saleData.source = 'pdv';
        const localId = await saveOfflineSale(saleData);
        setLastSale({...saleData, local_id: localId, offline: true});
        await checkPending();
      }
      setCart([]); setShowPayment(false); setDiscount(0); setSelectedClient(null);
      loadCashRegister();
    } catch {} finally { setProcessing(false); }
  };

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC]" data-testid="pdv-app">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={LOGO} alt="IC" className="h-7 w-7 rounded-lg" />
          <div className="leading-tight">
            <span className="font-heading font-bold text-slate-900 text-sm">Integra PDV</span>
            <span className={`block text-[9px] tracking-[0.15em] uppercase font-semibold ${cashRegister ? 'text-emerald-600' : 'text-slate-400'}`}>
              {cashRegister ? 'Caixa Aberto' : 'Caixa Fechado'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mode switch */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 mr-1">
            <button onClick={() => setPdvMode('varejo')} data-testid="pdv-mode-varejo"
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${pdvMode === 'varejo' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>
              <Store size={11} /> Varejo
            </button>
            <button onClick={() => setPdvMode('restaurante')} data-testid="pdv-mode-restaurante"
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${pdvMode === 'restaurante' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
              <UtensilsCrossed size={11} /> Restaurante
            </button>
          </div>
          {/* Online status */}
          <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium ${isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`} data-testid="pdv-online-status">
            {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {/* Pending sync */}
          {pendingSync > 0 && (
            <button onClick={() => isOnline && autoSync()} data-testid="pdv-sync-button" className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium hover:bg-amber-100 transition-colors">
              {syncing ? <RefreshCw size={11} className="animate-spin" /> : <CloudOff size={11} />}
              {pendingSync} pendente{pendingSync>1?'s':''}
            </button>
          )}
          <button onClick={loadHistory} data-testid="pdv-history-button" className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><History size={16} /></button>
          {!cashRegister ? (
            <button onClick={() => setShowCashModal('open')} data-testid="pdv-open-cash-button" className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-green text-white text-[11px] font-medium rounded-lg hover:bg-brand-green-hover transition-all">
              <DoorOpen size={13} /> Abrir Caixa
            </button>
          ) : (
            <>
              <button onClick={() => setShowCashModal('sangria')} data-testid="pdv-sangria-button" className="flex items-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 text-[10px] font-medium rounded-lg hover:bg-red-100"><ArrowDownCircle size={11} /> Sangria</button>
              <button onClick={() => setShowCashModal('suprimento')} data-testid="pdv-suprimento-button" className="flex items-center gap-1 px-2 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-medium rounded-lg hover:bg-emerald-100"><ArrowUpCircle size={11} /> Suprimento</button>
              <button onClick={() => setShowCashModal('close')} data-testid="pdv-close-cash-button" className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-lg hover:bg-slate-200"><DoorClosed size={11} /> Fechar</button>
            </>
          )}
          <button onClick={logout} data-testid="pdv-logout-button" className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"><LogOut size={16} /></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Products grid */}
        <div className="flex-1 flex flex-col p-3 overflow-hidden">
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input ref={searchRef} data-testid="pdv-search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar produto, código de barras ou SKU..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" autoFocus />
            </div>
          </div>
          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex gap-1 mb-2 flex-wrap">
              <button onClick={() => setCategory('')} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${!category ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
              {categories.map(c => (
                <button key={c} onClick={() => setCategory(c)} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${category === c ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{c}</button>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {filteredProducts.map(p => (
                <button key={p._id || p.id} data-testid={`pdv-product-${p.sku}`} onClick={() => cashRegister && addToCart(p)} disabled={!cashRegister}
                  className={`bg-white border border-slate-200 rounded-lg p-2.5 text-left transition-all ${cashRegister ? 'hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer active:scale-[0.98]' : 'opacity-50 cursor-not-allowed'}`}>
                  <p className="text-[13px] font-medium text-slate-900 truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{p.sku}</p>
                  <p className="text-sm font-heading font-bold text-emerald-600 mt-1">{formatCurrency(p.sale_price)}</p>
                  <p className="text-[9px] text-slate-400">Est: {p.stock_quantity}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart sidebar */}
        <div className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col">
          <div className="p-2.5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-emerald-600" />
              <span className="font-heading font-semibold text-slate-900 text-sm">Carrinho</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{cart.length}</span>
            </div>
            {/* Client select */}
            <button onClick={() => setShowClientSearch(true)} data-testid="pdv-select-client" className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100">
              <User size={11} />
              {selectedClient ? selectedClient.name.split(' ')[0] : 'Cliente'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingCart size={28} className="text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Carrinho vazio</p>
              </div>
            ) : cart.map(item => (
              <div key={item.product_id} className="bg-slate-50 rounded-lg p-2.5">
                <div className="flex items-start justify-between mb-1.5">
                  <p className="text-[13px] font-medium text-slate-900 flex-1 pr-1 leading-tight">{item.product_name}</p>
                  <button onClick={() => removeFromCart(item.product_id)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.product_id, -1)} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100"><Minus size={10} /></button>
                    <span className="w-7 text-center text-sm font-mono font-medium">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product_id, 1)} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100"><Plus size={10} /></button>
                  </div>
                  <span className="font-mono font-medium text-sm">{formatCurrency(item.quantity * item.unit_price - item.discount)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Cash info */}
          {cashRegister && (
            <div className="px-2.5 py-1.5 border-t border-slate-100 bg-emerald-50/50 text-[11px]">
              <div className="flex justify-between"><span className="text-slate-500">Saldo caixa:</span><span className="font-mono font-medium text-emerald-700">{formatCurrency(cashRegister.current_amount)}</span></div>
            </div>
          )}

          {/* Discount + Total */}
          <div className="p-2.5 border-t border-slate-200">
            {cart.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <input type="number" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="Desconto R$" className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                {selectedClient && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded">{selectedClient.name}</span>}
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Total</span>
              <span className="text-xl font-heading font-bold text-slate-900">{formatCurrency(cartTotal)}</span>
            </div>
            <button data-testid="pdv-pay-button" onClick={() => cart.length > 0 && setShowPayment(true)} disabled={cart.length === 0 || !cashRegister}
              className="w-full py-2.5 bg-brand-green hover:bg-brand-green-hover text-white font-heading font-bold text-base rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {!isOnline && <CloudOff size={14} className="inline mr-1" />}
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
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-1">Finalizar Venda</h2>
            <p className="text-2xl font-heading font-bold text-emerald-600 mb-1">{formatCurrency(cartTotal)}</p>
            {!isOnline && <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mb-3 flex items-center gap-1"><CloudOff size={12} /> Venda será salva offline e sincronizada depois</p>}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { value: 'dinheiro', icon: Banknote, label: 'Dinheiro' },
                { value: 'cartao_credito', icon: CreditCard, label: 'Crédito' },
                { value: 'cartao_debito', icon: CreditCard, label: 'Débito' },
                { value: 'pix', icon: Smartphone, label: 'PIX' },
              ].map(pm => (
                <button key={pm.value} data-testid={`pdv-payment-${pm.value}`} onClick={() => setPaymentMethod(pm.value)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all ${paymentMethod === pm.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <pm.icon size={18} className={paymentMethod === pm.value ? 'text-emerald-600' : 'text-slate-400'} />
                  <span className={`text-sm font-medium ${paymentMethod === pm.value ? 'text-emerald-700' : 'text-slate-600'}`}>{pm.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPayment(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50">Cancelar</button>
              <button data-testid="pdv-confirm-sale-button" onClick={handleFinalizeSale} disabled={processing}
                className="flex-1 py-2.5 bg-brand-green hover:bg-brand-green-hover text-white font-medium rounded-lg disabled:opacity-50">
                {processing ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Success */}
      {lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLastSale(null)} />
          <div className="relative bg-white rounded-lg w-full max-w-sm animate-fade-in p-6 text-center">
            {lastSale.offline ? (
              <><CloudOff size={40} className="mx-auto text-amber-500 mb-3" />
              <h2 className="text-lg font-heading font-bold text-slate-900">Venda Salva Offline</h2>
              <p className="text-sm text-slate-500 mt-1">Será sincronizada quando a internet voltar.</p>
              <p className="text-xs text-amber-600 mt-2">Pendente de sincronização e emissão fiscal</p></>
            ) : (
              <><CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
              <h2 className="text-lg font-heading font-bold text-slate-900">Venda Realizada!</h2>
              <p className="text-2xl font-heading font-bold text-emerald-600 mt-1">{formatCurrency(lastSale.total)}</p>
              <p className="text-xs text-slate-500 mt-1">{lastSale.sale_number} | NFC-e: {lastSale.fiscal_status === 'emitida' ? 'Emitida' : 'Pendente de emissão'}</p></>
            )}
            <button onClick={() => { setLastSale(null); searchRef.current?.focus(); }} className="mt-4 w-full py-2.5 bg-brand-green text-white font-medium rounded-lg">Nova Venda</button>
          </div>
        </div>
      )}

      {/* Cash Modal */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCashModal(null)} />
          <div className="relative bg-white rounded-lg w-full max-w-sm animate-fade-in p-6" data-testid="pdv-cash-modal">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">
              {{open:'Abrir Caixa',close:'Fechar Caixa',sangria:'Sangria',suprimento:'Suprimento'}[showCashModal]}
            </h2>
            {showCashModal === 'close' ? (
              <div className="space-y-3">
                {cashRegister && (
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Abertura:</span><span className="font-mono">{formatCurrency(cashRegister.initial_amount)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Vendas ({cashRegister.total_sales_count||0}):</span><span className="font-mono text-emerald-600">{formatCurrency(cashRegister.total_sales)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Sangrias:</span><span className="font-mono text-red-600">-{formatCurrency(cashRegister.total_sangria)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Suprimentos:</span><span className="font-mono text-blue-600">+{formatCurrency(cashRegister.total_suprimento)}</span></div>
                    <div className="flex justify-between border-t pt-2 font-semibold"><span>Saldo:</span><span className="font-mono">{formatCurrency(cashRegister.current_amount)}</span></div>
                  </div>
                )}
                {pendingSync > 0 && <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg flex items-center gap-1"><AlertCircle size={12} /> {pendingSync} venda(s) pendente(s) de sincronização</p>}
                <button onClick={handleCloseCash} data-testid="pdv-confirm-close-cash" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg">Fechar Caixa</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] tracking-[0.15em] uppercase font-semibold text-slate-500 mb-1 block">Valor</label>
                  <input data-testid="pdv-cash-amount" type="number" step="0.01" value={cashAmount} onChange={e => setCashAmount(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" autoFocus />
                </div>
                {(showCashModal === 'sangria' || showCashModal === 'suprimento') && (
                  <div>
                    <label className="text-[10px] tracking-[0.15em] uppercase font-semibold text-slate-500 mb-1 block">Motivo</label>
                    <select value={cashReason} onChange={e => setCashReason(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                      <option value="">Selecione o motivo</option>
                      {showCashModal === 'sangria' ? (
                        <>{['Retirada para banco','Troco','Pagamento fornecedor','Despesa operacional','Outro'].map(r => <option key={r} value={r}>{r}</option>)}</>
                      ) : (
                        <>{['Troco adicional','Fundo de caixa','Recebimento avulso','Outro'].map(r => <option key={r} value={r}>{r}</option>)}</>
                      )}
                    </select>
                  </div>
                )}
                <button data-testid="pdv-confirm-cash-action" onClick={() => showCashModal === 'open' ? handleOpenCash() : handleMovement(showCashModal)}
                  className="w-full py-2.5 bg-brand-green hover:bg-brand-green-hover text-white font-medium rounded-lg">Confirmar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Client Search Modal */}
      {showClientSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowClientSearch(false)} />
          <div className="relative bg-white rounded-lg w-full max-w-md animate-fade-in p-4">
            <h2 className="font-heading font-semibold text-slate-900 mb-3">Selecionar Cliente</h2>
            <input autoFocus value={clientSearch} onChange={e => searchClients(e.target.value)} placeholder="Buscar por nome ou CPF/CNPJ..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-2" />
            <div className="max-h-48 overflow-y-auto">
              <button onClick={() => { setSelectedClient(null); setShowClientSearch(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded-lg">Consumidor Final</button>
              {clients.map(c => (
                <button key={c._id||c.id} onClick={() => { setSelectedClient(c); setShowClientSearch(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-lg flex justify-between">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-slate-400">{c.document}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHistory(false)} />
          <div className="relative bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto animate-fade-in">
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
                  <p className="text-xs text-slate-500 mt-0.5">{s.items?.length} itens | {s.client_name} | {s.payment_method}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{s.status}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${s.fiscal_status === 'emitida' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>NFC-e: {s.fiscal_status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
