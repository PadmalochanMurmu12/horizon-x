import React, { useState, useRef, useEffect } from 'react';
import { USER_ENDPOINTS } from '../services/api';

const AIRPORT_DIRECTORY = {
  DEL: { city: 'Delhi', airport: 'DEL, Indira Gandhi International Airport' },
  BLR: { city: 'Bengaluru', airport: 'BLR, Kempegowda International Airport' },
  MAA: { city: 'Chennai', airport: 'MAA, Chennai International Airport' },
  BOM: { city: 'Mumbai', airport: 'BOM, Chhatrapati Shivaji Maharaj Int\'l' },
  CCU: { city: 'Kolkata', airport: 'CCU, Netaji Subhash Chandra Bose Int\'l' },
  HYD: { city: 'Hyderabad', airport: 'HYD, Rajiv Gandhi International Airport' }
};

export default function LandingPage({ onSearch }) {
  const [tripType, setTripType] = useState('ONEWAY');
  const [origin, setOrigin] = useState('DEL');
  const [destination, setDestination] = useState('BBI');
  const [departureDate, setDepartureDate] = useState('2026-11-14');
  const [returnDate, setReturnDate] = useState('');
  const [cabinClass, setCabinClass] = useState('ECONOMY');
  const [paxCounts, setPaxCounts] = useState({ adults: 1, children: 0, infants: 0 });
  const [isPaxOpen, setIsPaxOpen] = useState(false);
  const [airportList, setAirportList] = useState([]);
  const [airportSelector, setAirportSelector] = useState(null); // 'origin' | 'destination' | null
  const [airportFilter, setAirportFilter] = useState('');
  
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetch(USER_ENDPOINTS.AIRPORTS)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAirportList(data);
      })
      .catch(err => console.error('Failed to load operational airports:', err));
  }, []);

  const airportDirectory = airportList.reduce((acc, a) => {
    acc[a.airportCode] = { city: a.cityName, airport: `${a.airportCode}, ${a.cityName} Airport (${a.stateOrUt})` };
    return acc;
  }, { ...AIRPORT_DIRECTORY });

  const filteredAirports = airportList.filter(a => {
    const q = airportFilter.toLowerCase().trim();
    if (!q) return true;
    return (
      a.airportCode.toLowerCase().includes(q) ||
      a.cityName.toLowerCase().includes(q) ||
      (a.stateOrUt && a.stateOrUt.toLowerCase().includes(q))
    );
  });

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
      if (next < 0) return prev;
      return { ...prev, [type]: next };
    });
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    
    const dayNum = d.getUTCDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthYear = `${months[d.getUTCMonth()]}'${String(d.getUTCFullYear()).slice(-2)}`;
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

    return { dayNum, monthYear, dayName };
  };

  const depDateFormatted = formatDateDisplay(departureDate);
  const retDateFormatted = formatDateDisplay(returnDate);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const legs = [{ origin, destination, travelDate: departureDate }];
    if (tripType === 'ROUND_TRIP' && returnDate) {
      legs.push({ origin: destination, destination: origin, travelDate: returnDate });
    }

    const payload = {
      tripType,
      cabinClass,
      legs,
      paxCounts
    };

    if (onSearch) {
      onSearch(payload);
    }
  };

  return (
    <div className="bg-[#fbf9f8] text-[#1b1c1c] font-sans min-h-screen overflow-x-hidden">
      
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#fbf9f8]/90 backdrop-blur-md border-b border-[#E6E6E6] h-16 transition-all duration-300">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-2xl font-bold text-[#005cab] tracking-tight cursor-pointer">
              Horizon-X
            </span>
            <nav className="hidden lg:flex items-center gap-6 text-[16px]">
              <a className="text-[#005cab] font-bold border-b-2 border-[#005cab] pb-1" href="/">Flights</a>
              <a className="text-[#566476] hover:text-[#005cab] transition-colors" href="/bookings">My Bookings</a>
              <a className="text-[#566476] hover:text-[#005cab] transition-colors" href="/checkin">Web Check-in</a>
              <a className="text-[#566476] hover:text-[#005cab] transition-colors" href="#support">Support</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-[14px] font-semibold text-[#1b1c1c] px-4 py-2 hover:text-[#005cab] transition-all">Sign In</button>
            <button className="bg-[#005cab] text-white text-[14px] font-semibold px-6 py-2.5 rounded-full hover:shadow-lg transition-all active:scale-95">
              Create Account
            </button>
          </div>
        </div>
      </header>

      <main className="pt-16 min-h-screen">
        
        {/* Hero Section */}
        <section className="relative h-[480px] w-full flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div 
              className="w-full h-full bg-cover bg-center transition-transform duration-[20s] hover:scale-105"
              style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBxCHlSpCUzBLgUnPOrjldM6vz0NDoD0AVfwGB4OFWtXPakqvhsx8s_fECxcJFm8MKuqgU6xxwrNy5vg3ZfE65oc2ODRA1z03RtwPn2teJFDmtwRr-2HtQNlTPeYe6Xj8tesr2X5G3zFmbFY5YiFgPt8VhG9gvc023vDM94R7TZYxVitO4QbsWmVkH9kFoJoPUyujLpm9obom8hGCnSj6uQk7tlLnVAzR7gQfS03YSRAI9nzFW8z6ZT')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#fbf9f8]" />
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

        {/* Search Engine Container */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-10 -mt-32 relative z-20 pb-24">
          <form onSubmit={handleSearchSubmit} className="relative bg-white rounded-xl shadow-xl border border-[#E6E6E6]">
            
            {/* Trip Type Tabs */}
            <div className="flex items-center justify-between border-b border-[#E6E6E6] px-8 py-4">
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
                      onChange={() => setTripType(tab.key)}
                      className="w-4 h-4 text-[#005cab] focus:ring-[#005cab] border-[#707785] cursor-pointer"
                    />
                    <span className={`text-[14px] font-semibold transition-colors ${tripType === tab.key ? 'text-[#005cab]' : 'text-[#1b1c1c] group-hover:text-[#005cab]'}`}>
                      {tab.label}
                    </span>
                  </label>
                ))}
              </div>
              <span className="text-[12px] font-medium text-[#404754] italic hidden md:block">
                Book International and Domestic Flights
              </span>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 w-full pb-10">
              
              {/* FROM */}
              <div 
                onClick={() => setAirportSelector('origin')}
                className="md:col-span-3 p-6 border-r border-[#E6E6E6] group cursor-pointer hover:bg-[#f5f3f3] transition-colors relative"
              >
                <span className="text-[12px] font-medium text-[#404754] block mb-1">From (Tap to select)</span>
                <div className="text-[24px] font-bold text-[#1b1c1c] leading-tight">
                  {airportDirectory[origin]?.city || origin}
                </div>
                <div className="text-[12px] text-[#404754] truncate mt-0.5">
                  {airportDirectory[origin]?.airport || `${origin} Airport`}
                </div>
                
                {/* Swap Button */}
                <button 
                  type="button"
                  onClick={handleSwap}
                  className="absolute -right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-white border border-[#E6E6E6] rounded-full flex items-center justify-center shadow-md hover:border-[#005cab] hover:text-[#005cab] transition-all active:scale-90"
                >
                  <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                </button>
              </div>

              {/* TO */}
              <div 
                onClick={() => setAirportSelector('destination')}
                className="md:col-span-3 p-6 pl-8 border-r border-[#E6E6E6] group cursor-pointer hover:bg-[#f5f3f3] transition-colors"
              >
                <span className="text-[12px] font-medium text-[#404754] block mb-1">To (Tap to select)</span>
                <div className="text-[24px] font-bold text-[#1b1c1c] leading-tight">
                  {airportDirectory[destination]?.city || destination}
                </div>
                <div className="text-[12px] text-[#404754] truncate mt-0.5">
                  {airportDirectory[destination]?.airport || `${destination} Airport`}
                </div>
              </div>

              {/* DEPARTURE */}
              <div className="md:col-span-2 p-6 border-r border-[#E6E6E6] group cursor-pointer hover:bg-[#f5f3f3] transition-colors relative">
                <input 
                  type="date" 
                  value={departureDate} 
                  min={new Date().toISOString().split('T')[0]}
                  max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium text-[#404754]">Departure</span>
                  <span className="material-symbols-outlined text-[#005cab] text-sm">expand_more</span>
                </div>
                {depDateFormatted && (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[24px] font-bold text-[#1b1c1c]">{depDateFormatted.dayNum}</span>
                      <span className="text-[14px] font-semibold text-[#1b1c1c]">{depDateFormatted.monthYear}</span>
                    </div>
                    <div className="text-[12px] text-[#404754]">{depDateFormatted.dayName}</div>
                  </>
                )}
              </div>

              {/* RETURN */}
              <div className={`md:col-span-2 p-6 border-r border-[#E6E6E6] group cursor-pointer transition-colors relative ${tripType === 'ONEWAY' && !returnDate ? 'opacity-70' : 'hover:bg-[#f5f3f3]'}`}>
                <input 
                  type="date" 
                  value={returnDate} 
                  min={departureDate || new Date().toISOString().split('T')[0]}
                  max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  onChange={(e) => {
                    setReturnDate(e.target.value);
                    if (tripType === 'ONEWAY') setTripType('ROUND_TRIP');
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium text-[#404754]">Return</span>
                  <span className="material-symbols-outlined text-[#005cab] text-sm">expand_more</span>
                </div>
                {retDateFormatted ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[24px] font-bold text-[#1b1c1c]">{retDateFormatted.dayNum}</span>
                      <span className="text-[14px] font-semibold text-[#1b1c1c]">{retDateFormatted.monthYear}</span>
                    </div>
                    <div className="text-[12px] text-[#404754]">{retDateFormatted.dayName}</div>
                  </>
                ) : (
                  <div className="text-[14px] text-[#404754] leading-tight mt-1">
                    Tap to add a return date for bigger discounts
                  </div>
                )}
              </div>

              {/* TRAVELLERS & CLASS */}
              <div className="md:col-span-2 p-6 group cursor-pointer hover:bg-[#f5f3f3] transition-colors relative" ref={dropdownRef}>
                <div onClick={() => setIsPaxOpen(!isPaxOpen)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium text-[#404754]">Travellers & Class</span>
                    <span className="material-symbols-outlined text-[#005cab] text-sm">expand_more</span>
                  </div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[#404754] text-[16px]">person</span>
                      <span className="text-[20px] font-bold text-[#1b1c1c]">{paxCounts.adults}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[#404754] text-[16px]">child_care</span>
                      <span className="text-[20px] font-bold text-[#1b1c1c]">{paxCounts.children}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[#404754] text-[16px]">mood</span>
                      <span className="text-[20px] font-bold text-[#1b1c1c]">{paxCounts.infants}</span>
                    </div>
                  </div>
                  <div className="text-[12px] text-[#1b1c1c] font-semibold truncate">
                    {cabinClass === 'PREMIUM_ECONOMY' ? 'Premium Economy' : cabinClass === 'FIRST' ? 'First Class' : cabinClass.charAt(0) + cabinClass.slice(1).toLowerCase()}
                  </div>
                </div>

                {/* Dropdown Menu Modal */}
                {isPaxOpen && (
                  <div className="absolute top-[100%] right-0 mt-2 w-80 bg-white shadow-2xl rounded-xl border border-[#E6E6E6] z-50 p-6">
                    <div className="space-y-5">
                      {[
                        { key: 'adults', label: 'Adults', sub: '12+ years' },
                        { key: 'children', label: 'Children', sub: '2-12 years' },
                        { key: 'infants', label: 'Infants', sub: 'Below 2 years' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <div>
                            <div className="text-[14px] font-semibold text-[#1b1c1c]">{item.label}</div>
                            <div className="text-[12px] text-[#404754]">{item.sub}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              type="button" 
                              onClick={() => updatePax(item.key, -1)}
                              className="w-8 h-8 rounded-full border border-[#707785] flex items-center justify-center hover:bg-[#f5f3f3] text-[#005cab] font-bold"
                            >
                              -
                            </button>
                            <span className="font-bold text-[#1b1c1c] w-4 text-center">{paxCounts[item.key]}</span>
                            <button 
                              type="button" 
                              onClick={() => updatePax(item.key, 1)}
                              className="w-8 h-8 rounded-full border border-[#005cab] flex items-center justify-center bg-[#0075d7] text-white hover:opacity-90 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="pt-4 border-t border-[#E6E6E6]">
                        <span className="text-[12px] font-medium text-[#404754] block mb-3 uppercase tracking-wider">Cabin Class</span>
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
                              onClick={() => setCabinClass(c.key)}
                              className={`text-[12px] p-2 rounded border transition-colors ${
                                cabinClass === c.key
                                  ? 'border-[#005cab] bg-[#0075d7] text-white font-bold'
                                  : 'border-[#707785] text-[#1b1c1c] hover:border-[#005cab]'
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={() => setIsPaxOpen(false)}
                        className="w-full bg-[#005cab] text-white py-3 rounded-lg text-[14px] font-semibold hover:bg-[#004786] transition-all"
                      >
                        APPLY
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Search Action Button */}
            <div className="absolute left-1/2 -bottom-7 -translate-x-1/2 z-20">
              <button 
                type="submit" 
                className="bg-[#005cab] text-white px-20 py-4 rounded-full font-bold text-[18px] hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-4 group tracking-wide"
              >
                SEARCH FLIGHTS
                <span className="material-symbols-outlined text-[22px] transition-transform group-hover:translate-x-1.5">
                  arrow_forward
                </span>
              </button>
            </div>
          </form>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            <div className="bg-white p-8 rounded-xl border border-[#E6E6E6] hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-full bg-[#d3e1f6] flex items-center justify-center mb-6 text-[#005cab]">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <h3 className="text-[20px] font-bold mb-2">Flexible Booking</h3>
              <p className="text-[#404754] text-[15px] leading-relaxed">
                Change your travel dates without stress with our flexible rebooking options and clear cancellation policies.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-[#E6E6E6] hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-full bg-[#d3e1f6] flex items-center justify-center mb-6 text-[#005cab]">
                <span className="material-symbols-outlined text-[24px]">payments</span>
              </div>
              <h3 className="text-[20px] font-bold mb-2">Lowest Price Guarantee</h3>
              <p className="text-[#404754] text-[15px] leading-relaxed">
                Find a cheaper flight elsewhere? We'll match the price and give you travel credits for your next journey.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-[#E6E6E6] hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-full bg-[#d3e1f6] flex items-center justify-center mb-6 text-[#005cab]">
                <span className="material-symbols-outlined text-[24px]">support_agent</span>
              </div>
              <h3 className="text-[20px] font-bold mb-2">24/7 Concierge</h3>
              <p className="text-[#404754] text-[15px] leading-relaxed">
                Our premium support team is available around the clock to assist with itineraries, transfers, and emergencies.
              </p>
            </div>
          </div>
        </section>

        {/* Scenic Destination Showcase */}
        <section className="bg-[#F2F8FF] py-24">
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-2 items-center gap-16">
            <div>
              <span className="text-[#005cab] text-[14px] font-semibold uppercase tracking-[0.2em] block mb-4">Limited Deals</span>
              <h2 className="text-[36px] md:text-[44px] font-bold text-[#1b1c1c] mb-6 leading-tight">Summer Escapes starting from $299</h2>
              <p className="text-[#404754] text-[18px] mb-8 leading-relaxed">
                Experience the turquoise waters of the Maldives or the vibrant culture of Tokyo. Book by the end of the month to unlock exclusive Horizon-X member rates.
              </p>
              <div className="flex gap-4">
                <button className="bg-[#005cab] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#004786] transition-all">
                  Explore Destinations
                </button>
                <button className="border border-[#707785] text-[#1b1c1c] px-8 py-3 rounded-lg font-semibold hover:bg-[#f5f3f3] transition-all">
                  View All Deals
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 h-[500px]">
              <div className="rounded-2xl overflow-hidden shadow-lg h-full transition-transform hover:-rotate-1">
                <div 
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBlCcD0kN9xSx7mgvqFHDAOcXICZqsGGiy8GQ3QaLhxq39_-CMWUHWvh3TfAkICydVduUgx_BZitc_pko2seQek1ra79dQho_PYxnPZZdssvZxzYF3qbYkL6jUsGnqQzeHkW64m4-oU05VIAUZEnERxNtrGl_Gr48BBeLZrUxLzTjAFo2yi_lTi0BSNfImujkRk5l1d3zo3e_5wYVEfdmn0XKYUwnn6S9cj8snh9RNtr49-J_fHP6zh')` }}
                />
              </div>
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

      {/* Footer */}
      <footer className="bg-[#f5f3f3] border-t border-[#E6E6E6]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div className="text-2xl font-bold text-[#005cab]">Horizon-X</div>
            <div className="flex flex-wrap justify-center gap-8">
              <a className="text-[#404754] text-[13px] hover:text-[#1b1c1c] transition-colors" href="#help">Help Center</a>
              <a className="text-[#404754] text-[13px] hover:text-[#1b1c1c] transition-colors" href="#about">About Us</a>
              <a className="text-[#404754] text-[13px] hover:text-[#1b1c1c] transition-colors" href="#terms">Terms of Service</a>
              <a className="text-[#404754] text-[13px] hover:text-[#1b1c1c] transition-colors" href="#privacy">Privacy Policy</a>
              <a className="text-[#404754] text-[13px] hover:text-[#1b1c1c] transition-colors" href="#contact">Contact</a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-[#E6E6E6]">
            <p className="text-[#404754] text-[14px]">© 2026 Horizon-X Travel. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0 text-[#404754]">
              <span className="material-symbols-outlined cursor-pointer hover:text-[#005cab] transition-colors">language</span>
              <span className="material-symbols-outlined cursor-pointer hover:text-[#005cab] transition-colors">currency_exchange</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Airport Selection Modal */}
      {airportSelector && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-[#E6E6E6] animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#1b1c1c]">
                  Select {airportSelector === 'origin' ? 'Departure' : 'Arrival'} Airport
                </h3>
                <p className="text-xs text-[#566476]">102 accessible airports across India</p>
              </div>
              <button 
                type="button"
                onClick={() => { setAirportSelector(null); setAirportFilter(''); }} 
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-[#566476] hover:text-[#1b1c1c] text-xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search city, airport code, or state (e.g. Bhubaneswar, BBI)..."
                value={airportFilter}
                onChange={(e) => setAirportFilter(e.target.value)}
                autoFocus
                className="w-full px-4 py-2.5 rounded-lg border border-[#c4c6cf] focus:outline-none focus:border-[#005cab] text-sm"
              />
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 pr-1">
              {filteredAirports.length === 0 ? (
                <div className="text-center py-8 text-sm text-[#566476]">
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
                    className="py-2.5 px-3 hover:bg-[#f0f4f9] rounded-lg cursor-pointer flex items-center justify-between transition-colors group"
                  >
                    <div>
                      <div className="font-semibold text-sm text-[#1b1c1c] group-hover:text-[#005cab] transition-colors">
                        {airport.cityName}
                      </div>
                      <div className="text-xs text-[#566476]">
                        {airport.airportCode} • {airport.stateOrUt}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#005cab] bg-[#e8f0fe] px-2.5 py-1 rounded">
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