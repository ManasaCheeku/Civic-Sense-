import React from 'react';
import { useAuth } from '../context/AuthContext';
import { RiUserSettingsLine, RiShieldUserLine, RiKey2Line } from 'react-icons/ri';

export const Profile = () => {
  const { user } = useAuth();

  const getRolePrivileges = (role) => {
    switch (role) {
      case 'Admin':
        return [
          'Full read & write access to system dockets',
          'Manage municipal officer registrations & permissions',
          'Modify AI rule thresholds and restricted GPS coordinates',
          'Generate and sign final compliance PDF dossiers'
        ];
      case 'Authority':
        return [
          'Read access to all reported compliance issues',
          'Approve, Reject, or Dismiss pending violation reports',
          'Generate signed compliance PDF dossiers with recommended action',
          'Inspect smart city GIS coordinates mapping system'
        ];
      default:
        return [
          'Upload incident images for YOLOv8/EasyOCR processing',
          'Read draft PDF reports for citizen-reported infractions',
          'Inspect personal violation upload logs and history',
          'Locate compliance pinpoints on interactive maps'
        ];
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-100">Account Profile</h1>
        <p className="text-slate-400 text-xs mt-0.5">Manage session preferences, credentials, and check role permissions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: User details card */}
        <div className="glass rounded-3xl border border-slate-800 p-6 text-center space-y-4 flex flex-col items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-brand-400">
            <RiUserSettingsLine className="h-10 w-10" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-200">{user?.name}</h2>
            <p className="text-slate-500 text-xs mt-0.5">{user?.email}</p>
          </div>
          <span className="inline-block bg-brand-500/10 text-brand-400 border border-brand-500/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            {user?.role}
          </span>
        </div>

        {/* Right Column: Privilege Settings and Mock Actions (Column span 2) */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Privilege details */}
          <div className="glass rounded-3xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <RiShieldUserLine className="h-5 w-5 text-brand-400" />
              <h3 className="font-display font-bold text-sm text-slate-200">Role Capabilities</h3>
            </div>
            
            <ul className="space-y-3 text-xs text-slate-400">
              {getRolePrivileges(user?.role).map((priv, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5"></span>
                  <span>{priv}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Security details (Mock actions) */}
          <div className="glass rounded-3xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <RiKey2Line className="h-5 w-5 text-brand-400" />
              <h3 className="font-display font-bold text-sm text-slate-200">Security Credentials</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Session Token Type</label>
                <span className="font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-300">
                  JSON Web Token (JWT - Bearer)
                </span>
              </div>
              
              <div className="pt-2">
                <button
                  onClick={() => alert("Password changes are restricted for default hackathon credentials.")}
                  className="bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 font-bold py-2 px-4 rounded-xl transition-all cursor-pointer"
                >
                  Change Account Password
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Profile;
