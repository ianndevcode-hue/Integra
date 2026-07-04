import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import api from '../../utils/api';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_4e2cd625-ade9-4dd7-89bf-7caab1ef00f2/artifacts/tbyxp0yk_image.png';

export default function LoginPage({ appType = 'saas', redirectTo = '/app' }) {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear any stale tokens when landing on login page
  useEffect(() => {
    localStorage.removeItem('integra_token');
  }, []);

  // If already logged in, redirect
  useEffect(() => {
    if (user && user.id) {
      if (appType === 'admin' && user.role !== 'super_admin') return;
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo, appType]);

  const accentColors = {
    admin: { bg: 'bg-brand-purple', hover: 'hover:bg-brand-purple-hover', ring: 'focus:ring-purple-300', border: 'border-purple-200' },
    saas: { bg: 'bg-brand-blue', hover: 'hover:bg-brand-blue-hover', ring: 'focus:ring-blue-300', border: 'border-blue-200' },
    pdv: { bg: 'bg-brand-green', hover: 'hover:bg-brand-green-hover', ring: 'focus:ring-emerald-300', border: 'border-emerald-200' },
  };
  const colors = accentColors[appType] || accentColors.saas;

  const titles = {
    admin: 'Admin Master',
    saas: 'Web SaaS',
    pdv: 'PDV / Mobile',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Preencha email e senha.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const userData = await login(email.trim(), password);
      if (appType === 'admin' && userData.role !== 'super_admin') {
        setError('Acesso restrito a administradores do sistema.');
        localStorage.removeItem('integra_token');
        setLoading(false);
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 401) {
        setError(typeof detail === 'string' ? detail : 'Email ou senha incorretos.');
      } else if (status === 403) {
        setError(typeof detail === 'string' ? detail : 'Conta desativada.');
      } else if (status === 429) {
        setError(typeof detail === 'string' ? detail : 'Muitas tentativas. Aguarde 15 minutos.');
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setError('Erro de conexão com o servidor. Verifique sua internet.');
      } else {
        setError(typeof detail === 'string' ? detail : 'Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white border border-slate-200 rounded-lg p-8">
          <div className="flex flex-col items-center mb-8">
            <img src={LOGO_URL} alt="Integra Code" className="h-16 w-16 mb-4 rounded-lg" />
            <h1 className="font-heading text-2xl font-bold text-slate-900">Integra SYS</h1>
            <span className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mt-1">{titles[appType]}</span>
          </div>

          {error && (
            <div data-testid="login-error" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Email</label>
              <input
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`w-full px-3 py-2.5 border ${colors.border} rounded-lg text-sm focus:outline-none focus:ring-2 ${colors.ring} transition-all`}
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-slate-500 mb-1.5 block">Senha</label>
              <div className="relative">
                <input
                  data-testid="login-password-input"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`w-full px-3 py-2.5 border ${colors.border} rounded-lg text-sm focus:outline-none focus:ring-2 ${colors.ring} transition-all pr-10`}
                  placeholder="Sua senha"
                  required
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              data-testid="login-submit-button"
              type="submit"
              disabled={loading}
              className={`w-full ${colors.bg} ${colors.hover} text-white font-medium py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {loading ? <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" /> : <LogIn size={16} />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 text-center">
              {appType === 'admin' && 'Acesso restrito a administradores Integra Code'}
              {appType === 'saas' && 'Acesse com suas credenciais de empresa'}
              {appType === 'pdv' && 'Acesse com suas credenciais de operador'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
