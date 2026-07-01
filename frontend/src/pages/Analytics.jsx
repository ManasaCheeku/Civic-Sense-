import { useState, useEffect } from 'react';
import api from '../utils/api';
import MapView from '../components/MapView';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { RiMapPinLine, RiBarChartGroupedLine, RiAlertLine, RiRoadMapLine } from 'react-icons/ri';

/* ── Colors for pie chart segments ── */
const PIE_COLORS = ['#f59e0b', '#34d399', '#f87171', '#94a3b8'];

/* ── Custom Tooltip ── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl border border-white/10 px-3 py-2 text-xs shadow-xl">
      {label && <div className="text-slate-500 mb-1">{label}</div>}
      <div className="font-bold text-slate-100">{payload[0].name}: {payload[0].value}</div>
    </div>
  );
};

/* ── stat mini card ── */
const MiniStat = ({ label, value, color }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5"
    style={{ background: `${color}08` }}>
    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
    <div>
      <div className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">{label}</div>
      <div className="font-display font-black text-xl text-slate-100">{value}</div>
    </div>
  </div>
);

export const Analytics = () => {
  const [violations, setViolations] = useState([]);
  const [analytics,  setAnalytics]  = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [violsRes, analyticsRes] = await Promise.all([
          api.get('/api/violations?limit=100'),
          api.get('/api/analytics'),
        ]);
        setViolations(violsRes.data);
        setAnalytics(analyticsRes.data);
      } catch (err) {
        console.error('Failed to load analytics data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading && !analytics) {
    return (
      <div className="flex h-full w-full items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-surface-700 border-t-brand-500 animate-spin" />
          <p className="text-xs text-slate-600">Loading analytics…</p>
        </div>
      </div>
    );
  }

  const totalViolations = violations.length;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto page-enter">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-100 flex items-center gap-2">
            <RiBarChartGroupedLine className="h-6 w-6 text-brand-400" />
            Smart City Analytics
          </h1>
          <p className="text-slate-500 text-xs mt-1">GIS mapping, compliance trends &amp; infraction analysis</p>
        </div>
        <div className="flex gap-3">
          <MiniStat label="Total Incidents" value={totalViolations} color="#6366f1" />
        </div>
      </div>

      {/* ── Full-width Map ── */}
      <div className="card rounded-3xl p-5 flex flex-col h-[480px]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-sm text-slate-200 flex items-center gap-2">
              <RiMapPinLine className="h-4 w-4 text-accent-400" />
              GIS Coordinate Mapping
            </h3>
            <p className="text-[10px] text-slate-600 mt-0.5">
              All registered traffic &amp; parking infractions plotted across city blocks
            </p>
          </div>
          <span className="badge badge-live">Live</span>
        </div>
        <div className="flex-grow rounded-xl overflow-hidden">
          <MapView violations={violations} zoom={12} />
        </div>
      </div>

      {/* ── Charts grid ── */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Area chart: weekly trend */}
          <div className="card rounded-3xl p-5 flex flex-col h-[360px]">
            <div className="mb-4">
              <h3 className="font-display font-semibold text-sm text-slate-200">Weekly Infraction Trend</h3>
              <p className="text-[10px] text-slate-600 mt-0.5">Incident reports aggregated by week</p>
            </div>
            <div className="flex-grow">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.violation_trends} margin={{ left: -25, right: 0, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" stroke="#334155" fontSize={9} tick={{ fill: '#475569' }} />
                  <YAxis stroke="#334155" fontSize={9} tick={{ fill: '#475569' }} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#areaGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut chart: status ratio */}
          <div className="card rounded-3xl p-5 flex flex-col h-[360px]">
            <div className="mb-4">
              <h3 className="font-display font-semibold text-sm text-slate-200">Docket Status Ratio</h3>
              <p className="text-[10px] text-slate-600 mt-0.5">Cases reviewed by authorities</p>
            </div>
            <div className="flex-grow flex items-center justify-center">
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={analytics.status_distribution}
                    cx="50%" cy="50%"
                    innerRadius={65} outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {analytics.status_distribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                  <Legend
                    verticalAlign="bottom" height={36} iconSize={8} iconType="circle"
                    wrapperStyle={{ fontSize: 10, color: '#94a3b8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Future Feature Banner ── */}
      <div className="card rounded-3xl p-6">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
            <RiRoadMapLine className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm text-slate-200 mb-1">
              Municipal Heatmap Overlays
              <span className="ml-2 badge" style={{ background: '#f59e0b12', color: '#f59e0b', border: '1px solid #f59e0b25' }}>
                Concept
              </span>
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed max-w-2xl">
              High-infraction hot spots mapped dynamically from live municipal camera systems.
              Future updates will integrate CCTV feeds to highlight congestion corridors with
              thermal overlays of double-parking patterns.
            </p>
          </div>
        </div>

        <div className="mt-5 h-28 rounded-2xl border border-white/5 overflow-hidden relative flex items-center justify-center"
          style={{ background: 'rgba(13,15,31,0.4)' }}>
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/6 via-amber-500/5 to-cyan-500/6 animate-pulse" />
          <div className="relative text-center">
            <RiAlertLine className="h-6 w-6 text-slate-700 mx-auto mb-1" />
            <div className="text-xs font-semibold text-slate-600">Live CCTV Heatmap Integration</div>
            <div className="text-[10px] text-slate-700 mt-0.5">Coming in v2.0</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
