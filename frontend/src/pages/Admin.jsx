import React, { useState } from 'react';
import { RiShieldKeyholeLine, RiMapPinRangeLine, RiAddLine, RiDeleteBin6Line } from 'react-icons/ri';

export const Admin = () => {
  // Local state for configuration rules (mirrors the backend python rules)
  const [zones, setZones] = useState([
    {
      id: 1,
      name: "St. Jude Hospital - Emergency Access Area",
      latitude: 40.73061,
      longitude: -73.93524,
      radius_meters: 50.0,
      violation_type: "Hospital Emergency Entrance"
    },
    {
      id: 2,
      name: "Metro High School - Student drop-off zone",
      latitude: 40.73161,
      longitude: -73.93624,
      radius_meters: 30.0,
      violation_type: "School / College Entrance"
    },
    {
      id: 3,
      name: "Downtown Boulevard - Official No-Parking Segment",
      latitude: 40.72961,
      longitude: -73.93424,
      radius_meters: 40.0,
      violation_type: "No Parking Zone"
    }
  ]);

  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState(30);
  const [violationType, setViolationType] = useState('No Parking Zone');

  const handleAddZone = (e) => {
    e.preventDefault();
    if (!name || !lat || !lng) {
      alert("Please fill in name, latitude and longitude.");
      return;
    }
    
    const newZone = {
      id: Date.now(),
      name,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      radius_meters: parseFloat(radius),
      violation_type: violationType
    };
    
    setZones(prev => [...prev, newZone]);
    setName('');
    setLat('');
    setLng('');
    alert("New geo-fence zoning rule created successfully! (Simulated locally for MVP)");
  };

  const handleDeleteZone = (id) => {
    setZones(prev => prev.filter(z => z.id !== id));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-100">Municipal Control Panel</h1>
        <p className="text-slate-400 text-xs mt-0.5">Configure compliance criteria, manage geofenced zones, and override AI settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Columns: Zones List (Column span 2) */}
        <div className="lg:col-span-2 glass rounded-3xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <RiMapPinRangeLine className="h-5 w-5 text-brand-400" />
            <h3 className="font-display font-bold text-sm text-slate-200">Active Geofenced Violation Zones</h3>
          </div>

          <div className="space-y-3">
            {zones.map((z) => (
              <div 
                key={z.id} 
                className="flex items-start justify-between bg-slate-900/40 border border-slate-800 p-4 rounded-2xl text-xs hover:border-slate-700/60 transition-all"
              >
                <div className="space-y-1">
                  <div className="font-bold text-slate-200">{z.name}</div>
                  <div className="text-slate-400">Class: <span className="text-rose-400 font-bold">{z.violation_type}</span></div>
                  <div className="text-slate-500 font-mono">
                    GPS: {z.latitude.toFixed(5)}, {z.longitude.toFixed(5)} | Radius: {z.radius_meters}m
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteZone(z.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition-all"
                  title="Remove Rule"
                >
                  <RiDeleteBin6Line className="h-4.5 w-4.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Add Zone Form */}
        <div className="glass rounded-3xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <RiShieldKeyholeLine className="h-5 w-5 text-brand-400" />
            <h3 className="font-display font-bold text-sm text-slate-200">Create New Zoning Rule</h3>
          </div>

          <form onSubmit={handleAddZone} className="space-y-3.5 text-xs">
            
            <div>
              <label className="block text-slate-400 mb-1">Zone Name / Description</label>
              <input
                type="text"
                placeholder="e.g. St. Luke School Main Entrance"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 40.73"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. -73.93"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Radius (meters)</label>
                <input
                  type="number"
                  placeholder="e.g. 30"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Zoning Infraction</label>
                <select
                  value={violationType}
                  onChange={(e) => setViolationType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-2 text-slate-200 focus:outline-none"
                >
                  <option value="No Parking Zone">No Parking Zone</option>
                  <option value="Hospital Emergency Entrance">Hospital Emergency Entrance</option>
                  <option value="School / College Entrance">School / College Entrance</option>
                  <option value="Footpath Parking">Footpath Parking</option>
                  <option value="Blocking Residential Gate">Blocking Residential Gate</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-brand-500/10 cursor-pointer mt-4"
            >
              <RiAddLine className="h-4.5 w-4.5" />
              <span>Create Rule</span>
            </button>

          </form>
        </div>

      </div>

    </div>
  );
};

export default Admin;
