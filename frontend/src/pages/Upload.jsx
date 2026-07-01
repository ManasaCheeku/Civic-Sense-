import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import MapView from '../components/MapView';
import {
  RiUploadCloud2Line, RiMapPinLine, RiCompass3Line,
  RiCloseLine, RiCheckboxCircleLine, RiCpuLine,
  RiScan2Line, RiFileListLine, RiAlertLine
} from 'react-icons/ri';

/* ── individual pipeline step in the loading screen ── */
const PipelineStep = ({ step, currentStep, idx }) => {
  const done    = currentStep > idx;
  const active  = currentStep === idx;
  const pending = currentStep < idx;
  return (
    <div className={`flex items-center gap-3 transition-all duration-300 ${pending ? 'opacity-35' : 'opacity-100'}`}>
      <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center border text-xs font-bold transition-all"
        style={
          done   ? { background: '#10b98115', borderColor: '#10b98130', color: '#34d399' } :
          active ? { background: '#6366f115', borderColor: '#6366f130', color: '#818cf8' } :
                   { background: '#1c1f35',   borderColor: '#ffffff08',  color: '#475569' }
        }>
        {done ? <RiCheckboxCircleLine className="h-4 w-4" /> : idx}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-semibold truncate ${
          done ? 'line-through text-slate-600' : active ? 'text-brand-300 font-bold' : 'text-slate-600'
        }`}>{step.label}</div>
        {active && (
          <div className="mt-1 h-1 w-full rounded-full overflow-hidden bg-surface-700">
            <div className="h-full bg-gradient-to-r from-brand-600 to-accent-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        )}
      </div>
    </div>
  );
};

/* ── checkbox toggle for compliance context ── */
const ContextToggle = ({ label, checked, onChange, color = '#818cf8' }) => (
  <label className="flex items-center gap-3 rounded-xl px-4 py-3 border cursor-pointer select-none transition-all"
    style={{
      background:   checked ? `${color}10` : 'rgba(255,255,255,0.02)',
      borderColor:  checked ? `${color}35` : 'rgba(255,255,255,0.06)',
    }}>
    <div className="h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-all"
      style={{ background: checked ? color : 'transparent', borderColor: checked ? color : '#334155' }}>
      {checked && <RiCheckboxCircleLine className="h-3.5 w-3.5 text-white" />}
    </div>
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    <span className="text-xs font-medium" style={{ color: checked ? '#e2e8f0' : '#64748b' }}>{label}</span>
  </label>
);

export const Upload = () => {
  const [image,     setImage]     = useState(null);
  const [previewUrl,setPreviewUrl]= useState(null);
  const [lat,       setLat]       = useState(40.73061);
  const [lng,       setLng]       = useState(-73.93524);
  const [locationText, setLocationText] = useState('');

  const [blockingGate,    setBlockingGate]    = useState(false);
  const [footpathParking, setFootpathParking] = useState(false);
  const [doubleParking,   setDoubleParking]   = useState(false);
  const [noParkingZone,   setNoParkingZone]   = useState(false);
  const [violationCategory, setViolationCategory] = useState('');

  const [processing,  setProcessing]  = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error,       setError]       = useState('');

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImage(file); setPreviewUrl(URL.createObjectURL(file)); setError(''); }
  };
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) { setImage(file); setPreviewUrl(URL.createObjectURL(file)); setError(''); }
  };
  const handleClear = () => { setImage(null); setPreviewUrl(null); setError(''); };

  const handleGetLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationText(`GPS Captured (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
      },
      () => setError('Failed to fetch GPS. Please select manually on the map.')
    );
  };

  const handleMapLocation = (selLat, selLng) => { setLat(selLat); setLng(selLng); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) { setError('Please select or upload an incident image.'); return; }
    setProcessing(true);
    setError('');

    const runStepper = async () => {
      for (let i = 1; i <= 5; i++) {
        setCurrentStep(i);
        await new Promise(r => setTimeout(r, i === 1 ? 1200 : i === 5 ? 800 : 1500));
      }
    };

    const uploadPromise = async () => {
      const uploadData = new FormData();
      uploadData.append('file', image);
      const uploadRes = await api.post('/api/upload', uploadData);
      const { file_path } = uploadRes.data;

      const detectData = new FormData();
      detectData.append('image_path', file_path);
      if (lat)  detectData.append('latitude', lat);
      if (lng)  detectData.append('longitude', lng);
      detectData.append('location', locationText || 'Smart City Block');
      if (blockingGate)    detectData.append('blocking_gate', 'true');
      if (footpathParking) detectData.append('footpath_parking', 'true');
      if (doubleParking)   detectData.append('double_parking', 'true');
      if (noParkingZone)   detectData.append('no_parking_zone', 'true');
      if (violationCategory) detectData.append('violation_category', violationCategory);

      const detectRes = await api.post('/api/detect', detectData);
      return detectRes.data;
    };

    try {
      const [, resultData] = await Promise.all([runStepper(), uploadPromise()]);
      setProcessing(false);
      navigate('/result', { state: { violations: resultData } });
    } catch (err) {
      console.error(err);
      setProcessing(false);
      setError(err.response?.data?.detail || 'Inference failed. Ensure a vehicle is visible in the photo.');
    }
  };

  const steps = [
    { label: 'Initializing Pipeline',               icon: <RiCpuLine className="h-4 w-4" /> },
    { label: 'Uploading Evidence Image',             icon: <RiUploadCloud2Line className="h-4 w-4" /> },
    { label: 'YOLOv8: Object Detection',             icon: <RiScan2Line className="h-4 w-4" /> },
    { label: 'EasyOCR: Plate Extraction',            icon: <RiCpuLine className="h-4 w-4" /> },
    { label: 'Compliance Rule Classification',       icon: <RiCheckboxCircleLine className="h-4 w-4" /> },
    { label: 'Generating Signed PDF Dossier',        icon: <RiFileListLine className="h-4 w-4" /> },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 page-enter">
      {/* header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-100">Upload Incident</h1>
        <p className="text-slate-500 text-xs mt-1">Submit images for vehicle detection, plate OCR, and violation classification</p>
      </div>

      {processing ? (
        /* ── AI Processing Screen ── */
        <div className="flex items-center justify-center min-h-[520px]">
          <div className="card-glow rounded-3xl p-10 flex flex-col items-center text-center max-w-md w-full">
            {/* animated rings */}
            <div className="relative h-24 w-24 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-surface-700 border-t-brand-500 animate-spin" />
              <div className="absolute inset-3 rounded-full border-2 border-surface-700 border-t-accent-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <RiCpuLine className="h-10 w-10 text-brand-400 animate-pulse" />
              </div>
            </div>

            <h2 className="font-display font-bold text-xl text-slate-100 mb-2">Analyzing Incident</h2>
            <p className="text-slate-500 text-xs mb-8 max-w-xs leading-relaxed">
              Neural network models are processing coordinates and computing bounding boxes…
            </p>

            {/* stepper */}
            <div className="w-full bg-surface-800/60 rounded-2xl border border-white/5 p-5 space-y-3.5">
              {steps.map((step, idx) => (
                <PipelineStep key={idx} step={step} currentStep={currentStep} idx={idx} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Upload Form ── */
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── LEFT: image + context ── */}
          <div className="flex flex-col gap-5">
            {/* error */}
            {error && (
              <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-4 text-xs animate-fade-in">
                <RiAlertLine className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* drop zone / preview */}
            <div className="card rounded-3xl p-5 flex flex-col min-h-[360px]">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Evidence Image</div>
              {!previewUrl ? (
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-upload').click()}
                  className="flex-grow border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group"
                  style={{ borderColor: 'rgba(99,102,241,0.15)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)'}
                >
                  <div className="h-16 w-16 rounded-2xl bg-brand-500/8 border border-brand-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <RiUploadCloud2Line className="h-8 w-8 text-brand-400/60 group-hover:text-brand-400 transition-colors" />
                  </div>
                  <div className="text-center">
                    <div className="font-display font-semibold text-sm text-slate-300">Drag &amp; Drop incident image</div>
                    <div className="text-slate-600 text-[11px] mt-1">PNG, JPG, JPEG · Max 10MB</div>
                  </div>
                  <div className="btn-ghost text-xs py-2 px-5">Browse File</div>
                  <input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>
              ) : (
                <div className="relative flex-grow rounded-2xl overflow-hidden border border-brand-500/15 bg-surface-800 flex items-center justify-center">
                  {/* scan animation overlay */}
                  <div className="scan-overlay">
                    <div className="scan-line" />
                  </div>
                  <img src={previewUrl} alt="Incident preview" className="max-h-[320px] object-contain rounded-xl" />
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute top-3 right-3 h-8 w-8 rounded-full glass border border-white/10 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <RiCloseLine className="h-4 w-4" />
                  </button>
                  {image && (
                    <div className="absolute bottom-3 left-3 bg-surface-900/90 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] text-slate-400 font-mono">
                      {image.name} · {(image.size / 1024).toFixed(0)}KB
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* context overrides */}
            <div className="card rounded-3xl p-5 space-y-4">
              <div>
                <h3 className="font-display font-semibold text-sm text-slate-200">Compliance Context</h3>
                <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">
                  Feed context flags to the rule-engine classifier for more accurate violation classification.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ContextToggle label="Footpath Parking"        checked={footpathParking} onChange={e => setFootpathParking(e.target.checked)} color="#f59e0b" />
                <ContextToggle label="Blocking Residential Gate" checked={blockingGate} onChange={e => setBlockingGate(e.target.checked)}   color="#ef4444" />
                <ContextToggle label="Double Parking"          checked={doubleParking}  onChange={e => setDoubleParking(e.target.checked)}   color="#f97316" />
                <ContextToggle label="No Parking Zone"         checked={noParkingZone}  onChange={e => setNoParkingZone(e.target.checked)}   color="#818cf8" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Manual Category Override</label>
                <select
                  value={violationCategory}
                  onChange={e => setViolationCategory(e.target.value)}
                  className="input-field text-xs py-2"
                >
                  <option value="">— Auto-detect —</option>
                  <option value="Illegal Parking">Illegal Parking</option>
                  <option value="Footpath Parking">Footpath Parking</option>
                  <option value="Double Parking">Double Parking</option>
                  <option value="Blocking Residential Gate">Blocking Residential Gate</option>
                  <option value="Hospital Emergency Entrance">Hospital Emergency Entrance</option>
                  <option value="School / College Entrance">School / College Entrance</option>
                  <option value="No Parking Zone">No Parking Zone</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── RIGHT: map + submit ── */}
          <div className="flex flex-col gap-5">
            <div className="card rounded-3xl p-5 flex flex-col flex-grow min-h-[420px]">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display font-semibold text-sm text-slate-200">Incident GPS Location</h3>
                  <p className="text-[10px] text-slate-600 mt-0.5">Click/drag the map pin to set coordinates</p>
                </div>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="btn-ghost text-xs py-1.5 px-3 gap-1"
                >
                  <RiCompass3Line className="h-3.5 w-3.5 text-accent-400" />
                  Device GPS
                </button>
              </div>

              <div className="flex-grow mb-4 rounded-xl overflow-hidden">
                <MapView interactive={true} onLocationSelect={handleMapLocation} center={[lat, lng]} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Latitude</label>
                  <input type="number" step="any" value={lat}
                    onChange={e => setLat(parseFloat(e.target.value))}
                    className="input-field text-xs py-2 font-mono" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Longitude</label>
                  <input type="number" step="any" value={lng}
                    onChange={e => setLng(parseFloat(e.target.value))}
                    className="input-field text-xs py-2 font-mono" required />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Location / Street Name</label>
                <div className="relative">
                  <RiMapPinLine className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                  <input
                    type="text"
                    placeholder="e.g. 5th Avenue, Block C"
                    value={locationText}
                    onChange={e => setLocationText(e.target.value)}
                    className="input-field pl-10 text-xs py-2"
                  />
                </div>
              </div>
            </div>

            {/* submit button */}
            <button
              type="submit"
              className="btn-primary w-full justify-center py-4 text-sm animate-glow-pulse"
            >
              <RiCpuLine className="h-5 w-5 animate-pulse" />
              Initiate AI Detection Pipeline
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Upload;
