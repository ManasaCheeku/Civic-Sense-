import { Link } from 'react-router-dom';
import {
  RiScan2Line, RiMapPinRangeLine, RiBarChartBoxLine,
  RiFileShieldLine, RiShieldUserLine, RiArrowRightLine,
  RiCpuLine, RiCameraLine, RiAlertLine, RiCheckboxCircleLine
} from 'react-icons/ri';

/* ── tiny helper for the "stat ticker" numbers ── */
const Stat = ({ value, label }) => (
  <div className="flex flex-col items-center px-6 py-4">
    <span className="font-display font-black text-3xl text-gradient">{value}</span>
    <span className="text-slate-500 text-xs mt-1 font-medium tracking-wide">{label}</span>
  </div>
);

/* ── feature card ── */
const Feature = ({ icon, color, title, body, delay = '0ms' }) => (
  <div
    className="glass glass-hover rounded-2xl p-6 flex flex-col gap-4 border border-white/5 animate-fade-up"
    style={{ animationDelay: delay }}
  >
    <div
      className="h-12 w-12 rounded-xl flex items-center justify-center border shrink-0"
      style={{ background: `${color}18`, borderColor: `${color}30`, color }}
    >
      {icon}
    </div>
    <div>
      <h3 className="font-display font-bold text-slate-100 text-base leading-snug">{title}</h3>
      <p className="text-slate-400 text-xs mt-2 leading-relaxed">{body}</p>
    </div>
  </div>
);

