import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Plane, AlertTriangle, Lock, User } from 'lucide-react';
import axios from 'axios';

export default function AdminLogin({ token, setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'takeoff' | 'crash'
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  // Route Guard: Prevent access to login screen if session is already active
  useEffect(() => {
    if (token && status === 'idle') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [token, navigate, status]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (status !== 'idle') return;
    setErrorMsg('');
    
    try {
      const res = await axios.post('http://localhost:5000/api/admin/login', { username, password });
      
      // 1. Trigger Takeoff state to play the visual flyby first
      setStatus('takeoff');
      
      // 2. Commit session tokens ONLY when the flight path clears the viewport
      setTimeout(() => {
        setToken(res.data.token);
        navigate('/admin/dashboard');
      }, 1600); // Matches the vectorTakeoff CSS timeline duration (1.6s)
    } catch (err) {
      // 3. Trigger Crash state and rattle UI
      setStatus('crash');
      setTimeout(() => {
        setErrorMsg(err.response?.data?.error || 'Authentication Refused: Invalid Master Credentials');
        setStatus('idle');
      }, 2200); // Matches full crash sequence execution loop
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 font-sans antialiased selection:bg-blue-100 selection:text-blue-800">
      
      {/* Background Matrix Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[80px] pointer-events-none animate-radar-sweep" />

      {/* ==========================================
         CRISP FULL-SCREEN TAKEOFF OVERLAY
         ========================================== */}
      {status === 'takeoff' && (
        <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="animate-vector-takeoff text-blue-600">
            <Plane size={140} className="rotate-[45deg] fill-blue-500/10 stroke-[1.5]" />
          </div>
        </div>
      )}

      {/* ==========================================
         HIGH-FIDELITY VECTOR CRASH SEQUENCE OVERLAY
         ========================================== */}
      {status === 'crash' && (
        <div className="absolute inset-0 z-50 bg-red-50/90 backdrop-blur-sm pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="relative w-96 h-96 flex flex-col items-center justify-center">
            
            {/* Height Rail Constraints */}
            <div className="absolute left-12 top-0 bottom-24 w-1 bg-red-600/15 rounded-full" />
            <div className="absolute right-12 top-0 bottom-24 w-1 bg-red-600/15 rounded-full" />
            
            {/* Impact Horizon Runway Line */}
            <div className="absolute bottom-24 w-72 h-1 bg-red-600 rounded-full" />

            {/* Nose-Diving Aircraft */}
            <div className="absolute top-0 inset-x-0 bottom-24 flex items-center justify-center">
              <div className="animate-plane-fall text-red-600 absolute">
                <Plane size={80} className="rotate-180 fill-red-500/10 stroke-[1.5]" />
              </div>
            </div>

            {/* Layered Cartoon Exploding Stars (Zero blur/fuzz filters) */}
            <div className="absolute bottom-12 flex items-center justify-center">
              <svg 
                viewBox="0 0 120 120" 
                className="w-56 h-56 origin-bottom transform-gpu"
                shapeRendering="geometricPrecision"
              >
                {/* Outer Red Spiky Ring */}
                <path 
                  className="fill-red-600 animate-explosion-outer origin-bottom"
                  d="M 60 10 L 72 42 L 105 25 L 85 55 L 115 72 L 82 85 L 95 115 L 60 100 L 25 115 L 38 85 L 5 72 L 35 55 L 15 25 L 48 42 Z" 
                />
                {/* Inner Orange Core */}
                <path 
                  className="fill-orange-500 animate-explosion-core origin-bottom"
                  d="M 60 22 L 70 45 L 98 30 L 82 56 L 108 72 L 79 82 L 90 108 L 60 95 L 30 108 L 41 82 L 12 72 L 38 56 L 22 30 L 50 45 Z" 
                />
                {/* Core Yellow Core */}
                <path 
                  className="fill-yellow-400 animate-explosion-core origin-bottom"
                  d="M 60 35 L 67 50 L 85 40 L 75 58 L 92 72 L 74 78 L 80 95 L 60 85 L 40 95 L 46 78 L 28 72 L 45 58 L 35 40 L 53 50 Z" 
                />
              </svg>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
         GLASSMORPHIC ROOT OPERATIONS PANEL
         ========================================== */}
      <div className={`relative z-10 w-full max-w-md p-10 bg-white border border-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all duration-300 ${status === 'crash' ? 'animate-shake border-red-400' : ''}`}>
        
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl mb-3.5 text-slate-800 shadow-sm">
            <ShieldCheck size={26} strokeWidth={2} />
          </div>
          <h2 className="text-lg font-black tracking-[0.3em] text-slate-900 uppercase text-center">
            HORIZON<span className="text-blue-600">-</span>X
          </h2>
          <p className="text-[10px] text-slate-400 font-mono tracking-widest mt-1 uppercase">Flight Operations Control</p>
        </div>
        
        {errorMsg && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-6 text-xs font-mono tracking-wide shadow-sm">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        
        <form onSubmit={handleSignIn} className="space-y-5">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-2 font-bold">Username</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200/80 pl-11 pr-4 py-3 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition font-mono" 
                placeholder="Enter Your Username"
                required 
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-2 font-bold">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200/80 pl-11 pr-4 py-3 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition font-mono" 
                placeholder="••••••••"
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={status !== 'idle'} 
            className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-[0.15em] shadow-md hover:shadow-lg disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Authorize Connection</span>
            <Plane size={13} className="rotate-90 translate-y-[-0.5px]" />
          </button>
        </form>
      </div>
    </div>
  );
}