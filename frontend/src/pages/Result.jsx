import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { 
  RiFileShieldLine, 
  RiDashboardLine, 
  RiUploadCloudLine, 
  RiInformationLine,
  RiMapPinLine,
  RiDownload2Line
} from 'react-icons/ri';

export const Result = () => {
  const location = useLocation();
  const violations = location.state?.violations;
  const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  if (!violations || violations.length === 0) {
    return <Navigate to="/upload" replace />;
  }

  const getConfidenceColor = (val) => {
    if (val >= 0.85) return 'bg-emerald-500';
    if (val >= 0.60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getConfidenceTextColor = (val) => {
    if (val >= 0.85) return 'text-emerald-400';
    if (val >= 0.60) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-100">AI Analysis Results</h1>
          <p className="text-slate-400 text-xs mt-0.5">Neural network output, OCR readings, and municipal policy classification</p>
        </div>
        <div className="flex gap-3">
          <Link 
            to="/upload" 
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
          >
            <RiUploadCloudLine className="h-4 w-4" />
            <span>Upload Another</span>
          </Link>
          <Link 
            to="/dashboard" 
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-brand-500/25 transition-all"
          >
            <RiDashboardLine className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Detections loop */}
      <div className="space-y-8">
        {violations.map((v, idx) => (
          <div key={v.id || idx} className="glass rounded-3xl border border-slate-800/80 p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Box: Annotated Image */}
            <div className="md:col-span-5 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Evidence (Detections Boxed)</span>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden flex items-center justify-center h-64 relative">
                {v.annotated_image ? (
                  <img 
                    src={`${baseUrl}${v.annotated_image}`} 
                    alt="AI Annotated Detections" 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <div className="text-slate-600 text-xs italic">Annotation render pending...</div>
                )}
                
                {/* Confidence Badge overlay */}
                <div className="absolute bottom-4 left-4 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${getConfidenceColor(v.confidence)}`}></div>
                  <span className={`text-[10px] font-bold ${getConfidenceTextColor(v.confidence)}`}>
                    Score: {parseInt(v.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Right Box: Data Details */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              
              <div className="space-y-4">
                
                {/* Title and Plate */}
                <div className="flex items-start justify-between border-b border-slate-800/60 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Classification</span>
                    <h3 className="font-display font-extrabold text-xl text-rose-400 mt-0.5">{v.violation_type}</h3>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">License Plate</span>
                    <span className="inline-block bg-slate-900 border border-slate-800 text-slate-200 font-mono font-bold text-sm px-3 py-1 rounded-lg mt-0.5 uppercase">
                      {v.vehicle?.vehicle_number || 'Unable to recognize plate'}
                    </span>
                  </div>
                </div>

                {/* Info Fields Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">Vehicle Type</span>
                    <span className="text-slate-200 font-bold capitalize mt-0.5 block">{v.vehicle?.vehicle_type || 'unknown'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Incident Location</span>
                    <span className="text-slate-200 font-bold mt-0.5 flex items-center gap-1">
                      <RiMapPinLine className="text-brand-400" />
                      <span>{v.location || 'Smart-City Street'}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">GPS Coordinates</span>
                    <span className="text-slate-300 font-mono mt-0.5 block">
                      {v.latitude?.toFixed(5) || 'N/A'}, {v.longitude?.toFixed(5) || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Verification Flow</span>
                    <span className="text-amber-400 font-bold mt-0.5 block">Pending Authority Review</span>
                  </div>
                </div>

                {/* AI Summary Box */}
                <div className="bg-brand-950/20 border border-brand-500/10 rounded-2xl p-4 space-y-1.5 flex items-start gap-3">
                  <RiInformationLine className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider">AI-Written Summary</span>
                    <p className="text-slate-300 text-xs italic leading-relaxed mt-0.5">
                      "{v.summary}"
                    </p>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800/40">
                <a
                  href={`${baseUrl}/api/reports/${v.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-grow bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-brand-500/35 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs uppercase tracking-wide"
                >
                  <RiDownload2Line className="h-4 w-4" />
                  <span>Download Draft PDF</span>
                </a>
                
                <Link
                  to="/history"
                  className="flex-grow bg-brand-600/10 hover:bg-brand-500/10 border border-brand-500/20 hover:border-brand-500/40 text-brand-400 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs uppercase tracking-wide"
                >
                  <RiFileShieldLine className="h-4 w-4" />
                  <span>Track Review Log</span>
                </Link>
              </div>

            </div>

          </div>
        ))}
      </div>

    </div>
  );
};

export default Result;