/* ── step item ── */
const Step = ({ n, label, sub, active }) => (
  <div className={`flex items-start gap-3 transition-opacity ${active ? 'opacity-100' : 'opacity-40'}`}>
    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black border
      ${active ? 'bg-brand-600/20 border-brand-500/50 text-brand-400' : 'bg-surface-700 border-white/5 text-slate-600'}`}>
      {n}
    </div>
    <div>
      <div className={`text-xs font-bold ${active ? 'text-slate-100' : 'text-slate-500'}`}>{label}</div>
      <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>
    </div>
  </div>
);

export const Landing = () => {
  const features = [
    {
      icon: <RiScan2Line className="h-6 w-6" />,
      color: '#818cf8',
      title: 'AI Vehicle Detection',
      body: 'Real-time YOLOv8 deep-learning detects cars, motorcycles, trucks and buses with bounding boxes and confidence scores.',
      delay: '0ms',
    },
    {
      icon: <RiCameraLine className="h-6 w-6" />,
      color: '#22d3ee',
      title: 'License Plate OCR',
      body: 'EasyOCR extracts registration numbers from cropped plate regions. Returns "Unable to recognize" on low-confidence reads.',
      delay: '80ms',
    },
    {
      icon: <RiMapPinRangeLine className="h-6 w-6" />,
      color: '#34d399',
      title: 'Smart GPS Mapping',
      body: 'Interactive Leaflet maps match violations to actual GPS coordinates for municipal geo-zone verification.',
      delay: '160ms',
    },
    {
      icon: <RiBarChartBoxLine className="h-6 w-6" />,
      color: '#f59e0b',
      title: 'Authority Workflow',
      body: 'No automatic fines. Officers manually Approve, Reject, or Dismiss each recommendation—keeping humans in control.',
      delay: '240ms',
    },
    {
      icon: <RiFileShieldLine className="h-6 w-6" />,
      color: '#a78bfa',
      title: 'PDF Dossiers',
      body: 'Generates official, signed PDF violation reports with annotated images, GPS details, and QR verification codes.',
      delay: '320ms',
    },
    {
      icon: <RiAlertLine className="h-6 w-6" />,
      color: '#fb923c',
      title: 'Compliance Rules',
      body: 'Rule-based engine classifies 7+ violation types: footpath parking, double parking, hospital zones, school entrances.',
      delay: '400ms',
    },
  ];

  const steps = [
    { label: 'Citizen uploads image', sub: 'JPEG / PNG via mobile or browser' },
    { label: 'YOLO detects vehicles', sub: 'Bounding boxes + confidence scores' },
    { label: 'EasyOCR reads plate', sub: 'Number plate extraction from crop' },
    { label: 'Rule engine classifies', sub: '7-category parking violation check' },
    { label: 'AI generates summary', sub: 'Context-aware violation description' },
    { label: 'Authority reviews', sub: 'Approve · Reject · Dismiss' },
  ];

  return (
    <div className="min-h-screen bg-surface-950 text-slate-100 flex flex-col overflow-x-hidden relative">
      {/* ── background ambient ── */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full bg-brand-600/10 blur-[120px]" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full bg-accent-500/6 blur-[100px]" />
        <div className="grid-bg absolute inset-0 opacity-100" />
      </div>

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 shadow-lg shadow-brand-600/30 flex items-center justify-center">
              <span className="font-display font-black text-white text-base">C</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-extrabold text-slate-100 tracking-tight">CivicSense</span>
              <span className="text-[10px] font-black text-brand-400 bg-brand-500/10 border border-brand-500/20 px-1.5 py-0.5 rounded-md leading-none">AI</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-slate-400 hover:text-slate-100 transition-colors">Features</a>
            <a href="#workflow" className="text-slate-400 hover:text-slate-100 transition-colors">Workflow</a>
            <Link to="/login" className="text-slate-400 hover:text-slate-100 transition-colors">Sign In</Link>
            <Link to="/login" className="btn-primary text-sm py-2 px-4">
              Access Dashboard <RiArrowRightLine className="h-4 w-4" />
            </Link>
          </nav>
          <Link to="/login" className="md:hidden btn-primary text-xs py-2 px-3">
            Enter <RiArrowRightLine className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <main className="flex-grow">
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-16 flex flex-col items-center text-center">
          {/* pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-brand-500/20 text-brand-300 text-xs font-semibold mb-8 animate-fade-in">
            <span className="h-2 w-2 rounded-full bg-accent-400 animate-pulse" />
            <RiShieldUserLine className="h-3.5 w-3.5" />
            AI for Better Living & Smarter Communities · Hackathon 2026
          </div>

          <h1 className="font-display font-black text-5xl md:text-7xl tracking-tight leading-[1.05] max-w-5xl animate-fade-up">
            Making Cities <br />
            <span className="text-gradient">Smarter with AI</span>
          </h1>

          <p className="text-slate-400 text-base md:text-lg max-w-2xl mt-6 leading-relaxed animate-fade-up" style={{ animationDelay: '100ms' }}>
            CivicSense AI processes vehicle imagery to automatically detect, classify, and report
            parking & civic violations. Real computer vision. Real enforcement workflows.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-10 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <Link to="/upload" className="btn-primary text-sm py-3 px-6">
              <RiCpuLine className="h-4 w-4 animate-pulse" />
              Try AI Detection Live
            </Link>
            <Link to="/login" className="btn-ghost text-sm py-3 px-6">
              Officer Login Portal
            </Link>
          </div>

          {/* stats ticker */}
          <div className="mt-16 w-full max-w-2xl glass rounded-2xl border border-white/5 flex flex-wrap justify-center divide-x divide-white/5 animate-fade-up" style={{ animationDelay: '300ms' }}>
            <Stat value="YOLOv8" label="Object Detection Model" />
            <Stat value="EasyOCR" label="Plate Recognition" />
            <Stat value="7+" label="Violation Categories" />
            <Stat value="0 Fines" label="Auto-Issued (Human in loop)" />
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl text-slate-100">Platform Capabilities</h2>
            <p className="text-slate-500 text-sm mt-2">End-to-end AI pipeline from image upload to enforcement action</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {features.map(f => <Feature key={f.title} {...f} />)}
          </div>
        </section>

        {/* ── WORKFLOW SECTION ── */}
        <section id="workflow" className="max-w-7xl mx-auto px-6 py-16">
          <div className="card-glow rounded-3xl p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold mb-6">
                  <RiCheckboxCircleLine className="h-4 w-4" /> Complete Pipeline
                </div>
                <h2 className="font-display font-bold text-3xl text-slate-100 leading-snug mb-4">
                  From Photo to <br /><span className="text-gradient">Enforcement Action</span>
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  A fully traceable, human-supervised AI workflow. Citizens report violations, 
                  the AI pipeline analyses the evidence, and authority officers make final decisions—
                  no automatic penalties.
                </p>
              </div>
              <div className="flex flex-col gap-4 relative">
                {/* connector line */}
                <div className="absolute left-3.5 top-7 bottom-7 w-px bg-gradient-to-b from-brand-600/40 to-transparent" />
                {steps.map((s, i) => <Step key={i} n={i + 1} label={s.label} sub={s.sub} active={true} />)}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="font-display font-bold text-3xl text-slate-100 mb-4">
            Ready to Explore?
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            Sign in with a demo account to experience the full AI enforcement workflow.
          </p>
          <Link to="/login" className="btn-primary text-sm py-3 px-8 inline-flex">
            <RiArrowRightLine className="h-4 w-4" /> Access the Platform
          </Link>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-slate-600 text-xs gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center">
              <span className="font-display font-black text-white text-[10px]">C</span>
            </div>
            <span>© 2026 CivicSense AI · Hackathon Submission</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Terms of Use</a>
            <a href="#features" className="hover:text-slate-400 transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
