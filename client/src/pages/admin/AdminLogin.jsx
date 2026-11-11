import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Plane, AlertTriangle, Lock, User, Flame, Compass } from 'lucide-react';
import axios from 'axios';
import { ADMIN_ENDPOINTS } from '../../services/api';
import ThemeToggle from '../../components/ThemeToggle';

export default function AdminLogin({ token, setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'takeoff' | 'crash'
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(window.location.search);
  const isExpired = searchParams.get('expired') === '1';

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
      const res = await axios.post(ADMIN_ENDPOINTS.LOGIN, { username, password });
      
      // 1. Trigger Cinematic Takeoff state (Slow roll -> Pitch up -> Exponential acceleration)
      setStatus('takeoff');
      
      // 2. Commit session tokens when flight path crosses upper horizon (2.4s)
      setTimeout(() => {
        setToken(res.data.token);
        navigate('/admin/dashboard');
      }, 2400);
    } catch (err) {
      // 3. Trigger High-Fidelity Crash sequence with violent impact & comic explosion
      setStatus('crash');
      setTimeout(() => {
        setErrorMsg(err.response?.data?.error || 'Authentication Failed: Invalid Email or Password');
        setStatus('idle');
      }, 2500);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans antialiased selection:bg-blue-100 selection:text-blue-800 dark:selection:bg-blue-900 dark:selection:text-blue-200 transition-colors duration-300">
      
      {/* ==========================================
         TOP CORNER FLOATING THEME TOGGLE
         ========================================== */}
      <div className="absolute top-6 right-6 z-30">
        <ThemeToggle showLabel={true} />
      </div>

      {/* ==========================================
         BACKGROUND RADAR GRID & AMBIENT GLOW
         ========================================== */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-70 transition-colors" />
      <div className="absolute top-1/4 left-1/4 w-[520px] h-[520px] bg-blue-100/40 dark:bg-blue-900/15 rounded-full blur-[90px] pointer-events-none animate-radar-sweep" />

      {/* ==========================================
         CINEMATIC TAKEOFF SEQUENCE OVERLAY
         Phase 1: Slow Runway Roll (0-28%)
         Phase 2: Nose Pitch Up & Wheel Lift (28-45%)
         Phase 3: High-Speed Ascent & Rocket Climb (45-100%)
         ========================================== */}
      {status === 'takeoff' && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md pointer-events-none flex items-center justify-center overflow-hidden">
          
          {/* Ground Runway Strip */}
          <div className="absolute bottom-[28%] left-0 right-0 h-1 bg-slate-700/80 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <div className="w-full h-full flex justify-around">
              {[...Array(12)].map((_, i) => (
                <span key={i} className="w-8 h-1 bg-amber-400/80 rounded-full" />
              ))}
            </div>
          </div>

          {/* Runway Approach Lights */}
          <div className="absolute bottom-[29%] left-8 flex items-center gap-2 font-mono text-[10px] text-emerald-400 tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>RWY 09R • ACTIVE CLIMB</span>
          </div>

          {/* Aircraft with Jet Contrail */}
          <div className="absolute animate-takeoff-cinematic flex items-center">
            {/* Supersonic Thrust Cone */}
            <div className="w-16 h-2 bg-gradient-to-r from-transparent via-amber-400 to-blue-500 rounded-full blur-[2px] -translate-x-2 animate-thrust opacity-80" />
            
            {/* Aircraft Body */}
            <div className="relative text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]">
              <Plane size={110} className="fill-blue-500/20 stroke-[1.8]" />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full blur-[3px]" />
            </div>
          </div>

          {/* Cockpit Ascent HUD */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 text-center font-mono">
            <div className="text-xs uppercase tracking-[0.3em] text-blue-400 font-bold mb-1 flex items-center justify-center gap-2">
              <Compass size={14} className="animate-spin" />
              <span>CLEARED FOR TAKEOFF • RUNWAY 09R</span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">
              Status: Airborne &bull; Ascent: Normal &bull; Flight: Active
            </p>
          </div>
        </div>
      )}

      {/* ==========================================
         CINEMATIC CRASH & COMIC EXPLOSION OVERLAY
         Phase 1: Engine Stall & Wobble (0-20%)
         Phase 2: Terminal Nose Dive (20-48%)
         Phase 3: Impact Ground Zero & Fiery Shockwave (48-100%)
         ========================================== */}
      {status === 'crash' && (
        <div className="fixed inset-0 z-50 bg-red-950/85 backdrop-blur-md pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="relative w-96 h-96 flex flex-col items-center justify-center">
            
            {/* Ground Impact Runway Horizon Line */}
            <div className="absolute bottom-24 w-80 h-1.5 bg-red-500 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.8)]" />

            {/* Height Rail Constraints */}
            <div className="absolute left-8 top-4 bottom-24 w-0.5 bg-red-500/20 dashed" />
            <div className="absolute right-8 top-4 bottom-24 w-0.5 bg-red-500/20 dashed" />

            {/* Nose-Diving Aircraft */}
            <div className="absolute top-0 inset-x-0 bottom-24 flex items-center justify-center">
              <div className="animate-plane-stall-dive text-red-500 absolute drop-shadow-[0_0_15px_rgba(239,68,68,0.9)]">
                <Plane size={74} className="fill-red-500/20 stroke-[1.8]" />
              </div>
            </div>

            {/* Impact Shockwave Ring */}
            <div className="absolute bottom-20 w-16 h-16 border-4 border-red-500 rounded-full animate-impact-shockwave" />

            {/* Flying Debris Shards */}
            <div className="absolute bottom-20 flex items-center justify-center">
              <span className="w-2.5 h-2.5 bg-red-600 rounded-xs animate-debris" style={{ '--tx': '-60px', '--ty': '-70px' }} />
              <span className="w-2 h-2 bg-orange-500 rounded-xs animate-debris" style={{ '--tx': '70px', '--ty': '-65px' }} />
              <span className="w-3 h-1.5 bg-amber-400 rounded-xs animate-debris" style={{ '--tx': '-45px', '--ty': '-40px' }} />
              <span className="w-2 h-3 bg-red-700 rounded-xs animate-debris" style={{ '--tx': '55px', '--ty': '-85px' }} />
              <span className="w-1.5 h-1.5 bg-yellow-300 rounded-xs animate-debris" style={{ '--tx': '-15px', '--ty': '-95px' }} />
            </div>

            {/* Crisp Polygon Starburst Comic Explosion */}
            <div className="absolute bottom-10 flex items-center justify-center">
              <svg 
                viewBox="0 0 120 120" 
                className="w-64 h-64 origin-bottom transform-gpu drop-shadow-[0_0_25px_rgba(239,68,68,0.9)]"
                shapeRendering="geometricPrecision"
              >
                {/* Outer Red Spiky Fire Ring */}
                <path 
                  className="fill-red-600 animate-explosion-outer origin-bottom"
                  d="M 60 8 L 73 40 L 108 22 L 87 54 L 118 72 L 84 86 L 96 118 L 60 102 L 24 118 L 36 86 L 2 72 L 33 54 L 12 22 L 47 40 Z" 
                />
                {/* Mid Orange Burst */}
                <path 
                  className="fill-orange-500 animate-explosion-core origin-bottom"
                  d="M 60 20 L 71 44 L 99 28 L 83 55 L 110 72 L 80 83 L 92 110 L 60 96 L 28 110 L 40 83 L 10 72 L 37 55 L 21 28 L 49 44 Z" 
                />
                {/* Core White-Hot Yellow Flash */}
                <path 
                  className="fill-yellow-300 animate-explosion-core origin-bottom"
                  d="M 60 32 L 68 48 L 86 38 L 76 57 L 94 72 L 75 79 L 81 96 L 60 86 L 39 96 L 45 79 L 26 72 L 44 57 L 34 38 L 52 48 Z" 
                />
              </svg>
            </div>

            {/* Alarm Status Banner */}
            <div className="absolute bottom-4 text-center font-mono text-[11px] font-bold text-red-400 tracking-widest uppercase flex items-center gap-1.5">
              <Flame size={14} className="text-red-500 animate-bounce" />
              <span>LOGIN FAILED • INVALID CREDENTIALS</span>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
         GLASSMORPHIC ROOT OPERATIONS PANEL
         Fully dark-mode and light-mode compliant
         ========================================== */}
      <div className={`relative z-10 w-full max-w-md p-10 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 ${
        status === 'crash' ? 'animate-shake-heavy border-red-500 dark:border-red-500' : ''
      }`}>
        
        {/* Cockpit Emblem Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 rounded-xl mb-3.5 text-slate-800 dark:text-blue-400 shadow-sm">
            <ShieldCheck size={26} strokeWidth={2} />
          </div>
          <h2 className="text-lg font-black tracking-[0.3em] text-slate-900 dark:text-white uppercase text-center">
            HORIZON<span className="text-blue-600 dark:text-blue-400">-</span>X
          </h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-widest mt-1 uppercase">
            Admin Panel
          </p>
        </div>
        
        {/* Session Expired Notice Banner */}
        {isExpired && !errorMsg && (
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/70 text-amber-800 dark:text-amber-300 p-4 rounded-xl mb-6 text-xs font-mono tracking-wide shadow-sm animate-fadeIn">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Your operations session has expired. Please sign in again to access the operations cockpit.</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/60 border border-red-100 dark:border-red-900/70 text-red-700 dark:text-red-300 p-4 rounded-xl mb-6 text-xs font-mono tracking-wide shadow-sm animate-fadeIn">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        
        {/* Authentication Form */}
        <form onSubmit={handleSignIn} className="space-y-5">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2 font-bold">
              Email Address
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 pl-11 pr-4 py-3 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-950 focus:ring-4 focus:ring-blue-500/10 transition font-mono" 
                placeholder="admin@horizonx.com"
                required 
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-bold">
                Password
              </label>
              <button
                type="button"
                onClick={() => navigate('/admin/forgot-password')}
                className="text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 pl-11 pr-4 py-3 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-950 focus:ring-4 focus:ring-blue-500/10 transition font-mono" 
                placeholder="••••••••"
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={status !== 'idle'} 
            className="w-full mt-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-[0.15em] shadow-md hover:shadow-lg disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Enter Cockpit</span>
            <Plane size={13} className="rotate-0 translate-y-[-0.5px]" />
          </button>
        </form>
      </div>

      {/* ==========================================
         COMPACT SLEEK FOOTER
         ========================================== */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 py-2.5 px-6 bg-white/95 dark:bg-slate-950/85 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#005cab] dark:text-blue-400">
              Horizon<span className="text-blue-500">-X</span>
            </span>
            <span>© 2026 Horizon-X Ground Control. All rights reserved.</span>
          </div>
          <div className="flex gap-4 sm:gap-6">
            <a href="#" className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">Operations Manual</a>
            <a href="#" className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">Security Policy</a>
            <a href="#" className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
