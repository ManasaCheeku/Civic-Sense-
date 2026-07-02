import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  RiSearchLine, RiFilter3Line, RiCheckDoubleLine,
  RiCloseCircleLine, RiFolderShield2Line, RiMapPinLine,
  RiDownloadLine, RiFileListLine, RiFileShieldLine,
  RiSparklingLine, RiCarLine
} from 'react-icons/ri';

/* ── Status badge helper ── */
const statusClass = {
  Approved:  'badge badge-approved',
  Rejected:  'badge badge-rejected',
  Dismissed: 'badge badge-dismissed',
  Pending:   'badge badge-pending',
};

/* ── Info row inside detail panel ── */
const InfoRow = ({ label, value, mono = false }) => (
  <div>
    <div className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-0.5">{label}</div>
    <div className={`text-sm text-slate-200 font-semibold ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</div>
  </div>
);

/* ── Violation list item ── */
const ViolationListItem = ({ v, isSelected, onClick }) => (
  <div
    onClick={onClick}
    className={`px-4 py-3.5 cursor-pointer transition-all border-l-2 select-none ${
      isSelected
        ? 'border-brand-500 bg-brand-500/5'
        : 'border-transparent hover:bg-white/2 hover:border-white/10'
    }`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[9px] text-slate-700">#{v.id}</span>
          <span className="font-mono font-bold text-xs text-slate-200 tracking-wide truncate">
            {v.vehicle?.vehicle_number || 'Unrecognized'}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-medium truncate">{v.violation_type}</div>
        <div className="text-[10px] text-slate-700 mt-0.5">
          {new Date(v.created_at).toLocaleDateString()} ·{' '}
          {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <span className={statusClass[v.review_status] || 'badge badge-pending'}>
        {v.review_status}
      </span>
    </div>
  </div>
);

/* ─────────────────────────────────────
   MAIN HISTORY COMPONENT
───────────────────────────────────── */
export const History = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const paramId = searchParams.get('id');

  const [violations,        setViolations]        = useState([]);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [searchQuery,       setSearchQuery]       = useState('');
  const [statusFilter,      setStatusFilter]      = useState('');
  const [loading,           setLoading]           = useState(true);
  const [updating,          setUpdating]          = useState(false);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/violations?status=${statusFilter}&search=${searchQuery}`);
      setViolations(res.data);
      if (res.data.length > 0) {
        const match = paramId ? res.data.find(v => v.id === parseInt(paramId)) : null;
        setSelectedViolation(match || res.data[0]);
      } else {
        setSelectedViolation(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (violationId) => {
    try {
      const res = await api.get(`/api/reports/${violationId}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${violationId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to download report.');
    }
  };

  useEffect(() => { fetchViolations(); }, [statusFilter, searchQuery, paramId]);

  const handleStatusUpdate = async (newStatus) => {
    if (!selectedViolation) return;
    setUpdating(true);
    try {
      const res = await api.put(`/api/violations/${selectedViolation.id}`, { review_status: newStatus });
      setSelectedViolation(res.data);
      setViolations(prev => prev.map(v => v.id === selectedViolation.id ? res.data : v));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update compliance status.');
    } finally {
      setUpdating(false);
    }
  };

  const getRecommendedAction = (v) => {
    if (v.review_status === 'Rejected')  return 'No compliance action – Case Rejected';
    if (v.review_status === 'Dismissed') return 'Case Dismissed';
    const actions = {
      'Hospital Emergency Entrance':  'Tow Vehicle Immediately',
      'Blocking Residential Gate':    'Dispatch Tow Vehicle',
      'Footpath Parking':             'Dispatch Tow & Fine',
      'Illegal Parking':              'Issue Warning Letter',
      'Double Parking':               'Issue Digital Warning',
      'No Parking Zone':              'Issue Violation Warning',
      'School / College Entrance':    'Issue Warning & Restrict Parking',
    };
    return actions[v.violation_type] || 'Request Manual Verification';
  };

  const sv = selectedViolation;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 page-enter">

      {/* ── Page title ── */}
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-100 flex items-center gap-2">
          <RiFileShieldLine className="h-6 w-6 text-brand-400" />
          Municipal Violation Log
        </h1>
        <p className="text-slate-500 text-xs mt-1">Filter, search, review details and sign off official enforcement reports</p>
      </div>

      {/* ── Split panel layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ── LEFT: List panel ── */}
        <div className="lg:col-span-4 flex flex-col gap-3">

          {/* filter controls */}
          <div className="card rounded-2xl p-3 flex flex-col gap-2">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <input
                type="text"
                placeholder="Search plate number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field pl-9 py-2 text-xs"
              />
            </div>
            <div className="relative flex items-center gap-2">
              <RiFilter3Line className="text-slate-600 h-4 w-4 shrink-0" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="input-field py-1.5 text-xs"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending Review</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Dismissed">Dismissed</option>
              </select>
            </div>
          </div>

          {/* list */}
          <div className="card rounded-2xl overflow-hidden flex flex-col h-[560px]">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Reports</span>
              <span className="text-[10px] font-bold text-slate-600">{violations.length} found</span>
            </div>
            <div className="flex-grow overflow-y-auto divide-y divide-white/4">
              {loading && violations.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <div className="h-6 w-6 rounded-full border-2 border-surface-700 border-t-brand-500 animate-spin" />
                </div>
              ) : violations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
                  <RiFileListLine className="h-10 w-10 text-slate-700" />
                  <span className="text-xs text-slate-600">No records match the current filter.</span>
                </div>
              ) : (
                violations.map(v => (
                  <ViolationListItem
                    key={v.id}
                    v={v}
                    isSelected={sv?.id === v.id}
                    onClick={() => setSelectedViolation(v)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Detail panel ── */}
        <div className="lg:col-span-8">
          {sv ? (
            <div className="card rounded-3xl p-6 space-y-5">

              {/* ── Docket header ── */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/5">
                <div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Docket #{sv.id}</div>
                  <h2 className="font-display font-bold text-xl text-slate-100 flex items-center gap-2">
                    <RiCarLine className="h-5 w-5 text-brand-400" />
                    {sv.vehicle?.vehicle_number || 'Unable to recognize plate'}
                  </h2>
                  <div className="text-xs text-slate-500 mt-1">
                    Violation: <span className="text-rose-400 font-semibold">{sv.violation_type}</span>
                  </div>
                </div>
                <span className={`${statusClass[sv.review_status] || 'badge badge-pending'} text-[11px]`}>
                  {sv.review_status}
                </span>
              </div>

              {/* ── Evidence images ── */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'AI Annotated', src: `${baseUrl}${sv.annotated_image}`, fallback: `${baseUrl}${sv.image_path}` },
                  { label: 'Raw Evidence', src: `${baseUrl}${sv.image_path}`, fallback: null },
                ].map(({ label, src, fallback }) => (
                  <div key={label}>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">{label}</div>
                    <div className="rounded-2xl border border-white/6 overflow-hidden h-44 bg-surface-800 flex items-center justify-center">
                      <img
                        src={src}
                        alt={label}
                        className="h-full w-full object-cover"
                        onError={fallback ? e => { e.target.src = fallback; } : undefined}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Info grid ── */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl"
                style={{ background: 'rgba(13,15,31,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <InfoRow label="Vehicle Type"      value={sv.vehicle?.vehicle_type || 'Unknown'} />
                <InfoRow label="Detection Confidence" value={`${parseInt((sv.confidence || 0) * 100)}% (${sv.confidence_level || 'Unrated'})`} />
                <InfoRow label="GPS Coordinates"   value={sv.latitude ? `${sv.latitude?.toFixed(5)}, ${sv.longitude?.toFixed(5)}` : 'Not set'} mono />
                <InfoRow label="Location"          value={sv.location || 'Unknown Street'} />
                <InfoRow label="Reported"          value={new Date(sv.created_at).toLocaleString()} />
                <InfoRow label="Docket ID"         value={`#${sv.id}`} mono />
              </div>

              {/* ── AI summary ── */}
              <div className="rounded-2xl border p-4 space-y-2"
                style={{ background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.12)' }}>
                <div className="flex items-center gap-2">
                  <RiSparklingLine className="h-4 w-4 text-brand-400" />
                  <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest">AI Case Summary</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed italic">
                  &ldquo;{sv.summary}&rdquo;
                </p>
              </div>

              {/* ── Recommended action ── */}
              <div className="flex items-center justify-between rounded-2xl px-4 py-3 border border-white/5"
                style={{ background: 'rgba(239,68,68,0.04)' }}>
                <span className="text-xs text-slate-500 font-semibold">Recommended Action</span>
                <span className="text-rose-400 font-bold text-xs uppercase tracking-wide">{getRecommendedAction(sv)}</span>
              </div>

              {/* ── Download PDF ── */}
              <Link
                to={`/evidence/${sv.id}`}
                className="btn-ghost w-full justify-center py-3 text-xs uppercase tracking-widest"
              >
                <RiFileShieldLine className="h-4 w-4 text-brand-400" />
                Open Evidence File
              </Link>

              {sv.pdf_report && (
                <button
                  type="button"
                  onClick={() => handleDownloadReport(sv.id)}
                  className="btn-ghost w-full justify-center py-3 text-xs uppercase tracking-widest"
                >
                  <RiDownloadLine className="h-4 w-4 text-brand-400" />
                  Download Signed PDF Dossier
                </button>
              )}

              {/* ── Decision buttons (authority only) ── */}
              {['Authority', 'Admin'].includes(user?.role) && sv.review_status === 'Pending' && (
                <div className="pt-2 border-t border-white/5">
                  <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Officer Decision</div>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleStatusUpdate('Approved')}
                      disabled={updating}
                      className="btn-success justify-center py-3 text-xs"
                    >
                      {updating ? <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <RiCheckDoubleLine className="h-4 w-4" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('Rejected')}
                      disabled={updating}
                      className="btn-danger justify-center py-3 text-xs"
                    >
                      {updating ? <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <RiCloseCircleLine className="h-4 w-4" />}
                      Reject
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('Dismissed')}
                      disabled={updating}
                      className="btn-ghost justify-center py-3 text-xs"
                    >
                      <RiFolderShield2Line className="h-4 w-4" />
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* Empty state */
            <div className="card rounded-3xl p-8 flex flex-col items-center justify-center gap-4 min-h-[400px] text-center">
              <div className="h-16 w-16 rounded-2xl bg-surface-700 border border-white/5 flex items-center justify-center">
                <RiFileListLine className="h-8 w-8 text-slate-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-600">No violation selected</div>
                <p className="text-xs text-slate-700 mt-1">Select a violation from the left panel to inspect its details.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
