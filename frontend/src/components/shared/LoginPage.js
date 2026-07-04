import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatApiError } from '../../utils/api';
import { Eye, EyeOff, LogIn } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_4e2cd625-ade9-4dd7-89bf-7caab1ef00f2/artifacts/tbyxp0yk_image.png';

export default function LoginPage({ appType = 'saas', redirectTo = '/app' }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    setError('');
    setLoading(true);
    try {
      const userData = await login(email, password);
      if (appType === 'admin' && userData.role !== 'super_admin') {
        setError('Acesso restrito a administradores do sistema.');
        setLoading(false);
        return;
      }
      // Use React Router navigate instead of window.location.href
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(formatApiError(err));
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
        </div>
      </div>
    </div>
  );
}
