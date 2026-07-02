import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import MapView from '../components/MapView';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  RiFileShieldLine, RiAlertLine, RiCalendarCheckLine,
  RiFileList3Line, RiSearchLine, RiArrowRightLine,
  RiUploadCloudLine, RiPulseLine
} from 'react-icons/ri';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────
   Reusable Stat Card
───────────────────────────────────── */
const StatCard = ({ icon, color, label, value, sub, delay = '0ms' }) => (
  <div
    className="card-stat animate-fade-up"
    style={{ animationDelay: delay }}
  >
    <div className="flex items-start justify-between mb-4">
      <div
        className="h-11 w-11 rounded-xl flex items-center justify-center border shrink-0"
        style={{ background: `${color}15`, borderColor: `${color}25`, color }}
      >
        {icon}
      </div>
      {sub !== undefined && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}>
          {sub}
        </span>
      )}
    </div>
    <div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="font-display font-black text-3xl text-slate-50 mt-1 animate-count-up">{value ?? '—'}</div>
    </div>
  </div>
);

/* ─────────────────────────────────────
   Status badge helper
───────────────────────────────────── */
const statusClass = {
  Approved:  'badge badge-approved',
  Rejected:  'badge badge-rejected',
  Dismissed: 'badge badge-dismissed',
  Pending:   'badge badge-pending',
};

/* ─────────────────────────────────────
   Skeleton card (loading state)
───────────────────────────────────── */
const SkeletonCard = () => (
  <div className="card-stat">
    <div className="skeleton h-11 w-11 rounded-xl mb-4" />
    <div className="skeleton h-3 w-20 mb-2" />
    <div className="skeleton h-8 w-14" />
  </div>
);

