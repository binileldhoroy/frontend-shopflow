import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@hooks/useRedux';
import { useAuth } from '@hooks/useAuth';
import { login } from '@store/slices/authSlice';
import { LoginCredentials } from '../../types/auth.types';
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle, ArrowRight } from 'lucide-react';

const FEATURES = [
  { label: 'Real-time POS', desc: 'Fast, tablet-friendly point of sale' },
  { label: 'GST Invoicing', desc: 'Compliant invoices generated instantly' },
  { label: 'Inventory Control', desc: 'Live stock tracking and alerts' },
  { label: 'Financial Reports', desc: 'Revenue, profit and trend analytics' },
];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading, error } = useAuth();

  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(login(credentials)).unwrap();
      navigate('/dashboard');
    } catch {}
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex bg-[#0F1F18]">

      {/* ── Left: Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden bg-[#090B10]">

        {/* Geometric grid background */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(13,145,88,0.8) 1px, transparent 1px),
              linear-gradient(90deg, rgba(13,145,88,0.8) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Gradient orbs */}
        <div className="absolute top-[-120px] right-[-80px] w-[420px] h-[420px] rounded-full bg-[#0d9158]/8 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[300px] h-[300px] rounded-full bg-[#0d9158]/6 blur-[80px] pointer-events-none" />

        {/* Top: Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 bg-[#0d9158] rounded-xl flex items-center justify-center shadow-lg shadow-green-900/40">
              <svg viewBox="0 0 20 20" fill="white" className="w-5 h-5">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight leading-none block">ShopFlow</span>
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest">POS System</span>
            </div>
          </div>

          <h2 className="text-5xl font-bold text-white leading-[1.1] mb-5 tracking-tight">
            Commerce,<br />
            <span className="text-[#0d9158]">Simplified.</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Run your retail business from one powerful platform. Sales, inventory, invoicing — all in real time.
          </p>
        </div>

        {/* Middle: Feature grid */}
        <div className="relative z-10 grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="p-4 rounded-xl border border-white/[0.07] bg-[#0F1F18]/60 backdrop-blur-sm"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#0d9158] mb-2" />
              <p className="text-[13px] font-semibold text-slate-300">{f.label}</p>
              <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Bottom: Version */}
        <div className="relative z-10 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-xs text-gray-400">System online · v2.0</span>
        </div>
      </div>

      {/* ── Right: Login Form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative bg-white">

        <div className="w-full max-w-[22rem] relative z-10">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-10">
            <div className="w-9 h-9 bg-[#0d9158] rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="white" className="w-4.5 h-4.5">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">ShopFlow POS</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
            <p className="text-gray-500 text-[13.5px] mt-1.5">Sign in to your account to continue</p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 bg-danger-50 border border-danger-100 rounded-xl text-danger-700 mb-5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username */}
            <div>
              <label htmlFor="username" className="label">Username</label>
              <div className="relative search-wrap">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  id="username"
                  name="username"
                  className="input-field pl-10"
                  placeholder="Enter your username"
                  value={credentials.username}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative search-wrap">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className="input-field pl-10 pr-11"
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full btn btn-primary mt-2 group"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-10">
            © {new Date().getFullYear()} ShopFlow POS · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
