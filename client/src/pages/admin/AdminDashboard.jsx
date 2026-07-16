import React, { useState, useEffect } from 'react';
import { MapPin, Users, Plane, LogOut, LayoutGrid, Radio } from 'lucide-react';
import axios from 'axios';

export default function AdminDashboard({ token, setToken }) {
  const [metrics, setMetrics] = useState({ cities: 0, flights: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchMetrics = async () => {
      try {
        const config = { headers: { Authorization: token } };
        const [citiesRes, flightsRes, usersRes] = await Promise.all([
          axios.get('http://localhost:5000/api/cities', config),
          axios.get('http://localhost:5000/api/flights', config),
          axios.get('http://localhost:5000/api/users', config)
        ]);
        
        if (isMounted) {
          setMetrics({
            cities: citiesRes.data.length,
            flights: flightsRes.data.length,
            users: usersRes.data.length
          });
        }
      } catch (err) {
        console.error("Operations telemetry sync failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMetrics();
    return () => { isMounted = false; };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-500 flex flex-col gap-3 items-center justify-center font-mono text-xs uppercase tracking-[0.2em]">
        <span className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        Synchronizing Hub Matrix Systems...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans antialiased">
      
      {/* ==========================================
         EXECUTIVE NAVIGATION SIDEBAR (LIGHT)
         ========================================== */}
      <aside className="w-68 bg-white border-r border-slate-200/80 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-2.5 px-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
            <span className="text-sm font-black tracking-[0.2em] text-slate-900 uppercase">HORIZON-X</span>
            {/* <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-bold uppercase tracking-wider ml-auto">Core</span> */}
          </div>
          
          <nav className="space-y-1">
            <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-slate-400 px-3 mb-2.5 block font-bold">Network Architecture</div>
            
            <a href="#dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold tracking-wide transition shadow-sm">
              <LayoutGrid size={15} />
              <span>Dashboard</span>
            </a>
            
            <a href="#cities" className="flex justify-between items-center px-3 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 text-xs font-medium tracking-wide transition group">
              <div className="flex items-center gap-3">
                <MapPin size={15} className="text-slate-400 group-hover:text-blue-600 transition" />
                <span>Operational Hubs</span>
              </div>
              <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-mono border border-slate-200/60 font-bold transition">{metrics.cities}</span>
            </a>

            <a href="#users" className="flex justify-between items-center px-3 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 text-xs font-medium tracking-wide transition group">
              <div className="flex items-center gap-3">
                <Users size={15} className="text-slate-400 group-hover:text-emerald-600 transition" />
                <span>Active Users</span>
              </div>
              <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-mono border border-slate-200/60 font-bold transition">{metrics.users}</span>
            </a>

            <a href="#flights" className="flex justify-between items-center px-3 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 text-xs font-medium tracking-wide transition group">
              <div className="flex items-center gap-3">
                <Plane size={15} className="text-slate-400 group-hover:text-amber-600 transition rotate-45" />
                <span>Active Airline Services</span>
              </div>
              <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-mono border border-slate-200/60 font-bold transition">{metrics.flights}</span>
            </a>
          </nav>
        </div>

        <button 
          onClick={() => setToken(null)} 
          className="w-full bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 p-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition duration-200 cursor-pointer shadow-sm"
        >
          <LogOut size={13} />
          <span>Exit Cockpit</span>
        </button>
      </aside>

      {/* ==========================================
         MAIN METRICS DESK AREA
         ========================================== */}
      <main className="flex-1 p-10 relative overflow-y-auto">
        
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Welcome back, Admin!</h2>
            <p className="text-slate-400 text-sm mt-1 font-mono uppercase tracking-wider flex items-center gap-2">
              <Radio size={12} className="text-emerald-500 animate-pulse" />
              Operational Status : Normal
            </p>
          </div>
        </div>

        {/* Dynamic High-Contrast Clean Grid Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card Module: Cities */}
          <div className="group bg-white border border-slate-200/80 p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-300 hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-slate-400 text-[10px] font-mono uppercase tracking-widest font-bold">Operational Cities</h3>
              <div className="p-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <MapPin size={16} />
              </div>
            </div>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{metrics.cities}</p>
          </div>

          {/* Card Module: Flights */}
          <div className="group bg-white border border-slate-200/80 p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-300 hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-slate-400 text-[10px] font-mono uppercase tracking-widest font-bold">Operational Flights</h3>
              <div className="p-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                <Plane size={16} className="rotate-45" />
              </div>
            </div>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{metrics.flights}</p>
          </div>

          {/* Card Module: Users */}
          <div className="group bg-white border border-slate-200/80 p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-300 hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-slate-400 text-[10px] font-mono uppercase tracking-widest font-bold">Active Users</h3>
              <div className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <Users size={16} />
              </div>
            </div>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{metrics.users}</p>
          </div>

        </div>
      </main>
    </div>
  );
}