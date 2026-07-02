import { useAuth } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';
import {
  RiLogoutBoxRLine,
  RiUser3Line, RiShieldCheckLine, RiShieldUserLine
} from 'react-icons/ri';

const roleMeta = {
  Admin:     { color: '#a78bfa', bg: '#a78bfa14', border: '#a78bfa30', icon: <RiShieldUserLine className="h-3 w-3" /> },
  Authority: { color: '#f59e0b', bg: '#f59e0b14', border: '#f59e0b30', icon: <RiShieldCheckLine className="h-3 w-3" /> },
  Citizen:   { color: '#818cf8', bg: '#818cf814', border: '#818cf830', icon: <RiUser3Line className="h-3 w-3" /> },
};

export const Navbar = () => {
  const { user, logout } = useAuth();
  const meta = user ? (roleMeta[user.role] || roleMeta.Citizen) : null;

  return (
    <nav className="glass sticky top-0 z-40 h-16 flex items-center justify-between px-6 border-b border-white/5">
      {/* ── brand ── */}
      <NavLink to="/" className="flex items-center gap-2.5 group">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center shadow-md shadow-brand-600/20 group-hover:shadow-brand-600/40 transition-shadow">
          <span className="font-display font-black text-white text-sm">C</span>
        </div>
        <div className="hidden sm:flex items-baseline gap-1.5">
          <span className="font-display font-bold text-slate-100 tracking-tight">CivicSense</span>
          <span className="text-[10px] font-black text-brand-400 bg-brand-500/10 border border-brand-500/20 px-1.5 py-0.5 rounded-md leading-none">AI</span>
        </div>
      </NavLink>

      {/* ── right actions ── */}
      {user && (
        <div className="flex items-center gap-3">
          {/* user pill */}
          <div className="flex items-center gap-2.5">
            {/* avatar */}
            <div className="h-8 w-8 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}>
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-semibold text-slate-200 leading-none">{user.name}</div>
              <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border"
                style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}>
                {meta.icon}{user.role}
              </div>
            </div>
          </div>

          <div className="h-5 w-px bg-white/8 hidden sm:block" />

          {/* logout */}
          <button
            onClick={logout}
            className="h-9 flex items-center gap-2 px-3 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/15 transition-all text-sm font-medium"
            title="Sign Out"
          >
            <RiLogoutBoxRLine className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Sign Out</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
