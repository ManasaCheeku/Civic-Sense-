import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  RiMailLine, RiLockLine, RiArrowRightLine,
  RiAlertFill, RiShieldCheckLine, RiUser3Line, RiShieldUserLine
} from 'react-icons/ri';

/* ── Quick-select credential card ── */
const QuickCard = ({ role, email, color, icon, onClick }) => (
  <button
    onClick={() => onClick(role)}
    className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border border-white/6 text-center cursor-pointer transition-all group"
    style={{ background: `${color}08` }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.background = `${color}14`; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = `${color}08`; }}
  >
    <div className="h-9 w-9 rounded-xl flex items-center justify-center border"
      style={{ background: `${color}15`, borderColor: `${color}30`, color }}>
      {icon}
    </div>
    <div>
      <div className="text-[11px] font-bold text-slate-300 group-hover:text-slate-100 transition-colors">{role}</div>
      <div className="text-[9px] text-slate-600 mt-0.5 font-mono">{email.split('@')[0]}</div>
    </div>
  </button>
);

export const Login = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleQuickSelect = (role) => {
    setError('');
    const creds = {
      Citizen:   { email: 'citizen@civicsense.ai',   pass: 'password123' },
      Authority: { email: 'authority@civicsense.ai', pass: 'password123' },
      Admin:     { email: 'admin@civicsense.ai',     pass: 'password123' },
    };
    if (creds[role]) {
      setEmail(creds[role].email);
      setPassword(creds[role].pass);
    }
  };

  const quickRoles = [
    { role: 'Citizen',   email: 'citizen@civicsense.ai',   color: '#818cf8', icon: <RiUser3Line className="h-4 w-4" /> },
    { role: 'Authority', email: 'authority@civicsense.ai', color: '#f59e0b', icon: <RiShieldCheckLine className="h-4 w-4" /> },
    { role: 'Admin',     email: 'admin@civicsense.ai',     color: '#a78bfa', icon: <RiShieldUserLine className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* ambient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-brand-600/10 blur-[100px]" />
        <div className="grid-bg absolute inset-0" />
      </div>

      <div className="w-full max-w-md animate-fade-up">
        {/* card */}
        <div className="glass rounded-3xl border border-white/6 shadow-2xl overflow-hidden">

          {/* ── header stripe ── */}
          <div className="relative px-8 pt-8 pb-6 border-b border-white/5"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, transparent 60%)' }}>
            <div className="absolute top-5 right-5 w-24 h-24 rounded-full bg-brand-600/5 blur-3xl" />
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-600/30">
                <span className="font-display font-black text-white text-xl">C</span>
              </div>
              <div>
                <div className="font-display font-bold text-slate-100">CivicSense</div>
                <div className="text-[10px] text-slate-500">Smart City Compliance Platform</div>
              </div>
            </div>
            <h1 className="font-display font-bold text-2xl text-slate-100">Welcome back</h1>
            <p className="text-slate-500 text-xs mt-1">Sign in to your enforcement dashboard</p>
          </div>

          {/* ── form body ── */}
          <div className="px-8 py-6">
            {error && (
              <div className="mb-5 flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 text-xs animate-fade-in">
                <RiAlertFill className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* email */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <RiMailLine className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="officer@civicsense.ai"
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>

              {/* password */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Password
                </label>
                <div className="relative">
                  <RiLockLine className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 mt-2 text-sm"
              >
                {loading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>Sign In <RiArrowRightLine className="h-4 w-4" /></>
                )}
              </button>
            </form>

            {/* ── quick select section ── */}
            <div className="mt-6 pt-5 border-t border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">
                  Hackathon Demo Accounts
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {quickRoles.map(r => (
                  <QuickCard key={r.role} onClick={handleQuickSelect} {...r} />
                ))}
              </div>
              <p className="text-center text-[10px] text-slate-700 mt-3">
                Click a role to auto-fill credentials · password: password123
              </p>
            </div>
          </div>
        </div>

        {/* tagline under card */}
        <p className="text-center text-[11px] text-slate-700 mt-5">
          AI for Better Living & Smarter Communities · Hackathon 2026
        </p>
      </div>
    </div>
  );
};

export default Login;
