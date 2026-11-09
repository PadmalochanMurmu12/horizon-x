import React, { useState, useEffect } from 'react';
import { MapPin, Users, Plane, LogOut, LayoutGrid, Radio, CheckCircle, Ticket } from 'lucide-react';
import axios from 'axios';
import { ADMIN_ENDPOINTS } from '../../services/api';
import ThemeToggle from '../../components/ThemeToggle';

export default function AdminDashboard({ token, setToken }) {
  const [metrics, setMetrics] = useState({ cities: 0, flights: 0, users: 0, bookings: 0 });
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [completePnrInput, setCompletePnrInput] = useState('');
  const [actionMessage, setActionMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const config = { headers: { Authorization: token } };
      const [citiesRes, flightsRes, usersRes, bookingsRes] = await Promise.all([
        axios.get(ADMIN_ENDPOINTS.CITIES, config),
        axios.get(ADMIN_ENDPOINTS.FLIGHTS, config),
        axios.get(ADMIN_ENDPOINTS.USERS, config),
        axios.get(ADMIN_ENDPOINTS.BOOKINGS, config).catch(() => ({ data: { data: [] } }))
      ]);
      
      const bookingsList = bookingsRes.data?.data || [];
      setBookings(bookingsList);
      setMetrics({
        cities: citiesRes.data.length,
        flights: flightsRes.data.length,
        users: usersRes.data.length,
        bookings: bookingsList.length
      });
    } catch (err) {
      console.error("Operations telemetry sync failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const handleMarkComplete = async (pnr) => {
    const targetPnr = (pnr || completePnrInput).trim().toUpperCase();
    if (!targetPnr) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      const config = { headers: { Authorization: token } };
      const res = await axios.put(ADMIN_ENDPOINTS.COMPLETE_BOOKING(targetPnr), {}, config);
      setActionMessage({ type: 'success', text: res.data.message || `PNR ${targetPnr} marked as COMPLETED!` });
      setCompletePnrInput('');
      await fetchDashboardData();
    } catch (err) {
      setActionMessage({ 
        type: 'error', 
        text: err.response?.data?.error || err.message || 'Failed to complete booking.' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 flex flex-col gap-3 items-center justify-center font-mono text-xs uppercase tracking-[0.2em] transition-colors duration-300">
        <span className="w-5 h-5 border-2 border-slate-900 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
        Synchronizing Hub Matrix Systems...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex font-sans antialiased transition-colors duration-300">
      
      {/* ==========================================
         EXECUTIVE NAVIGATION SIDEBAR
         ========================================== */}
      <aside className="w-68 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between shrink-0 transition-colors duration-300">
        <div className="space-y-8">
          <div className="flex items-center gap-2.5 px-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
            <span className="text-sm font-black tracking-[0.2em] text-slate-900 dark:text-white uppercase">HORIZON-X</span>
          </div>
          
          <nav className="space-y-1">
            <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-slate-400 dark:text-slate-400 px-3 mb-2.5 block font-bold">Network Architecture</div>
            
            <a href="#dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-blue-600 dark:text-white text-xs font-semibold tracking-wide transition shadow-sm">
              <LayoutGrid size={15} />
              <span>Dashboard</span>
            </a>
            
            <a href="#cities" className="flex justify-between items-center px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70 text-xs font-medium tracking-wide transition group">
              <div className="flex items-center gap-3">
                <MapPin size={15} className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" />
                <span>Operational Hubs</span>
              </div>
              <span className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10px] font-mono border border-slate-200/60 dark:border-slate-700 font-bold transition">{metrics.cities}</span>
            </a>

            <a href="#users" className="flex justify-between items-center px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70 text-xs font-medium tracking-wide transition group">
              <div className="flex items-center gap-3">
                <Users size={15} className="text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" />
                <span>Active Users</span>
              </div>
              <span className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10px] font-mono border border-slate-200/60 dark:border-slate-700 font-bold transition">{metrics.users}</span>
            </a>

            <a href="#flights" className="flex justify-between items-center px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70 text-xs font-medium tracking-wide transition group">
              <div className="flex items-center gap-3">
                <Plane size={15} className="text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition rotate-45" />
                <span>Active Airline Services</span>
              </div>
              <span className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10px] font-mono border border-slate-200/60 dark:border-slate-700 font-bold transition">{metrics.flights}</span>
            </a>
          </nav>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => setToken(null)} 
            className="w-full bg-slate-50 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-red-200 dark:hover:border-red-800 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 p-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition duration-200 cursor-pointer shadow-sm"
          >
            <LogOut size={13} />
            <span>Exit Cockpit</span>
          </button>
        </div>
      </aside>

      {/* ==========================================
         MAIN METRICS DESK AREA
         ========================================== */}
      <main className="flex-1 p-10 relative overflow-y-auto">
        
        {/* Cockpit Executive Header Bar with Theme Toggle */}
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-6 mb-8 transition-colors">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Welcome back, Admin!</h2>
            <p className="text-slate-400 dark:text-slate-400 text-sm mt-1 font-mono uppercase tracking-wider flex items-center gap-2">
              <Radio size={12} className="text-emerald-500 animate-pulse" />
              Operational Status : Normal
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle showLabel={true} />
          </div>
        </div>

        {/* Dynamic High-Contrast Clean Grid Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card Module: Cities */}
          <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-slate-400 dark:text-slate-400 text-[10px] font-mono uppercase tracking-widest font-bold">Operational Cities</h3>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 rounded-xl group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500 transition-all duration-300">
                <MapPin size={16} />
              </div>
            </div>
            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.cities}</p>
          </div>

          {/* Card Module: Flights */}
          <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-slate-400 dark:text-slate-400 text-[10px] font-mono uppercase tracking-widest font-bold">Operational Flights</h3>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60 rounded-xl group-hover:bg-amber-600 group-hover:text-white dark:group-hover:bg-amber-500 transition-all duration-300">
                <Plane size={16} className="rotate-45" />
              </div>
            </div>
            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.flights}</p>
          </div>

          {/* Card Module: Users */}
          <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-slate-400 dark:text-slate-400 text-[10px] font-mono uppercase tracking-widest font-bold">Active Users</h3>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 rounded-xl group-hover:bg-emerald-600 group-hover:text-white dark:group-hover:bg-emerald-500 transition-all duration-300">
                <Users size={16} />
              </div>
            </div>
            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.users}</p>
          </div>

        </div>

        {/* Flight Operations & Booking Journey Manifest */}
        <div className="mt-10 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Ticket size={18} className="text-blue-600 dark:text-blue-400" />
                Flight Operations & Journey Manifest
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ground Control desk: Manually mark flights and bookings as COMPLETED upon flight arrival.
              </p>
            </div>

            {/* Quick Complete by PNR Form */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleMarkComplete(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Enter PNR (e.g. 6N8R3E)"
                value={completePnrInput}
                onChange={(e) => setCompletePnrInput(e.target.value.toUpperCase())}
                className="px-3 py-2 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 uppercase tracking-wider"
              />
              <button
                type="submit"
                disabled={actionLoading || !completePnrInput.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition duration-200 shadow-sm flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <CheckCircle size={14} />
                <span>Mark Completed</span>
              </button>
            </form>
          </div>

          {actionMessage && (
            <div className={`mb-6 p-4 rounded-xl text-xs font-medium border flex items-center justify-between ${
              actionMessage.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800' 
                : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
            }`}>
              <span>{actionMessage.text}</span>
              <button onClick={() => setActionMessage(null)} className="text-xs opacity-60 hover:opacity-100 underline ml-4">Dismiss</button>
            </div>
          )}

          {/* Bookings Manifest Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">PNR</th>
                  <th className="pb-3 font-semibold">Route & Date</th>
                  <th className="pb-3 font-semibold">Passenger(s)</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Check-In</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Ground Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-400 font-mono">
                      No active bookings or manifests loaded.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id || b.pnr} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 font-mono font-bold text-slate-900 dark:text-white tracking-wider">
                        {b.pnr}
                      </td>
                      <td className="py-3.5 text-slate-700 dark:text-slate-200">
                        <span className="font-semibold">{b.origin} → {b.destination}</span>
                        <span className="block text-[11px] text-slate-400 dark:text-slate-400">{b.travelDate}</span>
                      </td>
                      <td className="py-3.5 text-slate-600 dark:text-slate-300">
                        {b.passengers && b.passengers.length > 0 ? (
                          <span>{b.passengers[0].firstName} {b.passengers[0].lastName} {b.passengers.length > 1 ? `(+${b.passengers.length - 1})` : ''}</span>
                        ) : (
                          b.contactEmail || 'Guest'
                        )}
                      </td>
                      <td className="py-3.5 font-mono text-slate-800 dark:text-slate-100 font-semibold">
                        {b.currency || 'INR'} {b.totalAmount?.toLocaleString?.() || b.totalAmount}
                      </td>
                      <td className="py-3.5">
                        {b.isCheckedIn ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Checked-In
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-400 text-[11px]">Pending</span>
                        )}
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                          b.status === 'COMPLETED'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            : b.status === 'CONFIRMED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-50 dark:bg-red-950/70 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        {b.status === 'CONFIRMED' ? (
                          <button
                            onClick={() => handleMarkComplete(b.pnr)}
                            disabled={actionLoading}
                            className="px-3 py-1 bg-slate-900 hover:bg-emerald-600 dark:bg-blue-600 dark:hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold transition duration-150 shadow-xs cursor-pointer"
                          >
                            Mark Completed
                          </button>
                        ) : b.status === 'COMPLETED' ? (
                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400 italic">Journey Ended</span>
                        ) : (
                          <span className="text-[11px] font-mono text-red-400 dark:text-red-400 italic">Cancelled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
