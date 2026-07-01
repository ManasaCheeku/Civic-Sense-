import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  RiDashboardLine, RiUploadCloudLine, RiFileTextLine,
  RiBarChartGroupedLine, RiUserSettingsLine, RiShieldKeyholeLine,
  RiSignalWifiLine
} from 'react-icons/ri';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard',       icon: RiDashboardLine,       roles: ['Citizen','Authority','Admin'] },
  { path: '/upload',    label: 'Upload Incident', icon: RiUploadCloudLine,     roles: ['Citizen','Authority','Admin'] },
  { path: '/history',   label: 'Violation History',icon: RiFileTextLine,       roles: ['Citizen','Authority','Admin'] },
  { path: '/analytics', label: 'Analytics & Maps', icon: RiBarChartGroupedLine,roles: ['Citizen','Authority','Admin'] },
  { path: '/profile',   label: 'Profile Settings', icon: RiUserSettingsLine,   roles: ['Citizen','Authority','Admin'] },
  { path: '/admin',     label: 'Admin Control',    icon: RiShieldKeyholeLine,  roles: ['Authority','Admin'] },
];

export const Sidebar = () => {
  const { user } = useAuth();
  const visible = menuItems.filter(m => m.roles.includes(user?.role));

  return (
    <aside className="w-60 shrink-0 flex flex-col h-[calc(100vh-4rem)] border-r border-white/5 overflow-y-auto"
      style={{ background: 'rgba(13,15,31,0.60)', backdropFilter: 'blur(12px)' }}>

      {/* ── navigation items ── */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visible.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-sm">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── server status card ── */}
      <div className="m-3 mb-4 p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center gap-2"
        style={{ background: 'rgba(99,102,241,0.04)' }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-300">City AI Server</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
          <RiSignalWifiLine className="h-3 w-3 text-emerald-500/60" />
          Online · Live updates
        </div>
        <div className="w-full h-1 rounded-full bg-surface-700 overflow-hidden mt-1">
          <div className="h-full w-3/4 bg-gradient-to-r from-brand-600 to-accent-500 rounded-full" />
        </div>
        <div className="text-[10px] text-slate-700">AI Pipeline: Active</div>
      </div>
    </aside>
  );
};

export default Sidebar;
