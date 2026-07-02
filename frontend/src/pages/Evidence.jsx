import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api';
import {
  RiArrowLeftLine,
  RiDownloadLine,
  RiFileShieldLine,
  RiMapPinLine,
  RiSparklingLine,
} from 'react-icons/ri';

const InfoTile = ({ label, value, mono = false }) => (
  <div className="rounded-2xl border border-white/5 bg-surface-900/40 p-4">
    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{label}</div>
    <div className={`mt-1 text-sm font-semibold text-slate-200 ${mono ? 'font-mono text-xs' : ''}`}>
      {value || 'Not available'}
    </div>
  </div>
);

export const Evidence = () => {
  const { id } = useParams();
  const [violation, setViolation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    const loadEvidence = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/api/violations?limit=500');
        const match = res.data.find((item) => item.id === Number(id));
        if (!match) {
          setError('Evidence record not found.');
        }
        setViolation(match || null);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load evidence.');
      } finally {
        setLoading(false);
      }
    };
    loadEvidence();
  }, [id]);

  const handleDownloadReport = async () => {
    if (!violation) return;
    setDownloading(true);
    try {
      const res = await api.get(`/api/reports/${violation.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${violation.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to download report.');
    } finally {
      setDownloading(false);
    }
  };

  const officerRemarks = violation
    ? violation.review_status === 'Pending'
      ? 'Pending officer review'
      : `Authority marked this case as ${violation.review_status}.`
    : '';

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-24">
        <div className="h-10 w-10 rounded-full border-4 border-surface-700 border-t-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !violation) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link to="/history" className="btn-ghost text-xs mb-4">
          <RiArrowLeftLine className="h-4 w-4" />
          Back to History
        </Link>
        <div className="card rounded-3xl p-8 text-center text-sm text-rose-300">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            <RiFileShieldLine className="h-4 w-4 text-brand-400" />
            Evidence Docket #{violation.id}
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-100 mt-1">
            {violation.vehicle?.vehicle_number || 'Unreadable Plate'}
          </h1>
          <p className="text-slate-500 text-xs mt-1">Evidence, OCR, GPS, confidence, and report download</p>
        </div>
        <Link to="/history" className="btn-ghost text-xs">
          <RiArrowLeftLine className="h-4 w-4" />
          Back to History
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card rounded-3xl p-5 space-y-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Original Image</div>
            <div className="h-72 rounded-2xl overflow-hidden border border-white/6 bg-surface-800 flex items-center justify-center">
              <img src={`${baseUrl}${violation.image_path}`} alt="Original evidence" className="h-full w-full object-cover" />
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Annotated Detection</div>
            <div className="h-72 rounded-2xl overflow-hidden border border-white/6 bg-surface-800 flex items-center justify-center">
              <img
                src={`${baseUrl}${violation.annotated_image || violation.image_path}`}
                alt="Annotated evidence"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoTile label="OCR Result" value={violation.vehicle?.vehicle_number || 'Unreadable'} mono />
            <InfoTile label="Vehicle Number" value={violation.vehicle?.vehicle_number || 'Unreadable'} mono />
            <InfoTile label="Violation Type" value={violation.violation_type} />
            <InfoTile label="AI Confidence" value={`${parseInt((violation.confidence || 0) * 100)}% (${violation.confidence_level || 'Unrated'})`} />
            <InfoTile label="Timestamp" value={new Date(violation.created_at).toLocaleString()} />
            <InfoTile label="Review Status" value={violation.review_status} />
            <InfoTile
              label="GPS Coordinates"
              value={violation.latitude ? `${violation.latitude.toFixed(5)}, ${violation.longitude?.toFixed(5)}` : 'Not set'}
              mono
            />
            <InfoTile label="Officer Remarks" value={officerRemarks} />
          </div>

          <div className="rounded-2xl border border-brand-500/15 bg-brand-500/5 p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-400">
              <RiSparklingLine className="h-4 w-4" />
              AI Summary
            </div>
            <p className="text-xs leading-relaxed text-slate-400 mt-2">{violation.summary}</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-surface-900/40 p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              <RiMapPinLine className="h-4 w-4 text-accent-400" />
              Location
            </div>
            <div className="text-sm font-semibold text-slate-200 mt-1">{violation.location || 'Unknown Street'}</div>
          </div>

          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={downloading}
            className="btn-primary w-full justify-center py-3 text-xs uppercase tracking-widest disabled:opacity-60"
          >
            {downloading ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <RiDownloadLine className="h-4 w-4" />}
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default Evidence;
