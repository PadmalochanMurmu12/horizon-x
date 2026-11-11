import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { USER_ENDPOINTS } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import AirlineLogo from '../components/AirlineLogo';

const AIRPORT_DIRECTORY = {
  DEL: { city: 'Delhi', airport: 'DEL, Delhi Airport India' },
  BLR: { city: 'Bengaluru', airport: 'BLR, Bengaluru International A...' },
  BOM: { city: 'Mumbai', airport: 'BOM, Chhatrapati Shivaji Maharaj Int\'l' },
  MAA: { city: 'Chennai', airport: 'MAA, Chennai International Airport' },
  CCU: { city: 'Kolkata', airport: 'CCU, Netaji Subhash Chandra Bose Int\'l' },
  HYD: { city: 'Hyderabad', airport: 'HYD, Rajiv Gandhi International Airport' }
};

// Date boundary helpers (ISO YYYY-MM-DD local timezone)
const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getMaxDateStr = () => {
  const max = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const y = max.getFullYear();
  const m = String(max.getMonth() + 1).padStart(2, '0');
  const d = String(max.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getFutureDateStr = (daysAhead = 3) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function LandingPage({ onSearch }) {
  const navigate = useNavigate();
  const todayStr = getTodayStr();
  const maxDateStr = getMaxDateStr();

  const [tripType, setTripType] = useState('ONEWAY');
  const [origin, setOrigin] = useState('DEL');
  const [destination, setDestination] = useState('BLR');
  const [departureDate, setDepartureDate] = useState(() => getFutureDateStr(3));
  const [returnDate, setReturnDate] = useState('');
  const [cabinClass, setCabinClass] = useState('ECONOMY');
  const [paxCounts, setPaxCounts] = useState({ adults: 1, children: 0, infants: 0 });
  const [isPaxOpen, setIsPaxOpen] = useState(false);
  const [airportList, setAirportList] = useState([]);
  const [airportSelector, setAirportSelector] = useState(null); // 'origin' | 'destination' | null
  const [airportFilter, setAirportFilter] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  // User auth state (Cleartrip OTP passwordless model)
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('hx_user_token') || sessionStorage.getItem('hx_user_token');
    if (!token) return null;
    try {
      const raw = localStorage.getItem('hx_user_profile') || sessionStorage.getItem('hx_user_profile');
      return raw ? JSON.parse(raw) : { firstName: 'Traveler' };
    } catch (e) {
      return { firstName: 'Traveler' };
    }
  });

  const handleSignOut = () => {
    localStorage.removeItem('hx_user_token');
    localStorage.removeItem('hx_user_profile');
    sessionStorage.removeItem('hx_user_token');
    sessionStorage.removeItem('hx_user_profile');
    setUser(null);
  };
  
  // Search Engine States
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState(null);
  const [searchResults, setSearchResults] = useState(null);

  const dropdownRef = useRef(null);
  const resultsRef = useRef(null);
  const depDateInputRef = useRef(null);
  const retDateInputRef = useRef(null);

  // Micro-interaction helper to trigger browser date picker reliably
  const triggerDatePicker = (ref) => {
    if (!ref?.current) return;
    try {
      if (typeof ref.current.showPicker === 'function') {
        ref.current.showPicker();
      } else {
        ref.current.focus();
      }
    } catch {
      ref.current.focus();
    }
  };

  // Dynamic Header Scroll Shadow & Blur
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch Operational Airports
  useEffect(() => {
    fetch(USER_ENDPOINTS.AIRPORTS)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAirportList(data);
      })
      .catch(err => console.error('Failed to load operational airports:', err));
  }, []);

  const airportDirectory = airportList.reduce((acc, a) => {
    acc[a.airportCode] = { 
      city: a.cityName, 
      airport: `${a.airportCode}, ${a.cityName} Airport (${a.stateOrUt || 'India'})` 
    };
    return acc;
  }, { ...AIRPORT_DIRECTORY });

  const filteredAirports = airportList.filter(a => {
    const q = airportFilter.toLowerCase().trim();
    if (!q) return true;
    return (
      a.airportCode?.toLowerCase().includes(q) ||
      a.cityName?.toLowerCase().includes(q) ||
      (a.stateOrUt && a.stateOrUt.toLowerCase().includes(q))
    );
  });

  // Close Travellers Dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsPaxOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwap = (e) => {
    e.stopPropagation();
    setOrigin(destination);
    setDestination(origin);
  };

  const updatePax = (type, delta) => {
    setPaxCounts(prev => {
      const current = prev[type];
      const next = current + delta;
      if (type === 'adults' && next < 1) return prev;
      if (type === 'infants' && next > prev.adults) return prev;
      if (next < 0) return prev;
      return { ...prev, [type]: next };
    });
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      if (!isNaN(d.getTime())) {
        const dayNum = d.getUTCDate();
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthYear = `${months[d.getUTCMonth()]}'${String(d.getUTCFullYear()).slice(-2)}`;
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        return { dayNum, monthYear, dayName };
      }
    }
    return null;
  };

  const depDateFormatted = formatDateDisplay(departureDate);
  const retDateFormatted = formatDateDisplay(returnDate);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (departureDate < todayStr) {
      setSearchMessage({ type: 'error', text: `Sector departure date cannot be in the past (${departureDate}). Please select today (${todayStr}) or an upcoming date.` });
      return;
    }
    if (departureDate > maxDateStr) {
      setSearchMessage({ type: 'error', text: `Sector departure date exceeds the 90-day booking limit.` });
      return;
    }
    if (tripType === 'ROUND_TRIP' && returnDate && returnDate < departureDate) {
      setSearchMessage({ type: 'error', text: 'Return date cannot be earlier than departure date.' });
      return;
    }
    const searchParams = new URLSearchParams({
      tripType,
      origin,
      destination,
      departureDate,
      cabinClass,
      adults: paxCounts.adults,
      children: paxCounts.children,
      infants: paxCounts.infants
    });
    if (tripType === 'ROUND_TRIP' && returnDate) {
      searchParams.set('returnDate', returnDate);
    }
    navigate(`/flights?${searchParams.toString()}`);
  };

  return (
    <div className="bg-[#fbf9f8] dark:bg-slate-950 text-[#1b1c1c] dark:text-slate-100 font-sans min-h-screen overflow-x-hidden selection:bg-blue-100 selection:text-blue-900 transition-colors duration-300">
      
      {/* ==========================================
         TOP NAVIGATION BAR
         Replaced Skybound with Horizon-X
         ========================================== */}
      <header className={`fixed top-0 left-0 w-full z-50 h-16 border-b transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md border-[#E6E6E6] dark:border-slate-800' 
          : 'bg-[#fbf9f8]/90 dark:bg-slate-950/90 backdrop-blur-sm border-[#E6E6E6] dark:border-slate-800/80'
      }`}>
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-full flex items-center justify-between">
          
          {/* Brand Logo & Main Nav */}
          <div className="flex items-center gap-8">
            <span 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-2xl font-bold text-[#005cab] dark:text-blue-400 tracking-tight cursor-pointer flex items-center gap-1"
            >
              Horizon<span className="text-blue-500">-X</span>
            </span>
            
            <nav className="hidden lg:flex items-center gap-6 text-[15px]">
              <Link 
                to="/flights" 
                className="text-[#005cab] dark:text-blue-400 font-bold border-b-2 border-[#005cab] dark:border-blue-400 pb-1 transition-colors duration-200"
              >
                Flights
              </Link>
              <Link 
                to="/bookings" 
                className="text-[#566476] dark:text-slate-400 hover:text-[#005cab] dark:hover:text-blue-400 font-medium transition-colors duration-200"
              >
                My Bookings
              </Link>
              <a 
                href="#deals" 
                className="text-[#566476] dark:text-slate-400 hover:text-[#005cab] dark:hover:text-blue-400 font-medium transition-colors duration-200"
              >
                Deals
              </a>
              <a 
                href="#support" 
                className="text-[#566476] dark:text-slate-400 hover:text-[#005cab] dark:hover:text-blue-400 font-medium transition-colors duration-200"
              >
                Support
              </a>
            </nav>
          </div>

          {/* Right Action Buttons with Theme Toggle (Cleartrip unified Sign In, no Create Account) */}
          <div className="flex items-center gap-3">
            <ThemeToggle showLabel={false} />
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/bookings"
                  className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:text-[#005cab] dark:hover:text-blue-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#005cab] dark:text-blue-400">airplane_ticket</span>
                  <span>My Bookings</span>
                </Link>
                <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-[#005cab]/10 dark:bg-blue-900/30 text-[#005cab] dark:text-blue-400 flex items-center justify-center text-xs font-bold border border-[#005cab]/20">
                    {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline max-w-[100px] truncate">
                    {user.firstName || 'Traveler'}
                  </span>
                  <button
                    onClick={handleSignOut}
                    title="Sign Out"
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => navigate('/signin')}
                className="bg-[#005cab] hover:bg-[#004786] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-[13px] font-semibold px-5 py-2 rounded-full hover:shadow-md transition-all active:opacity-80 active:scale-95 cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">account_circle</span>
                <span>Sign In</span>
              </button>
            )}
          </div>

        </div>
      </header>

      <main className="pt-16 min-h-screen">
        
        {/* ==========================================
           HERO SECTION WITH SCENIC BACKGROUND
           ========================================== */}
        <section className="relative h-[480px] w-full flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div 
              className="w-full h-full bg-cover bg-center transition-transform duration-[20s] hover:scale-105" 
              style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBxCHlSpCUzBLgUnPOrjldM6vz0NDoD0AVfwGB4OFWtXPakqvhsx8s_fECxcJFm8MKuqgU6xxwrNy5vg3ZfE65oc2ODRA1z03RtwPn2teJFDmtwRr-2HtQNlTPeYe6Xj8tesr2X5G3zFmbFY5YiFgPt8VhG9gvc023vDM94R7TZYxVitO4QbsWmVkH9kFoJoPUyujLpm9obom8hGCnSj6uQk7tlLnVAzR7gQfS03YSRAI9nzFW8z6ZT')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#fbf9f8] dark:to-slate-950" />
          </div>

          <div className="relative z-10 text-center px-4 -mt-10">
            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-md mb-3 tracking-tight">
              Discover Your Next Escape
            </h1>
            <p className="text-lg text-white/90 font-normal drop-shadow-sm">
              Reliable flights, seamless bookings, unforgettable journeys.
            </p>
          </div>
        </section>

        {/* ==========================================
           ITINERARY BOOKING CONTAINER
           ========================================== */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-10 -mt-32 relative z-20 pb-24">
          <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-[#E6E6E6] dark:border-slate-800 transition-colors">
            
            {/* Trip Type Tabs */}
            <div className="flex items-center justify-between border-b border-[#E6E6E6] dark:border-slate-800 px-8 py-4">
              <div className="flex items-center gap-8">
                {[
                  { key: 'ONEWAY', label: 'One Way' },
                  { key: 'ROUND_TRIP', label: 'Round Trip' },
                  { key: 'MULTI_CITY', label: 'Multi City' }
                ].map(tab => (
                  <label key={tab.key} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="trip-type" 
                      checked={tripType === tab.key}
                      onChange={() => {
                        setTripType(tab.key);
                        if (tab.key === 'ROUND_TRIP') {
                          if (!returnDate || returnDate < departureDate) {
                            const [y, m, d] = (departureDate || todayStr).split('-').map(Number);
                            const ret = new Date(y, m - 1, d);
                            ret.setDate(ret.getDate() + 3);
                            const rY = ret.getFullYear();
                            const rM = String(ret.getMonth() + 1).padStart(2, '0');
                            const rD = String(ret.getDate()).padStart(2, '0');
                            const nextRet = `${rY}-${rM}-${rD}`;
                            setReturnDate(nextRet <= maxDateStr ? nextRet : maxDateStr);
                          }
                        } else {
                          // Return is enabled only for Round Trips
                          setReturnDate('');
                        }
                      }}
                      className="w-4 h-4 text-[#005cab] dark:text-blue-500 focus:ring-[#005cab] border-[#707785] cursor-pointer"
                    />
                    <span className={`text-[14px] font-semibold transition-colors ${
                      tripType === tab.key 
                        ? 'text-[#005cab] dark:text-blue-400' 
                        : 'text-[#1b1c1c] dark:text-slate-300 group-hover:text-[#005cab] dark:group-hover:text-blue-400'
                    }`}>
                      {tab.label}
                    </span>
                  </label>
                ))}
              </div>
              <span className="text-[12px] font-medium text-[#404754] dark:text-slate-400 italic hidden md:block">
                Book International and Domestic Flights
              </span>
            </div>

            {/* Search Inputs Grid (5 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-12 w-full">
              
              {/* FROM */}
              <div 
                onClick={() => setAirportSelector('origin')}
                className="md:col-span-3 p-6 border-r border-[#E6E6E6] dark:border-slate-800 group cursor-pointer hover:bg-[#f5f3f3] dark:hover:bg-slate-800/50 transition-colors relative"
              >
                <span className="text-[12px] font-medium text-[#404754] dark:text-slate-400 block mb-1">
                  From
                </span>
                <div className="text-[24px] font-bold text-[#1b1c1c] dark:text-white leading-tight">
                  {airportDirectory[origin]?.city || origin}
                </div>
                <div className="text-[12px] text-[#404754] dark:text-slate-400 truncate mt-0.5">
                  {airportDirectory[origin]?.airport || `${origin}, Airport India`}
                </div>
                
                {/* Swap Button */}
                <button 
                  type="button"
                  onClick={handleSwap}
                  className="absolute -right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-white dark:bg-slate-800 border border-[#E6E6E6] dark:border-slate-700 rounded-full flex items-center justify-center shadow-md hover:border-[#005cab] dark:hover:border-blue-400 hover:text-[#005cab] dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 transition-all active:scale-90 cursor-pointer"
                  title="Swap Departure and Arrival Airports"
                >
                  <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                </button>
              </div>

              {/* TO */}
              <div 
                onClick={() => setAirportSelector('destination')}
                className="md:col-span-3 p-6 pl-8 border-r border-[#E6E6E6] dark:border-slate-800 group cursor-pointer hover:bg-[#f5f3f3] dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="text-[12px] font-medium text-[#404754] dark:text-slate-400 block mb-1">
                  To
                </span>
                <div className="text-[24px] font-bold text-[#1b1c1c] dark:text-white leading-tight">
                  {airportDirectory[destination]?.city || destination}
                </div>
                <div className="text-[12px] text-[#404754] dark:text-slate-400 truncate mt-0.5">
                  {airportDirectory[destination]?.airport || `${destination}, Airport India`}
                </div>
              </div>

              {/* DEPARTURE */}
              <div 
                onClick={() => triggerDatePicker(depDateInputRef)}
                className="md:col-span-2 p-6 border-r border-[#E6E6E6] dark:border-slate-800 group cursor-pointer hover:bg-[#f5f3f3] dark:hover:bg-slate-800/50 transition-colors relative select-none"
              >
                <input 
                  ref={depDateInputRef}
                  type="date" 
                  value={departureDate} 
                  min={todayStr}
                  max={maxDateStr}
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerDatePicker(depDateInputRef);
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (val < todayStr) {
                      setSearchMessage({ type: 'error', text: `Departure date cannot be in the past (${val}).` });
                      return;
                    }
                    setSearchMessage(null);
                    setDepartureDate(val);
                    if (returnDate && returnDate < val) {
                      setReturnDate(val);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10 [color-scheme:light] dark:[color-scheme:dark]"
                />
                <div className="flex items-center justify-between mb-1 pointer-events-none">
                  <span className="text-[12px] font-medium text-[#404754] dark:text-slate-400">Departure</span>
                  <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-sm">expand_more</span>
                </div>
                {depDateFormatted && (
                  <div className="pointer-events-none">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[24px] font-bold text-[#1b1c1c] dark:text-white">{depDateFormatted.dayNum}</span>
                      <span className="text-[14px] font-semibold text-[#1b1c1c] dark:text-slate-200">{depDateFormatted.monthYear}</span>
                    </div>
                    <div className="text-[12px] text-[#404754] dark:text-slate-400">{depDateFormatted.dayName}</div>
                  </div>
                )}
              </div>

              {/* RETURN (Enabled only for Round Trips - OTA / MakeMyTrip Pattern) */}
              {tripType === 'ROUND_TRIP' ? (
                <div 
                  onClick={() => triggerDatePicker(retDateInputRef)}
                  className="md:col-span-2 p-6 border-r border-[#E6E6E6] dark:border-slate-800 group cursor-pointer hover:bg-[#f5f3f3] dark:hover:bg-slate-800/50 transition-colors relative select-none"
                >
                  <input 
                    ref={retDateInputRef}
                    type="date" 
                    value={returnDate} 
                    min={departureDate || todayStr}
                    max={maxDateStr}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerDatePicker(retDateInputRef);
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      if (val < (departureDate || todayStr)) {
                        setSearchMessage({ type: 'error', text: 'Return date cannot be earlier than departure date.' });
                        return;
                      }
                      setSearchMessage(null);
                      setReturnDate(val);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                  <div className="flex items-center justify-between mb-1 pointer-events-none">
                    <span className="text-[12px] font-medium text-[#404754] dark:text-slate-400">Return</span>
                    <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-sm">expand_more</span>
                  </div>
                  {retDateFormatted && (
                    <div className="pointer-events-none">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[24px] font-bold text-[#1b1c1c] dark:text-white">{retDateFormatted.dayNum}</span>
                        <span className="text-[14px] font-semibold text-[#1b1c1c] dark:text-slate-200">{retDateFormatted.monthYear}</span>
                      </div>
                      <div className="text-[12px] text-[#404754] dark:text-slate-400">{retDateFormatted.dayName}</div>
                    </div>
                  )}
                </div>
              ) : (
                /* Disabled Return State for One Way & Multi City */
                <div 
                  className="md:col-span-2 p-6 border-r border-[#E6E6E6] dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 opacity-60 cursor-not-allowed relative select-none"
                  title={tripType === 'ONEWAY' ? "Return date is enabled only for Round Trips. Select 'Round Trip' above to enable." : "Return date is not applicable for Multi City journeys."}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">Return</span>
                    <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-sm">lock</span>
                  </div>
                  <div className="text-[15px] font-semibold text-slate-400 dark:text-slate-500 leading-snug mt-1">
                    {tripType === 'ONEWAY' ? 'Round Trip Only' : 'Not Applicable'}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {tripType === 'ONEWAY' ? "Select 'Round Trip' to add" : 'Multi-city legs use sector dates'}
                  </div>
                </div>
              )}

              {/* TRAVELLERS & CLASS */}
              <div 
                className="md:col-span-2 p-6 group cursor-pointer hover:bg-[#f5f3f3] dark:hover:bg-slate-800/50 transition-colors relative" 
                ref={dropdownRef}
              >
                <div onClick={() => setIsPaxOpen(!isPaxOpen)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium text-[#404754] dark:text-slate-400">Travellers & Class</span>
                    <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-sm">expand_more</span>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[#404754] dark:text-slate-400 text-[16px]">person</span>
                      <span className="text-[20px] font-bold text-[#1b1c1c] dark:text-white">{paxCounts.adults}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[#404754] dark:text-slate-400 text-[16px]">child_care</span>
                      <span className="text-[20px] font-bold text-[#1b1c1c] dark:text-white">{paxCounts.children}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[#404754] dark:text-slate-400 text-[16px]">mood</span>
                      <span className="text-[20px] font-bold text-[#1b1c1c] dark:text-white">{paxCounts.infants}</span>
                    </div>
                  </div>

                  <div className="text-[12px] text-[#1b1c1c] dark:text-slate-300 font-semibold truncate">
                    {cabinClass === 'PREMIUM_ECONOMY' ? 'Premium Economy' : cabinClass === 'FIRST' ? 'First Class' : cabinClass.charAt(0) + cabinClass.slice(1).toLowerCase()}
                  </div>
                </div>

                {/* Dropdown Menu Modal */}
                {isPaxOpen && (
                  <div className="absolute top-[100%] right-0 mt-2 w-80 bg-white dark:bg-slate-900 shadow-2xl rounded-xl border border-[#E6E6E6] dark:border-slate-800 z-50 p-6 animate-in fade-in zoom-in duration-200">
                    <div className="space-y-6">
                      
                      {/* Adults */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[14px] font-semibold text-[#1b1c1c] dark:text-white">Adults</div>
                          <div className="text-[12px] text-[#404754] dark:text-slate-400">12+ years</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); updatePax('adults', -1); }}
                            className="w-8 h-8 rounded-full border border-[#707785] dark:border-slate-700 flex items-center justify-center hover:bg-[#f5f3f3] dark:hover:bg-slate-800 text-[#005cab] dark:text-blue-400 font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-bold text-[#1b1c1c] dark:text-white w-4 text-center">{paxCounts.adults}</span>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); updatePax('adults', 1); }}
                            className="w-8 h-8 rounded-full border border-[#005cab] dark:border-blue-500 flex items-center justify-center bg-[#0075d7] dark:bg-blue-600 text-white hover:opacity-90 font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Children */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[14px] font-semibold text-[#1b1c1c] dark:text-white">Children</div>
                          <div className="text-[12px] text-[#404754] dark:text-slate-400">2-12 years</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); updatePax('children', -1); }}
                            className="w-8 h-8 rounded-full border border-[#707785] dark:border-slate-700 flex items-center justify-center hover:bg-[#f5f3f3] dark:hover:bg-slate-800 text-[#404754] dark:text-slate-400 font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-bold text-[#1b1c1c] dark:text-white w-4 text-center">{paxCounts.children}</span>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); updatePax('children', 1); }}
                            className="w-8 h-8 rounded-full border border-[#707785] dark:border-slate-700 flex items-center justify-center hover:bg-[#f5f3f3] dark:hover:bg-slate-800 text-[#005cab] dark:text-blue-400 font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Infants */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[14px] font-semibold text-[#1b1c1c] dark:text-white">Infants</div>
                          <div className="text-[12px] text-[#404754] dark:text-slate-400">Below 2 years</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); updatePax('infants', -1); }}
                            className="w-8 h-8 rounded-full border border-[#707785] dark:border-slate-700 flex items-center justify-center hover:bg-[#f5f3f3] dark:hover:bg-slate-800 text-[#404754] dark:text-slate-400 font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-bold text-[#1b1c1c] dark:text-white w-4 text-center">{paxCounts.infants}</span>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); updatePax('infants', 1); }}
                            className="w-8 h-8 rounded-full border border-[#707785] dark:border-slate-700 flex items-center justify-center hover:bg-[#f5f3f3] dark:hover:bg-slate-800 text-[#005cab] dark:text-blue-400 font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Cabin Class Selection */}
                      <div className="pt-4 border-t border-[#E6E6E6] dark:border-slate-800">
                        <span className="text-[12px] font-medium text-[#404754] dark:text-slate-400 block mb-3 uppercase tracking-wider">
                          Cabin Class
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { key: 'ECONOMY', label: 'Economy' },
                            { key: 'PREMIUM_ECONOMY', label: 'Premium Economy' },
                            { key: 'BUSINESS', label: 'Business' },
                            { key: 'FIRST', label: 'First Class' }
                          ].map(c => (
                            <button
                              key={c.key}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setCabinClass(c.key); }}
                              className={`text-[12px] p-2 rounded border transition-colors cursor-pointer ${
                                cabinClass === c.key
                                  ? 'border-[#005cab] dark:border-blue-500 bg-[#0075d7] dark:bg-blue-600 text-white font-bold'
                                  : 'border-[#707785] dark:border-slate-700 text-[#1b1c1c] dark:text-slate-300 hover:border-[#005cab] dark:hover:border-blue-400'
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsPaxOpen(false); }}
                        className="w-full bg-[#005cab] hover:bg-[#004786] dark:bg-blue-600 dark:hover:bg-blue-500 text-white py-3 rounded-lg text-[14px] font-semibold transition-all mt-4 cursor-pointer shadow-xs"
                      >
                        APPLY
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Search Button Area (Exactly matching prototype HTML) */}
            <div className="p-8 flex justify-center bg-white dark:bg-slate-900 border-t border-[#E6E6E6] dark:border-slate-800 rounded-b-xl">
              <button 
                type="submit" 
                disabled={searching}
                className="bg-[#005cab] hover:bg-[#004786] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-20 md:px-24 py-4 rounded-full font-bold text-[18px] hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-4 group cursor-pointer shadow-md disabled:opacity-60 tracking-wide"
              >
                {searching ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>SEARCHING...</span>
                  </>
                ) : (
                  <>
                    <span>SEARCH FLIGHTS</span>
                    <span className="material-symbols-outlined transition-transform group-hover:translate-x-2">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Search Feedback Notice */}
          {searchMessage && (
            <div className={`mt-6 p-4 rounded-xl text-sm flex items-center justify-between border animate-fadeIn ${
              searchMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                : searchMessage.type === 'info'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
                : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
            }`}>
              <span>{searchMessage.text}</span>
              <button 
                onClick={() => setSearchMessage(null)}
                className="text-xs font-semibold underline opacity-70 hover:opacity-100 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Search Results Display Section */}
          {searchResults && (
            <div ref={resultsRef} className="mt-8 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#E6E6E6] dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-[#1b1c1c] dark:text-white">
                  Available Flights ({origin} → {destination})
                </h3>
                <span className="text-xs text-[#404754] dark:text-slate-400 font-mono">
                  {departureDate} &bull; {cabinClass}
                </span>
              </div>

              {/* Direct Flights */}
              {searchResults.direct && searchResults.direct.length > 0 && (
                <div className="space-y-3">
                  {searchResults.direct.map((itinerary) => {
                    const seg = itinerary.segments?.[0] || {};
                    return (
                      <div 
                        key={itinerary.id}
                        className="p-5 bg-white dark:bg-slate-900 border border-[#E6E6E6] dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <AirlineLogo code={seg.airline?.code} name={seg.airline?.name} size={40} />
                          <div>
                            <span className="font-bold text-sm text-[#1b1c1c] dark:text-white block">
                              {seg.airline?.name || 'Horizon-X Fleet'}
                            </span>
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              {seg.flightNumber} &bull; {seg.aircraft || 'Airbus A320'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-center">
                          <div>
                            <span className="text-base font-bold text-[#1b1c1c] dark:text-white font-mono block">
                              {seg.departureTime ? new Date(seg.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM'}
                            </span>
                            <span className="text-xs font-bold text-slate-500 font-mono">{origin}</span>
                          </div>

                          <div className="flex flex-col items-center">
                            <span className="text-[11px] text-slate-400 font-mono">{itinerary.totalDuration ? `${Math.floor(itinerary.totalDuration / 60)}h ${itinerary.totalDuration % 60}m` : '2h 15m'}</span>
                            <div className="w-20 h-0.5 bg-blue-500 relative flex items-center justify-center my-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute -top-0.5 right-0" />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Non-Stop</span>
                          </div>

                          <div>
                            <span className="text-base font-bold text-[#1b1c1c] dark:text-white font-mono block">
                              {seg.arrivalTime ? new Date(seg.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:15 PM'}
                            </span>
                            <span className="text-xs font-bold text-slate-500 font-mono">{destination}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block">Total Fare</span>
                            <span className="text-xl font-black font-mono text-[#005cab] dark:text-blue-400">
                              ₹{itinerary.pricing?.totalFare?.toLocaleString() || '4,850'}
                            </span>
                          </div>

                          <button 
                            onClick={() => navigate('/bookings')}
                            className="bg-[#005cab] hover:bg-[#004786] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-xs active:scale-95"
                          >
                            Book Flight
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==========================================
             FEATURE CARDS (Modern Grid of 3)
             ========================================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            
            {/* Feature 1 */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-[#E6E6E6] dark:border-slate-800 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-full bg-[#d3e1f6] dark:bg-blue-950/70 flex items-center justify-center mb-6 text-[#005cab] dark:text-blue-400">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <h3 className="text-[20px] font-bold text-[#1b1c1c] dark:text-white mb-2">
                Flexible Booking
              </h3>
              <p className="text-[#404754] dark:text-slate-400 text-[15px] leading-relaxed">
                Change your travel dates without stress with our flexible rebooking options and clear cancellation policies.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-[#E6E6E6] dark:border-slate-800 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-full bg-[#d3e1f6] dark:bg-blue-950/70 flex items-center justify-center mb-6 text-[#005cab] dark:text-blue-400">
                <span className="material-symbols-outlined text-[24px]">payments</span>
              </div>
              <h3 className="text-[20px] font-bold text-[#1b1c1c] dark:text-white mb-2">
                Lowest Price Guarantee
              </h3>
              <p className="text-[#404754] dark:text-slate-400 text-[15px] leading-relaxed">
                Find a cheaper flight elsewhere? We'll match the price and give you travel credits for your next journey.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-[#E6E6E6] dark:border-slate-800 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-full bg-[#d3e1f6] dark:bg-blue-950/70 flex items-center justify-center mb-6 text-[#005cab] dark:text-blue-400">
                <span className="material-symbols-outlined text-[24px]">support_agent</span>
              </div>
              <h3 className="text-[20px] font-bold text-[#1b1c1c] dark:text-white mb-2">
                24/7 Concierge
              </h3>
              <p className="text-[#404754] dark:text-slate-400 text-[15px] leading-relaxed">
                Our premium support team is available around the clock to assist with itineraries, transfers, and emergencies.
              </p>
            </div>

          </div>
        </section>

        {/* ==========================================
           SCENIC DESTINATION CALL-TO-ACTION
           ========================================== */}
        <section id="deals" className="bg-[#F2F8FF] dark:bg-slate-900/60 py-24 transition-colors">
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-2 items-center gap-16">
            
            {/* Promo Copy */}
            <div>
              <span className="text-[#005cab] dark:text-blue-400 text-[14px] font-semibold uppercase tracking-[0.2em] block mb-4">
                Limited Deals
              </span>
              <h2 className="text-[36px] md:text-[44px] font-bold text-[#1b1c1c] dark:text-white mb-6 leading-tight">
                Summer Escapes starting from $299
              </h2>
              <p className="text-[#404754] dark:text-slate-300 text-[18px] mb-8 leading-relaxed">
                Experience the turquoise waters of the Maldives or the vibrant culture of Tokyo. Book by the end of the month to unlock exclusive Horizon-X member rates.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => window.scrollTo({ top: 380, behavior: 'smooth' })}
                  className="bg-[#005cab] hover:bg-[#004786] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-8 py-3 rounded-lg text-[14px] font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  Explore Destinations
                </button>
                <button 
                  onClick={() => window.scrollTo({ top: 380, behavior: 'smooth' })}
                  className="border border-[#707785] dark:border-slate-700 text-[#1b1c1c] dark:text-slate-200 px-8 py-3 rounded-lg text-[14px] font-semibold hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
                >
                  View All Deals
                </button>
              </div>
            </div>

            {/* Visual Mosaic Image Grid */}
            <div className="grid grid-cols-2 gap-4 h-[500px]">
              
              {/* Left Tall Card */}
              <div className="rounded-2xl overflow-hidden shadow-lg h-full transition-transform hover:-rotate-1">
                <div 
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBlCcD0kN9xSx7mgvqFHDAOcXICZqsGGiy8GQ3QaLhxq39_-CMWUHWvh3TfAkICydVduUgx_BZitc_pko2seQek1ra79dQho_PYxnPZZdssvZxzYF3qbYkL6jUsGnqQzeHkW64m4-oU05VIAUZEnERxNtrGl_Gr48BBeLZrUxLzTjAFo2yi_lTi0BSNfImujkRk5l1d3zo3e_5wYVEfdmn0XKYUwnn6S9cj8snh9RNtr49-J_fHP6zh')` }}
                />
              </div>

              {/* Right Stacked Column */}
              <div className="grid grid-rows-2 gap-4 h-full">
                <div className="rounded-2xl overflow-hidden shadow-lg transition-transform hover:rotate-1">
                  <div 
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuA6PSdJRvxdxALtDxxdOGyD6H53s3lta-c1Uwy-e9-11KGY4ANZp8NT9WPbVLygs8Ozm34iFwdV3iMM0W10j6wYDg9G3wSmSLrxLaRZDSPmo7Y7Sv7-OxeSdNawx01ngKnPI4s3jqo0KUUcD4z4FBZKp6SGlkOX9Fmc79Bu8juXcdwaYJWcz5CqAfJ5N9NSAyHJUC1mar8F7Rjq6pAC3104iAbfEbJ0ZAbRyGOfgRB1VRTG-TlZSDyN')` }}
                  />
                </div>
                
                <div className="rounded-2xl overflow-hidden shadow-lg transition-transform hover:scale-102">
                  <div 
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDkmY3kXMP1Br-tSioCh_Sg2_TXSnXfurxL3faTgBmpxTSQCJWpd7EUSDcnvg8PNqBQA9oDMiHnuy1T1ljaPI7TGWwJp1Uj94BcpWMemppKYB1bqondHj5jn2qxCf6n-6V0ovUk2eec0gfgBwtMfrtaBrvX7hHnNEBOxDg8SteCrNqWCMaMPcOFfIX54qeQXJTo8LVGhk83D53sOu8yoegjGUba_p0QXS_TenOLicPCsHY7_V_NXkvY')` }}
                  />
                </div>
              </div>

            </div>

          </div>
        </section>

      </main>

      {/* ==========================================
         FOOTER IMPLEMENTATION
         Replaced Skybound with Horizon-X
         ========================================== */}
      <footer id="support" className="bg-[#f5f3f3] dark:bg-slate-900 border-t border-[#E6E6E6] dark:border-slate-800 transition-colors">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12">
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div className="text-2xl font-bold text-[#005cab] dark:text-blue-400">
              Horizon<span className="text-blue-500">-X</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8">
              <a className="text-[#404754] dark:text-slate-400 text-[13px] hover:text-[#005cab] dark:hover:text-blue-400 transition-colors" href="#">Help Center</a>
              <a className="text-[#404754] dark:text-slate-400 text-[13px] hover:text-[#005cab] dark:hover:text-blue-400 transition-colors" href="#">About Us</a>
              <a className="text-[#404754] dark:text-slate-400 text-[13px] hover:text-[#005cab] dark:hover:text-blue-400 transition-colors" href="#">Terms of Service</a>
              <a className="text-[#404754] dark:text-slate-400 text-[13px] hover:text-[#005cab] dark:hover:text-blue-400 transition-colors" href="#">Privacy Policy</a>
              <a className="text-[#404754] dark:text-slate-400 text-[13px] hover:text-[#005cab] dark:hover:text-blue-400 transition-colors" href="#">Contact</a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-[#E6E6E6] dark:border-slate-800">
            <p className="text-[#404754] dark:text-slate-400 text-[14px]">
              © 2026 Horizon-X Travel. All rights reserved.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0 text-[#404754] dark:text-slate-400">
              <span className="material-symbols-outlined cursor-pointer hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">
                language
              </span>
              <span className="material-symbols-outlined cursor-pointer hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">
                currency_exchange
              </span>
            </div>
          </div>

        </div>
      </footer>

      {/* ==========================================
         AIRPORT SELECTION MODAL
         Connects to active operational airports
         ========================================== */}
      {airportSelector && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => { setAirportSelector(null); setAirportFilter(''); }}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-[#E6E6E6] dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#1b1c1c] dark:text-white">
                  Select {airportSelector === 'origin' ? 'Departure' : 'Arrival'} Airport
                </h3>
                <p className="text-xs text-[#566476] dark:text-slate-400">102 operational airports across India</p>
              </div>
              <button 
                type="button"
                onClick={() => { setAirportSelector(null); setAirportFilter(''); }} 
                className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center text-[#566476] dark:text-slate-400 hover:text-[#1b1c1c] dark:hover:text-white text-lg font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search city, airport code, or state (e.g. Delhi, DEL, Bengaluru)..."
                value={airportFilter}
                onChange={(e) => setAirportFilter(e.target.value)}
                autoFocus
                className="w-full px-4 py-2.5 rounded-lg border border-[#c4c6cf] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#1b1c1c] dark:text-white focus:outline-none focus:border-[#005cab] dark:focus:border-blue-500 text-sm"
              />
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 pr-1">
              {filteredAirports.length === 0 ? (
                <div className="text-center py-8 text-sm text-[#566476] dark:text-slate-400">
                  No operational airports matching "{airportFilter}"
                </div>
              ) : (
                filteredAirports.map(airport => (
                  <div
                    key={airport.airportCode}
                    onClick={() => {
                      if (airportSelector === 'origin') setOrigin(airport.airportCode);
                      else setDestination(airport.airportCode);
                      setAirportSelector(null);
                      setAirportFilter('');
                    }}
                    className="py-2.5 px-3 hover:bg-[#f0f4f9] dark:hover:bg-slate-800/60 rounded-lg cursor-pointer flex items-center justify-between transition-colors group"
                  >
                    <div>
                      <div className="font-semibold text-sm text-[#1b1c1c] dark:text-white group-hover:text-[#005cab] dark:group-hover:text-blue-400 transition-colors">
                        {airport.cityName}
                      </div>
                      <div className="text-xs text-[#566476] dark:text-slate-400">
                        {airport.airportCode} • {airport.stateOrUt || 'India'}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#005cab] dark:text-blue-400 bg-[#e8f0fe] dark:bg-blue-950/70 px-2.5 py-1 rounded">
                      {airport.airportCode}
                    </span>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