/* ─────────────────────────────────────
   Custom chart tooltip
───────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl border border-white/10 px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-1">{label}</div>
      <div className="font-bold text-slate-100">{payload[0].value} incidents</div>
    </div>
  );
};

/* ═══════════════════════════════════════
   MAIN DASHBOARD COMPONENT
═══════════════════════════════════════ */
export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats]           = useState(null);
  const [analytics, setAnalytics]   = useState(null);
  const [violations, setViolations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, violationsRes, analyticsRes] = await Promise.all([
          api.get('/api/dashboard'),
          api.get('/api/violations?limit=20'),
          api.get('/api/analytics'),
        ]);
        setStats(statsRes.data);
        setViolations(violationsRes.data);
        setAnalytics(analyticsRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.get(`/api/violations?search=${searchQuery}`);
      setViolations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ── stat cards config ── */
  const statCards = [
    { icon: <RiFileList3Line className="h-5 w-5" />,   color: '#818cf8', label: 'Total Reports',   value: stats?.total_violations,   sub: 'All time', delay: '0ms'   },
    { icon: <RiAlertLine className="h-5 w-5" />,       color: '#f59e0b', label: 'Illegal Parking',  value: stats?.illegal_parking,    sub: 'Top type', delay: '80ms'  },
    { icon: <RiFileShieldLine className="h-5 w-5" />,  color: '#34d399', label: 'Reports Signed',   value: stats?.reports_generated,  sub: 'PDF',      delay: '160ms' },
    { icon: <RiCalendarCheckLine className="h-5 w-5" />,color: '#22d3ee',label: "Today's Cases",    value: stats?.today_cases,        sub: 'Live',     delay: '240ms' },
  ];

  const repeatOffenders = [...(analytics?.repeat_offenders || [])]
    .sort((a, b) => b.violation_count - a.violation_count);
  const getRiskLevel = (count) => {
    if (count >= 5) return { label: 'Critical', color: '#ef4444' };
    if (count >= 3) return { label: 'High', color: '#f59e0b' };
    return { label: 'Watch', color: '#818cf8' };
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto page-enter">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-100 flex items-center gap-2">
            <RiPulseLine className="h-6 w-6 text-brand-400" />
            Control Dashboard
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Real-time civic violation alerts, analytics &amp; municipal oversight
            {user && <span className="ml-2 text-brand-400 font-semibold">· {user.name}</span>}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by plate..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-10 py-2 text-xs w-52"
            />
            <button type="submit" className="hidden" />
          </form>
          <Link to="/upload" className="btn-primary text-xs py-2 px-3">
            <RiUploadCloudLine className="h-4 w-4" />
            <span className="hidden sm:inline">New Report</span>
          </Link>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map(c => <StatCard key={c.label} {...c} />)
        }
      </div>

      {/* ── Map + Distribution chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* GIS Map */}
        <div className="lg:col-span-2 card rounded-3xl p-5 flex flex-col h-[420px]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-sm text-slate-200">Violation Live-Tracking Map</h3>
              <p className="text-[10px] text-slate-600 mt-0.5">Click pins to inspect vehicle OCR, images &amp; reports</p>
            </div>
            <span className="badge badge-live">Live</span>
          </div>
          <div className="flex-grow rounded-xl overflow-hidden">
            <MapView violations={violations} />
          </div>
        </div>

        {/* Bar chart */}
        <div className="card rounded-3xl p-5 flex flex-col h-[420px]">
          <div className="mb-4">
            <h3 className="font-display font-semibold text-sm text-slate-200">Compliance Distribution</h3>
            <p className="text-[10px] text-slate-600 mt-0.5">Active violations by category</p>
          </div>
          <div className="flex-grow">
            {stats?.type_distribution?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.type_distribution} layout="vertical" margin={{ left: -10, right: 12 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" />
                  <XAxis type="number" stroke="#334155" fontSize={9} tick={{ fill: '#475569' }} />
                  <YAxis dataKey="name" type="category" stroke="#334155" fontSize={8} width={105} tick={{ fill: '#64748b' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                <RiBarChartLine className="h-10 w-10 opacity-30" />
                <span className="text-xs">No data yet</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Trend + Recent table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Area chart */}
        <div className="card rounded-3xl p-5 flex flex-col h-[360px]">
          <div className="mb-4">
            <h3 className="font-display font-semibold text-sm text-slate-200">Monthly Incident Trend</h3>
            <p className="text-[10px] text-slate-600 mt-0.5">Aggregate cases over 6 months</p>
          </div>
          <div className="flex-grow">
            {stats?.monthly_chart?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthly_chart} margin={{ left: -25, right: 0, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="violGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" stroke="#334155" fontSize={9} tick={{ fill: '#475569' }} />
                  <YAxis stroke="#334155" fontSize={9} tick={{ fill: '#475569' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#violGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs">No data yet</div>
            )}
          </div>
        </div>

        {/* Recent violations table */}
        <div className="lg:col-span-2 card rounded-3xl p-5 flex flex-col h-[360px] overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h3 className="font-display font-semibold text-sm text-slate-200">Recent Violations Log</h3>
              <p className="text-[10px] text-slate-600 mt-0.5">Review, sign off, and extract PDFs</p>
            </div>
            <Link to="/history" className="flex items-center gap-1 text-brand-500 hover:text-brand-300 text-xs font-bold transition-colors">
              View All <RiArrowRightLine className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex-grow overflow-y-auto">
            {violations.length === 0 && !loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                <div className="h-12 w-12 rounded-2xl bg-surface-700 border border-white/5 flex items-center justify-center">
                  <RiFileList3Line className="h-6 w-6 text-slate-600" />
                </div>
                <p className="text-xs text-slate-600 max-w-xs">
                  No violations logged yet. Use{' '}
                  <Link to="/upload" className="text-brand-500 hover:underline">Upload Incident</Link>{' '}
                  to trigger AI detection.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0">
                  <tr className="border-b border-white/5 text-slate-600 text-[10px] uppercase tracking-widest font-bold"
                    style={{ background: 'rgba(13,15,31,0.8)' }}>
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Plate</th>
                    <th className="py-2.5 px-3">Violation</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {violations.slice(0, 8).map((v) => (
                    <tr key={v.id} className="hover:bg-brand-500/4 transition-colors group">
                      <td className="py-3 px-3 font-mono text-slate-600">#{v.id}</td>
                      <td className="py-3 px-3 font-semibold text-slate-200 font-mono text-[11px]">
                        {v.vehicle?.vehicle_number || 'N/A'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 max-w-[130px] truncate">{v.violation_type}</td>
                      <td className="py-3 px-3">
                        <span className={statusClass[v.review_status] || 'badge badge-pending'}>
                          {v.review_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {new Date(v.created_at).toLocaleDateString()}{' '}
                        <span className="text-slate-700">{new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/history?id=${v.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost text-[10px] py-1.5 px-3"
                        >
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {repeatOffenders.length > 0 && (
        <div className="card rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-sm text-slate-200">Repeat Offender Watchlist</h3>
              <p className="text-[10px] text-slate-600 mt-0.5">Vehicles sorted by highest violation count</p>
            </div>
            <span className="badge badge-live">{repeatOffenders.length} active</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-slate-600 text-[10px] uppercase tracking-widest">
                  <th className="py-2 px-3">Vehicle Number</th>
                  <th className="py-2 px-3">Total Violations</th>
                  <th className="py-2 px-3">Last Violation</th>
                  <th className="py-2 px-3 text-right">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {repeatOffenders.map((offender) => {
                  const risk = getRiskLevel(offender.violation_count);
                  return (
                    <tr key={offender.vehicle_number}>
                      <td className="py-3 px-3 font-mono font-bold text-slate-200">{offender.vehicle_number}</td>
                      <td className="py-3 px-3 text-slate-400">{offender.violation_count}</td>
                      <td className="py-3 px-3 text-slate-400">{offender.latest_violation}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="badge" style={{ color: risk.color, border: `1px solid ${risk.color}35`, background: `${risk.color}12` }}>
                          {risk.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

/* ← needed for RiBarChartLine if used */
import { RiBarChartLine } from 'react-icons/ri';

export default Dashboard;
