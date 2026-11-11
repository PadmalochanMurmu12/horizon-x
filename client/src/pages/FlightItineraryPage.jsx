import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setJourneyDetails } from '../store/bookingSlice';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import AirlineLogo from '../components/AirlineLogo';
import { USER_ENDPOINTS } from '../services/api';

const DEFAULT_AIRPORTS = {
  DEL: { code: 'DEL', city: 'Delhi', airport: 'Indira Gandhi Int\'l Airport, India', terminal: 'T3' },
  BLR: { code: 'BLR', city: 'Bengaluru', airport: 'Kempegowda Int\'l Airport, India', terminal: 'T2' },
  BOM: { code: 'BOM', city: 'Mumbai', airport: 'Chhatrapati Shivaji Maharaj Int\'l, India', terminal: 'T2' },
  MAA: { code: 'MAA', city: 'Chennai', airport: 'Chennai International Airport, India', terminal: 'T1' },
  CCU: { code: 'CCU', city: 'Kolkata', airport: 'Netaji Subhash Chandra Bose Int\'l, India', terminal: 'T2' },
  HYD: { code: 'HYD', city: 'Hyderabad', airport: 'Rajiv Gandhi Int\'l Airport, India', terminal: 'T1' },
  GOI: { code: 'GOI', city: 'Goa (Dabolim)', airport: 'Dabolim Airport, India', terminal: 'T1' },
  GOX: { code: 'GOX', city: 'Goa (Mopa)', airport: 'Manohar International Airport, India', terminal: 'T1' },
  PNQ: { code: 'PNQ', city: 'Pune', airport: 'Pune International Airport, India', terminal: 'T1' },
  AMD: { code: 'AMD', city: 'Ahmedabad', airport: 'Sardar Vallabhbhai Patel Int\'l, India', terminal: 'T1' },
  COK: { code: 'COK', city: 'Kochi', airport: 'Cochin International Airport, India', terminal: 'T3' },
  JAI: { code: 'JAI', city: 'Jaipur', airport: 'Jaipur International Airport, India', terminal: 'T2' },
  LKO: { code: 'LKO', city: 'Lucknow', airport: 'Chaudhary Charan Singh Int\'l, India', terminal: 'T3' },
  GAU: { code: 'GAU', city: 'Guwahati', airport: 'Lokpriya Gopinath Bordoloi Int\'l, India', terminal: 'T1' }
};

// Fallback high-fidelity sample flights matching the prototype specification
const MOCK_FALLBACK_FLIGHTS = [
  {
    id: 'HX-402',
    isDirect: true,
    totalDuration: 165,
    departureTime: '2026-11-14T06:15:00.000Z',
    arrivalTime: '2026-11-14T09:00:00.000Z',
    isRecommended: true,
    refundableType: 'Partially Refundable',
    ecoBadge: 'Eco-saver • Carbon Offset Included',
    layovers: [],
    segments: [
      {
        flightId: 'HX402',
        flightNumber: 'HX-402',
        airline: { code: 'IX', name: 'Horizon-X Wings' },
        aircraft: 'Airbus A321neo',
        origin: 'DEL',
        destination: 'BLR',
        departureTime: '2026-11-14T06:15:00.000Z',
        arrivalTime: '2026-11-14T09:00:00.000Z',
        originTerminal: 'Terminal 3',
        destinationTerminal: 'Terminal 2',
        originGate: 'Gate 14B',
        destinationBelt: 'Belt 04',
        durationMinutes: 165,
        cabinClass: 'ECONOMY',
        baggage: '15 KG'
      }
    ],
    pricing: {
      baseFare: 4250,
      tax: 640,
      totalFare: 4890,
      currency: 'INR'
    },
    features: {
      meal: true,
      baggage: true,
      usb: true,
      wifi: true
    }
  },
  {
    id: '6E-2134',
    isDirect: true,
    totalDuration: 170,
    departureTime: '2026-11-14T11:30:00.000Z',
    arrivalTime: '2026-11-14T14:20:00.000Z',
    isCheapest: true,
    refundableType: 'Non-Refundable',
    ecoBadge: 'Seats left: 4 at this fare',
    layovers: [],
    segments: [
      {
        flightId: '6E2134',
        flightNumber: '6E-2134',
        airline: { code: '6E', name: 'IndiGo Air' },
        aircraft: 'Airbus A320neo',
        origin: 'DEL',
        destination: 'BLR',
        departureTime: '2026-11-14T11:30:00.000Z',
        arrivalTime: '2026-11-14T14:20:00.000Z',
        originTerminal: 'Terminal 1D',
        destinationTerminal: 'Terminal 1',
        originGate: 'Gate 06A',
        destinationBelt: 'Belt 02',
        durationMinutes: 170,
        cabinClass: 'ECONOMY',
        baggage: '15 KG'
      }
    ],
    pricing: {
      baseFare: 3850,
      tax: 580,
      totalFare: 4430,
      currency: 'INR'
    },
    features: {
      meal: false,
      baggage: true,
      usb: true,
      wifi: false
    }
  },
  {
    id: 'AI-804-AI-502',
    isDirect: false,
    totalDuration: 315,
    departureTime: '2026-11-14T14:10:00.000Z',
    arrivalTime: '2026-11-14T19:25:00.000Z',
    experienceBadge: 'Dreamliner Experience',
    refundableType: '100% Refundable',
    ecoBadge: 'BOM Transit Lounge Access Included',
    layovers: [
      {
        airport: 'BOM',
        duration: 80,
        layoverText: '1 Stop • BOM (1h 20m)'
      }
    ],
    segments: [
      {
        flightId: 'AI804',
        flightNumber: 'AI-804',
        airline: { code: 'AI', name: 'Air Express' },
        aircraft: 'Boeing 787-9 Dreamliner',
        origin: 'DEL',
        destination: 'BOM',
        departureTime: '2026-11-14T14:10:00.000Z',
        arrivalTime: '2026-11-14T16:25:00.000Z',
        originTerminal: 'Terminal 3',
        destinationTerminal: 'Terminal 2',
        originGate: 'Gate 22C',
        destinationBelt: 'Transit Belt',
        durationMinutes: 135,
        cabinClass: 'ECONOMY',
        baggage: '25 KG'
      },
      {
        flightId: 'AI502',
        flightNumber: 'AI-502',
        airline: { code: 'AI', name: 'Air Express' },
        aircraft: 'Airbus A321',
        origin: 'BOM',
        destination: 'BLR',
        departureTime: '2026-11-14T17:45:00.000Z',
        arrivalTime: '2026-11-14T19:25:00.000Z',
        originTerminal: 'Terminal 2',
        destinationTerminal: 'Terminal 2',
        originGate: 'Gate 04B',
        destinationBelt: 'Belt 08',
        durationMinutes: 100,
        cabinClass: 'ECONOMY',
        baggage: '25 KG'
      }
    ],
    pricing: {
      baseFare: 4620,
      tax: 730,
      totalFare: 5350,
      currency: 'INR'
    },
    features: {
      meal: true,
      baggage: true,
      usb: true,
      wifi: true
    }
  },
  {
    id: 'QP-1301',
    isDirect: true,
    totalDuration: 160,
    departureTime: '2026-11-14T18:40:00.000Z',
    arrivalTime: '2026-11-14T21:20:00.000Z',
    refundableType: 'Partially Refundable',
    ecoBadge: 'Ultra-quiet Boeing Sky Interior',
    layovers: [],
    segments: [
      {
        flightId: 'QP1301',
        flightNumber: 'QP-1301',
        airline: { code: 'QP', name: 'Akasa Air' },
        aircraft: 'Boeing 737 MAX 8',
        origin: 'DEL',
        destination: 'BLR',
        departureTime: '2026-11-14T18:40:00.000Z',
        arrivalTime: '2026-11-14T21:20:00.000Z',
        originTerminal: 'Terminal 2',
        destinationTerminal: 'Terminal 1',
        originGate: 'Gate 08',
        destinationBelt: 'Belt 03',
        durationMinutes: 160,
        cabinClass: 'ECONOMY',
        baggage: '15 KG'
      }
    ],
    pricing: {
      baseFare: 4100,
      tax: 620,
      totalFare: 4720,
      currency: 'INR'
    },
    features: {
      meal: false,
      baggage: true,
      usb: true,
      wifi: false
    }
  }
];

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

export default function FlightItineraryPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDark, toggleTheme } = useTheme();

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

  const handleSelectFlight = (flight) => {
    if (!flight) return;
    const journeyPayload = {
      flight,
      tripType,
      cabinClass,
      origin,
      destination,
      departureDate,
      returnDate,
      paxCounts
    };
    dispatch(setJourneyDetails(journeyPayload));
    try {
      sessionStorage.setItem('hx_journey_details', JSON.stringify(journeyPayload));
      sessionStorage.setItem('hx_selected_flight', JSON.stringify(flight));
    } catch (e) {
      console.warn('Session storage write error:', e);
    }
    navigate('/checkout');
  };

  const todayStr = getTodayStr();
  const maxDateStr = getMaxDateStr();

  // Input refs for direct, full-box date picker invocation
  const depDateInputRef = useRef(null);
  const retDateInputRef = useRef(null);

  // Search Engine Parameters
  const [tripType, setTripType] = useState(() => searchParams.get('tripType') || 'ONEWAY');
  const [origin, setOrigin] = useState(() => searchParams.get('origin') || 'DEL');
  const [destination, setDestination] = useState(() => searchParams.get('destination') || 'BLR');
  const [departureDate, setDepartureDate] = useState(() => {
    const today = getTodayStr();
    const max = getMaxDateStr();
    const pDate = searchParams.get('departureDate');
    if (pDate && /^\d{4}-\d{2}-\d{2}$/.test(pDate) && pDate >= today && pDate <= max) {
      return pDate;
    }
    return getFutureDateStr(3);
  });
  const [returnDate, setReturnDate] = useState(() => {
    const today = getTodayStr();
    const max = getMaxDateStr();
    const pRet = searchParams.get('returnDate');
    const pDep = searchParams.get('departureDate') || today;
    const minRet = pDep >= today ? pDep : today;
    if (pRet && /^\d{4}-\d{2}-\d{2}$/.test(pRet) && pRet >= minRet && pRet <= max) {
      return pRet;
    }
    return getFutureDateStr(6);
  });
  const [cabinClass, setCabinClass] = useState(() => searchParams.get('cabinClass') || 'ECONOMY');
  const [paxCounts, setPaxCounts] = useState(() => ({
    adults: Number(searchParams.get('adults')) || 1,
    children: Number(searchParams.get('children')) || 0,
    infants: Number(searchParams.get('infants')) || 0
  }));

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

  // Helper to sync query params without reloading
  const updateQueryParams = (newDep, newRet, newTrip = tripType) => {
    const params = new URLSearchParams(searchParams);
    params.set('tripType', newTrip);
    params.set('origin', origin);
    params.set('destination', destination);
    if (newDep) params.set('departureDate', newDep);
    if (newTrip === 'ROUND_TRIP' && newRet) {
      params.set('returnDate', newRet);
    } else {
      params.delete('returnDate');
    }
    setSearchParams(params, { replace: true });
  };

  // Multi-City Sectors
  const [multiCitySectors, setMultiCitySectors] = useState([
    { origin: 'DEL', destination: 'BOM', travelDate: departureDate },
    { origin: 'BOM', destination: 'BLR', travelDate: departureDate }
  ]);

  // Airport Directory
  const [airportDirectory, setAirportDirectory] = useState(DEFAULT_AIRPORTS);
  const [airportModal, setAirportModal] = useState(null); // 'origin' | 'destination' | { multiIndex, field } | null
  const [airportSearchTerm, setAirportSearchTerm] = useState('');
  const [isPaxDropdownOpen, setIsPaxDropdownOpen] = useState(false);
  const paxRef = useRef(null);

  // Flight Data State
  const [rawFlights, setRawFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Micro-interaction states
  const [swapRotate, setSwapRotate] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState({});
  const [selectedFlightForBooking, setSelectedFlightForBooking] = useState(null);

  // Filters State
  const [filterStops, setFilterStops] = useState({ direct: true, oneStop: true, twoPlus: true });
  const [maxPriceFilter, setMaxPriceFilter] = useState(15000);
  const [priceBounds, setPriceBounds] = useState({ min: 2000, max: 20000 });
  const [selectedTimeSlots, setSelectedTimeSlots] = useState({
    earlyMorning: false, // 00:00 - 06:00
    morning: false,      // 06:00 - 12:00
    afternoon: false,    // 12:00 - 18:00
    evening: false       // 18:00 - 24:00
  });
  const [selectedAirlineCodes, setSelectedAirlineCodes] = useState([]);
  const [featuresFilter, setFeaturesFilter] = useState({
    freeMeal: false,
    baggage: false,
    wifi: false
  });

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState('cheapest'); // 'cheapest' | 'fastest' | 'bestValue' | 'earliest'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Load operational airports on mount
  useEffect(() => {
    fetch(USER_ENDPOINTS.AIRPORTS)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const map = {};
          data.forEach(a => {
            map[a.airportCode] = {
              code: a.airportCode,
              city: a.cityName,
              airport: `${a.cityName} Airport (${a.stateOrUt || 'India'})`,
              terminal: 'T1'
            };
          });
          setAirportDirectory(prev => ({ ...prev, ...map }));
        }
      })
      .catch(() => {});
  }, []);

  // Close pax dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (paxRef.current && !paxRef.current.contains(e.target)) {
        setIsPaxDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Itineraries from Backend API
  const fetchItineraries = async (targetDate = departureDate) => {
    const today = getTodayStr();
    const maxDate = getMaxDateStr();

    if (targetDate < today) {
      setErrorMsg(`Sector departure date cannot be in the past (${targetDate}). Flight bookings are only permitted for current day (${today}) and future dates up to 90 days.`);
      setRawFlights([]);
      setLoading(false);
      return;
    }

    if (targetDate > maxDate) {
      setErrorMsg(`Sector departure date exceeds the 90-day booking limit. Flight schedules can only be reserved up to ${maxDate}.`);
      setRawFlights([]);
      setLoading(false);
      return;
    }

    if (tripType === 'ROUND_TRIP' && returnDate && returnDate < targetDate) {
      setErrorMsg("Return date cannot depart earlier than departure date.");
      setRawFlights([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      let legs = [];
      if (tripType === 'ONEWAY') {
        legs = [{ origin, destination, travelDate: targetDate }];
      } else if (tripType === 'ROUND_TRIP') {
        const ret = returnDate && returnDate >= targetDate ? returnDate : targetDate;
        legs = [
          { origin, destination, travelDate: targetDate },
          { origin: destination, destination: origin, travelDate: ret }
        ];
      } else if (tripType === 'MULTI_CITY') {
        legs = multiCitySectors;
      }

      const payload = {
        tripType,
        cabinClass,
        legs,
        paxCounts
      };

      const res = await fetch(USER_ENDPOINTS.SEARCH_ITINERARY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || "Failed to retrieve flight schedules for the selected sector.");
        setRawFlights([]);
        setLoading(false);
        return;
      }

      if (Array.isArray(data.data) && data.data.length > 0) {
        // Map backend returned itineraries
        const backendItineraries = data.data[0]?.itineraries || [];

        if (backendItineraries.length > 0) {
          const normalized = backendItineraries.map((flight, idx) => {
            const firstSeg = flight.segments?.[0] || {};
            const lastSeg = flight.segments?.[flight.segments.length - 1] || {};
            const isDirect = flight.isDirect ?? (flight.segments?.length === 1);
            
            // Format duration string
            const durMins = flight.totalDuration || 150;
            const hours = Math.floor(durMins / 60);
            const mins = durMins % 60;
            const durationFormatted = `${hours}h ${mins}m`;

            // Normalize Layover details
            const layovers = flight.layovers || [];
            const layoverText = isDirect 
              ? 'Non-Stop' 
              : `${layovers.length} Stop${layovers.length > 1 ? 's' : ''} • ${layovers[0]?.airport || 'Transit'} (${Math.floor((layovers[0]?.duration || 80)/60)}h ${(layovers[0]?.duration || 80)%60}m)`;

            // Pricing normalization (INR)
            let totalFare = Number(flight.pricing?.totalFare || 0);
            if (!totalFare || totalFare < 500) {
              totalFare = Math.round(4000 + idx * 450);
            }
            const baseFare = Number(flight.pricing?.baseFare) || Math.round(totalFare * 0.85);
            const tax = Number(flight.pricing?.tax) || (totalFare - baseFare);

            return {
              id: flight.id || `HX-${idx + 101}`,
              isDirect,
              totalDuration: durMins,
              durationFormatted,
              departureTime: flight.departureTime || firstSeg.departureTime,
              arrivalTime: flight.arrivalTime || lastSeg.arrivalTime,
              layovers,
              layoverText,
              isRecommended: idx === 0,
              isCheapest: idx === 1,
              refundableType: idx % 2 === 0 ? 'Partially Refundable' : (idx === 1 ? 'Non-Refundable' : '100% Refundable'),
              ecoBadge: idx === 0 ? 'Eco-saver • Carbon Offset Included' : (idx === 1 ? 'Seats left: 3 at this fare' : 'Fast-track Security Clearance'),
              segments: flight.segments.map((seg, sIdx) => ({
                flightId: seg.flightId || `SEG-${sIdx}`,
                flightNumber: seg.flightNumber || `HX-${200 + sIdx}`,
                airline: {
                  code: seg.airline?.code || 'IX',
                  name: seg.airline?.name || 'Horizon-X Fleet'
                },
                aircraft: seg.aircraft || (seg.airline?.code === '6E' ? 'Airbus A320neo' : 'Boeing 737 MAX 8'),
                origin: seg.origin,
                destination: seg.destination,
                departureTime: seg.departureTime,
                arrivalTime: seg.arrivalTime,
                originTerminal: `Terminal ${((sIdx + 1) % 3) + 1}`,
                destinationTerminal: `Terminal ${((sIdx + 2) % 3) + 1}`,
                originGate: `Gate ${10 + sIdx}A`,
                destinationBelt: `Belt 0${sIdx + 2}`,
                cabinClass: seg.cabinClass || cabinClass,
                baggage: seg.baggage || '15 KG'
              })),
              pricing: {
                baseFare,
                tax,
                totalFare,
                currency: 'INR'
              },
              features: {
                meal: idx % 2 === 0,
                baggage: true,
                usb: true,
                wifi: idx === 0 || idx === 2
              }
            };
          });

          setRawFlights(normalized);

          // Update price slider bounds
          const prices = normalized.map(f => f.pricing.totalFare);
          const minP = Math.min(...prices);
          const maxP = Math.max(...prices);
          setPriceBounds({ min: Math.max(1000, Math.floor(minP * 0.8)), max: Math.ceil(maxP * 1.2) });
          setMaxPriceFilter(Math.ceil(maxP * 1.1));
        } else {
          // If no flights found on that date, load realistic mock flights for rich testing
          setRawFlights(MOCK_FALLBACK_FLIGHTS);
        }
      } else {
        // Fallback to sample flight schedules
        setRawFlights(MOCK_FALLBACK_FLIGHTS);
      }
    } catch (err) {
      console.warn('Backend search error, rendering fallback verified manifests:', err);
      setRawFlights(MOCK_FALLBACK_FLIGHTS);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount or when searchParams change
  useEffect(() => {
    fetchItineraries(departureDate);
  }, []);

  // Swap Route Action with animation
  const handleSwapRoute = () => {
    setSwapRotate(prev => !prev);
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  // Trigger search on form submit
  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    const today = getTodayStr();
    const max = getMaxDateStr();
    if (departureDate < today) {
      setErrorMsg(`Departure date cannot be in the past (${departureDate}). Please select today (${today}) or an upcoming date.`);
      return;
    }
    if (departureDate > max) {
      setErrorMsg(`Departure date exceeds the 90-day booking limit. Schedules are only available up to ${max}.`);
      return;
    }
    if (tripType === 'ROUND_TRIP' && returnDate && returnDate < departureDate) {
      setErrorMsg("Return date cannot depart earlier than departure date.");
      return;
    }
    updateQueryParams(departureDate, returnDate, tripType);
    fetchItineraries(departureDate);
  };

  // Generate Flexible Dates (7 days centered around selected date, strictly future dates)
  const flexibleDates = useMemo(() => {
    const today = getTodayStr();
    const maxDate = getMaxDateStr();
    if (!departureDate) return [];

    // Ensure departureDate is at least today
    const safeDep = departureDate < today ? today : departureDate;
    const [sY, sM, sD] = safeDep.split('-').map(Number);
    const selectedDateObj = new Date(sY, sM - 1, sD);
    if (isNaN(selectedDateObj.getTime())) return [];

    const [tY, tM, tD] = today.split('-').map(Number);
    const todayObj = new Date(tY, tM - 1, tD);

    // Number of days between today and selected date
    const diffDaysFromToday = Math.round((selectedDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));

    // Anchor start offset so we never start before today
    // If selected is 3+ days from today, show 3 before and 3 after (startOffset = -3)
    // If selected is 0, 1, or 2 days from today, start on today (startOffset = -diffDaysFromToday)
    const startOffset = Math.max(-3, -diffDaysFromToday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const offset = startOffset + i;
      const d = new Date(selectedDateObj);
      d.setDate(selectedDateObj.getDate() + offset);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${day}`;

      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const isPast = iso < today;
      const isFutureExceeded = iso > maxDate;
      const isSelected = iso === safeDep;
      const isLowest = i === 1; // 2nd day in strip as lowest fare
      
      // Dynamic realistic fare simulation for flexible strip (INR)
      const fareVariation = Math.abs(offset * 310 + ((i % 3) * 190) - 200);
      const fare = Math.round(4400 + fareVariation);

      days.push({
        iso,
        label: `${weekday}, ${monthDay}`,
        fare,
        isSelected,
        isLowest: isLowest && !isPast && !isFutureExceeded,
        isPast,
        isFutureExceeded
      });
    }
    return days;
  }, [departureDate]);

  // Handle clicking on a flexible date
  const handleSelectFlexibleDate = (isoDate) => {
    const today = getTodayStr();
    const maxDate = getMaxDateStr();
    if (isoDate < today) {
      setErrorMsg(`Sector departure date cannot be in the past. Flight bookings are only permitted for today (${today}) and future dates up to 90 days.`);
      return;
    }
    if (isoDate > maxDate) {
      setErrorMsg("Sector departure date exceeds the 90-day booking limit.");
      return;
    }
    setErrorMsg('');
    setDepartureDate(isoDate);
    if (tripType === 'ROUND_TRIP' && returnDate && returnDate < isoDate) {
      const [y, m, d] = isoDate.split('-').map(Number);
      const nextRet = new Date(y, m - 1, d);
      nextRet.setDate(nextRet.getDate() + 3);
      const rY = nextRet.getFullYear();
      const rM = String(nextRet.getMonth() + 1).padStart(2, '0');
      const rD = String(nextRet.getDate()).padStart(2, '0');
      setReturnDate(`${rY}-${rM}-${rD}`);
    }
    updateQueryParams(isoDate, returnDate, tripType);
    fetchItineraries(isoDate);
  };

  // Extract unique airlines from flights
  const availableAirlines = useMemo(() => {
    const map = {};
    rawFlights.forEach(flight => {
      const seg = flight.segments?.[0];
      const code = seg?.airline?.code || 'HX';
      const name = seg?.airline?.name || 'Horizon-X';
      if (!map[code]) {
        map[code] = { code, name, minFare: flight.pricing.totalFare };
      } else {
        map[code].minFare = Math.min(map[code].minFare, flight.pricing.totalFare);
      }
    });
    return Object.values(map);
  }, [rawFlights]);

  // Dynamic min fares for Stops filter based on active search
  const stopsMinFares = useMemo(() => {
    let direct = null;
    let oneStop = null;
    let twoPlus = null;
    rawFlights.forEach(f => {
      const fare = f.pricing?.totalFare;
      if (!fare) return;
      if (f.isDirect) {
        if (direct === null || fare < direct) direct = fare;
      } else if (f.layovers?.length === 1) {
        if (oneStop === null || fare < oneStop) oneStop = fare;
      } else if (f.layovers?.length >= 2) {
        if (twoPlus === null || fare < twoPlus) twoPlus = fare;
      }
    });
    return { direct, oneStop, twoPlus };
  }, [rawFlights]);

  // Toggle single airline checkbox
  const handleToggleAirline = (code) => {
    setSelectedAirlineCodes(prev => {
      // If currently all airlines are active (empty array), checking an airline isolates it
      if (prev.length === 0) {
        return [code];
      }
      if (prev.includes(code)) {
        const next = prev.filter(c => c !== code);
        return next;
      }
      return [...prev, code];
    });
  };

  // 1-Click "Only" airline selection
  const handleSelectOnlyAirline = (code) => {
    setSelectedAirlineCodes([code]);
  };

  // Filter & Sort Logic
  const filteredFlights = useMemo(() => {
    return rawFlights
      .filter(flight => {
        // 1. Stops Filter
        if (flight.isDirect && !filterStops.direct) return false;
        if (!flight.isDirect && flight.layovers.length === 1 && !filterStops.oneStop) return false;
        if (!flight.isDirect && flight.layovers.length >= 2 && !filterStops.twoPlus) return false;

        // 2. Price Filter
        if (flight.pricing.totalFare > maxPriceFilter) return false;

        // 3. Departure Time Slot Filter
        const depHour = new Date(flight.departureTime).getUTCHours();
        const anyTimeActive = Object.values(selectedTimeSlots).some(Boolean);
        if (anyTimeActive) {
          const matchEarly = selectedTimeSlots.earlyMorning && depHour >= 0 && depHour < 6;
          const matchMorning = selectedTimeSlots.morning && depHour >= 6 && depHour < 12;
          const matchAfternoon = selectedTimeSlots.afternoon && depHour >= 12 && depHour < 18;
          const matchEvening = selectedTimeSlots.evening && depHour >= 18 && depHour <= 24;
          if (!matchEarly && !matchMorning && !matchAfternoon && !matchEvening) return false;
        }

        // 4. Airlines Filter (Accurate OTA selection)
        const firstCode = flight.segments?.[0]?.airline?.code;
        if (selectedAirlineCodes.length > 0 && !selectedAirlineCodes.includes(firstCode)) {
          return false;
        }

        // 5. Features Filter
        if (featuresFilter.freeMeal && !flight.features?.meal) return false;
        if (featuresFilter.baggage && !flight.features?.baggage) return false;
        if (featuresFilter.wifi && !flight.features?.wifi) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'cheapest') {
          return a.pricing.totalFare - b.pricing.totalFare;
        }
        if (sortBy === 'fastest') {
          return a.totalDuration - b.totalDuration;
        }
        if (sortBy === 'bestValue') {
          const scoreA = a.pricing.totalFare * 0.7 + a.totalDuration * 0.3;
          const scoreB = b.pricing.totalFare * 0.7 + b.totalDuration * 0.3;
          return scoreA - scoreB;
        }
        if (sortBy === 'earliest') {
          return new Date(a.departureTime) - new Date(b.departureTime);
        }
        return 0;
      });
  }, [rawFlights, filterStops, maxPriceFilter, selectedTimeSlots, selectedAirlineCodes, featuresFilter, sortBy]);

  // Dynamic recommendations based on user filter selection
  const recommendedFlightId = useMemo(() => {
    return filteredFlights[0]?.id || null;
  }, [filteredFlights]);

  const cheapestFlightId = useMemo(() => {
    if (!filteredFlights.length) return null;
    return filteredFlights.reduce((min, f) => 
      (!min || f.pricing.totalFare < min.pricing.totalFare) ? f : min, null)?.id || null;
  }, [filteredFlights]);

  // Reset pagination when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStops, maxPriceFilter, selectedTimeSlots, selectedAirlineCodes, featuresFilter, sortBy, departureDate]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredFlights.length / itemsPerPage));
  const paginatedFlights = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFlights.slice(start, start + itemsPerPage);
  }, [filteredFlights, currentPage, itemsPerPage]);

  // Toggle Flight Details Drawer
  const toggleFlightDetails = (id) => {
    setExpandedDetails(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Format Time display in UTC for exact alignment with aviation schedules (e.g. "19:45")
  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--';
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  // Format Duration display
  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  // Reset all filters
  const handleClearFilters = () => {
    setFilterStops({ direct: true, oneStop: true, twoPlus: true });
    setMaxPriceFilter(priceBounds.max);
    setSelectedTimeSlots({ earlyMorning: false, morning: false, afternoon: false, evening: false });
    setSelectedAirlineCodes([]);
    setFeaturesFilter({ freeMeal: false, baggage: false, wifi: false });
    setCurrentPage(1);
  };

  // Lowest price for Cheapest tab badge
  const lowestPriceFound = useMemo(() => {
    if (filteredFlights.length === 0) return 4430;
    return Math.min(...filteredFlights.map(f => f.pricing.totalFare));
  }, [filteredFlights]);

  // Fastest duration for Fastest tab badge
  const fastestDurationFound = useMemo(() => {
    if (filteredFlights.length === 0) return '2h 45m';
    const minM = Math.min(...filteredFlights.map(f => f.totalDuration));
    return formatDuration(minM);
  }, [filteredFlights]);

  return (
    <div className="bg-[#fbf9f8] dark:bg-slate-950 text-[#1b1c1c] dark:text-slate-100 font-sans min-h-screen flex flex-col transition-colors duration-200 antialiased selection:bg-blue-100 selection:text-blue-900">

      {/* ==============================================================
         1. TOP NAVIGATION BAR (Fixed, High Contrast, Brand Compliant)
         ============================================================== */}
      <header className="fixed top-0 left-0 w-full z-50 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#E6E6E6] dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-[1200px] mx-auto px-4 md:px-10 h-full flex items-center justify-between">
          
          {/* Brand Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-[#005cab] dark:text-blue-400 tracking-tight group">
              <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-[28px] group-hover:scale-110 transition-transform">
                flight_takeoff
              </span>
              <span>Horizon<span className="text-blue-500">-X</span></span>
            </Link>

            <nav className="hidden md:flex items-center space-x-6 text-[15px]">
              <Link 
                to="/flights" 
                className="text-[#005cab] dark:text-blue-400 font-bold border-b-2 border-[#005cab] dark:border-blue-400 pb-1"
              >
                Flights
              </Link>
              <Link 
                to="/bookings" 
                className="text-[#566476] dark:text-slate-400 hover:text-[#005cab] dark:hover:text-blue-400 font-medium transition-colors"
              >
                My Bookings
              </Link>
              <a 
                href="/#deals" 
                className="text-[#566476] dark:text-slate-400 hover:text-[#005cab] dark:hover:text-blue-400 font-medium transition-colors"
              >
                Deals
              </a>
              <a 
                href="/#support" 
                className="text-[#566476] dark:text-slate-400 hover:text-[#005cab] dark:hover:text-blue-400 font-medium transition-colors"
              >
                Support
              </a>
            </nav>
          </div>

          {/* Trailing Controls & Auth Links (Cleartrip unified Sign In, no Create Account) */}
          <div className="flex items-center gap-3">
            <ThemeToggle showLabel={false} />

            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/bookings"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#005cab] dark:hover:text-blue-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#005cab] dark:text-blue-400">airplane_ticket</span>
                  <span className="hidden sm:inline">My Bookings</span>
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
              <Link 
                to="/signin" 
                className="bg-[#005cab] hover:bg-[#004786] text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">account_circle</span>
                <span>Sign In</span>
              </Link>
            )}
          </div>

        </div>
      </header>

      {/* ==============================================================
         2. MAIN WORKSPACE CANVAS
         ============================================================== */}
      <main className="flex-grow pt-20 pb-16 max-w-[1200px] mx-auto px-4 md:px-10 w-full">

        {/* ──────────────────────────────────────────────────────────
           SEARCH MODIFIER BAR (Trip Type, Route, Dates, Travellers)
           ────────────────────────────────────────────────────────── */}
        <section className="mt-4 mb-6 bg-white dark:bg-slate-900 border border-[#E6E6E6] dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          
          {/* Trip Type Tabs & Guarantees */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E6E6E6] dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setTripType('ONEWAY');
                  setReturnDate('');
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  tripType === 'ONEWAY'
                    ? 'bg-[#005cab] text-white shadow-sm'
                    : 'bg-[#f5f3f3] dark:bg-slate-800 text-[#404754] dark:text-slate-300 hover:bg-[#d3e1f6] dark:hover:bg-slate-700'
                }`}
              >
                One Way
              </button>
              <button
                type="button"
                onClick={() => {
                  setTripType('ROUND_TRIP');
                  const today = getTodayStr();
                  const max = getMaxDateStr();
                  if (!returnDate || returnDate < departureDate) {
                    const [dY, dM, dD] = (departureDate || today).split('-').map(Number);
                    const ret = new Date(dY, dM - 1, dD);
                    ret.setDate(ret.getDate() + 3);
                    const rY = ret.getFullYear();
                    const rM = String(ret.getMonth() + 1).padStart(2, '0');
                    const rD = String(ret.getDate()).padStart(2, '0');
                    const nextRet = `${rY}-${rM}-${rD}`;
                    setReturnDate(nextRet <= max ? nextRet : max);
                  }
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  tripType === 'ROUND_TRIP'
                    ? 'bg-[#005cab] text-white shadow-sm'
                    : 'bg-[#f5f3f3] dark:bg-slate-800 text-[#404754] dark:text-slate-300 hover:bg-[#d3e1f6] dark:hover:bg-slate-700'
                }`}
              >
                Round Trip
              </button>
              <button
                type="button"
                onClick={() => {
                  setTripType('MULTI_CITY');
                  setReturnDate('');
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  tripType === 'MULTI_CITY'
                    ? 'bg-[#005cab] text-white shadow-sm'
                    : 'bg-[#f5f3f3] dark:bg-slate-800 text-[#404754] dark:text-slate-300 hover:bg-[#d3e1f6] dark:hover:bg-slate-700'
                }`}
              >
                Multi-City
              </button>
            </div>

            <div className="flex items-center gap-3 text-[#566476] dark:text-slate-400 text-xs font-medium">
              <span className="flex items-center gap-1 text-[#00A698] font-semibold">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Best Price Guaranteed
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:flex items-center gap-1 text-[#005cab] dark:text-blue-400 font-semibold">
                <span className="material-symbols-outlined text-[16px]">luggage</span>
                Free Cabin Baggage Included
              </span>
            </div>
          </div>

          {/* Standard One-Way & Round-Trip Inputs */}
          {tripType !== 'MULTI_CITY' ? (
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 mt-4 items-center">
              
              {/* Origin Field */}
              <div 
                onClick={() => setAirportModal('origin')}
                className={`${
                  tripType === 'ROUND_TRIP' ? 'md:col-span-3 lg:col-span-2' : 'md:col-span-3'
                } bg-[#f5f3f3] dark:bg-slate-800/80 hover:bg-[#ebf3fc] dark:hover:bg-slate-800 rounded-xl p-3 border border-transparent hover:border-[#005cab] transition-all cursor-pointer`}
              >
                <label className="block text-[11px] font-semibold text-[#566476] dark:text-slate-400 uppercase tracking-wider">
                  From
                </label>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-xl font-black text-[#1b1c1c] dark:text-white tracking-tight">
                    {origin}
                  </span>
                  <span className="text-xs text-[#566476] dark:text-slate-400 truncate ml-2">
                    {airportDirectory[origin]?.city || origin}, {airportDirectory[origin]?.airport?.split(',')[0]}
                  </span>
                </div>
              </div>

              {/* Route Switcher Button */}
              <div className={`${
                tripType === 'ROUND_TRIP' ? 'hidden lg:flex justify-center -mx-3 z-10 lg:col-span-1' : 'hidden md:flex justify-center -mx-3 z-10 md:col-span-1'
              }`}>
                <button
                  type="button"
                  onClick={handleSwapRoute}
                  aria-label="Swap origin and destination"
                  className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-[#E6E6E6] dark:border-slate-700 flex items-center justify-center text-[#005cab] dark:text-blue-400 hover:scale-110 shadow-xs transition-all duration-300 cursor-pointer"
                >
                  <span 
                    className="material-symbols-outlined text-[18px] transition-transform duration-300"
                    style={{ transform: swapRotate ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    sync_alt
                  </span>
                </button>
              </div>

              {/* Destination Field */}
              <div 
                onClick={() => setAirportModal('destination')}
                className={`${
                  tripType === 'ROUND_TRIP' ? 'md:col-span-3 lg:col-span-2' : 'md:col-span-3'
                } bg-[#f5f3f3] dark:bg-slate-800/80 hover:bg-[#ebf3fc] dark:hover:bg-slate-800 rounded-xl p-3 border border-transparent hover:border-[#005cab] transition-all cursor-pointer`}
              >
                <label className="block text-[11px] font-semibold text-[#566476] dark:text-slate-400 uppercase tracking-wider">
                  To
                </label>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-xl font-black text-[#1b1c1c] dark:text-white tracking-tight">
                    {destination}
                  </span>
                  <span className="text-xs text-[#566476] dark:text-slate-400 truncate ml-2">
                    {airportDirectory[destination]?.city || destination}, {airportDirectory[destination]?.airport?.split(',')[0]}
                  </span>
                </div>
              </div>

              {/* Departure Date Field */}
              <div 
                onClick={() => triggerDatePicker(depDateInputRef)}
                className={`${
                  tripType === 'ROUND_TRIP' ? 'md:col-span-3 lg:col-span-2' : 'md:col-span-2'
                } bg-[#f5f3f3] dark:bg-slate-800/80 hover:bg-[#ebf3fc] dark:hover:bg-slate-800 rounded-xl p-3 border border-transparent hover:border-[#005cab] focus-within:border-[#005cab] transition-all cursor-pointer select-none`}
              >
                <label className="block text-[11px] font-semibold text-[#566476] dark:text-slate-400 uppercase tracking-wider cursor-pointer" htmlFor="dep-date">
                  Departure Date
                </label>
                <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-[#1b1c1c] dark:text-white">
                  <span className="material-symbols-outlined text-[18px] text-[#005cab] dark:text-blue-400 flex-shrink-0 pointer-events-none">
                    calendar_month
                  </span>
                  <input
                    ref={depDateInputRef}
                    id="dep-date"
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
                        setErrorMsg(`Departure date cannot be in the past (${val}).`);
                        return;
                      }
                      setErrorMsg('');
                      setDepartureDate(val);
                      if (tripType === 'ROUND_TRIP' && returnDate && returnDate < val) {
                        setReturnDate(val);
                      }
                    }}
                    className="bg-transparent font-medium border-none outline-none focus:ring-0 text-xs text-[#1b1c1c] dark:text-white cursor-pointer w-full p-0 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>
              </div>

              {/* Return Date Field (Shown when Round Trip is selected) */}
              {tripType === 'ROUND_TRIP' && (
                <div 
                  onClick={() => triggerDatePicker(retDateInputRef)}
                  className="md:col-span-3 lg:col-span-2 bg-[#f5f3f3] dark:bg-slate-800/80 hover:bg-[#ebf3fc] dark:hover:bg-slate-800 rounded-xl p-3 border border-transparent hover:border-[#005cab] focus-within:border-[#005cab] transition-all cursor-pointer select-none"
                >
                  <label className="block text-[11px] font-semibold text-[#566476] dark:text-slate-400 uppercase tracking-wider cursor-pointer" htmlFor="ret-date">
                    Return Date
                  </label>
                  <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-[#1b1c1c] dark:text-white">
                    <span className="material-symbols-outlined text-[18px] text-[#005cab] dark:text-blue-400 flex-shrink-0 pointer-events-none">
                      event_repeat
                    </span>
                    <input
                      ref={retDateInputRef}
                      id="ret-date"
                      type="date"
                      value={returnDate || departureDate}
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
                          setErrorMsg(`Return date cannot be earlier than departure date.`);
                          return;
                        }
                        setErrorMsg('');
                        setReturnDate(val);
                      }}
                      className="bg-transparent font-medium border-none outline-none focus:ring-0 text-xs text-[#1b1c1c] dark:text-white cursor-pointer w-full p-0 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Travellers & Cabin Class Dropdown */}
              <div className={`relative ${
                tripType === 'ROUND_TRIP' ? 'md:col-span-4 lg:col-span-2' : 'md:col-span-2'
              }`} ref={paxRef}>
                <div 
                  onClick={() => setIsPaxDropdownOpen(!isPaxDropdownOpen)}
                  className="bg-[#f5f3f3] dark:bg-slate-800/80 hover:bg-[#ebf3fc] dark:hover:bg-slate-800 rounded-xl p-3 border border-transparent hover:border-[#005cab] transition-all cursor-pointer"
                >
                  <label className="block text-[11px] font-semibold text-[#566476] dark:text-slate-400 uppercase tracking-wider">
                    Traveller & Class
                  </label>
                  <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-[#1b1c1c] dark:text-white truncate">
                    <span className="material-symbols-outlined text-[18px] text-[#005cab] dark:text-blue-400">
                      person
                    </span>
                    <span>{paxCounts.adults + paxCounts.children + paxCounts.infants} Traveller, {cabinClass}</span>
                  </div>
                </div>

                {/* Dropdown Popover */}
                {isPaxDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-[#E6E6E6] dark:border-slate-800 rounded-2xl shadow-xl p-4 z-40 animate-fadeIn">
                    <div className="space-y-3 pb-3 border-b border-[#E6E6E6] dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-[#1b1c1c] dark:text-white">Adults</p>
                          <p className="text-[10px] text-[#566476] dark:text-slate-400">Age 12+ years</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => setPaxCounts(p => ({ ...p, adults: Math.max(1, p.adults - 1) }))}
                            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm hover:bg-slate-200"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{paxCounts.adults}</span>
                          <button 
                            type="button"
                            onClick={() => setPaxCounts(p => ({ ...p, adults: Math.min(9, p.adults + 1) }))}
                            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm hover:bg-slate-200"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-[#1b1c1c] dark:text-white">Children</p>
                          <p className="text-[10px] text-[#566476] dark:text-slate-400">Age 2-11 years</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => setPaxCounts(p => ({ ...p, children: Math.max(0, p.children - 1) }))}
                            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm hover:bg-slate-200"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{paxCounts.children}</span>
                          <button 
                            type="button"
                            onClick={() => setPaxCounts(p => ({ ...p, children: Math.min(6, p.children + 1) }))}
                            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm hover:bg-slate-200"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-[#1b1c1c] dark:text-white">Infants</p>
                          <p className="text-[10px] text-[#566476] dark:text-slate-400">Under 2 years (lap)</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => setPaxCounts(p => ({ ...p, infants: Math.max(0, p.infants - 1) }))}
                            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm hover:bg-slate-200"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{paxCounts.infants}</span>
                          <button 
                            type="button"
                            onClick={() => setPaxCounts(p => ({ ...p, infants: Math.min(p.adults, p.infants + 1) }))}
                            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm hover:bg-slate-200"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3">
                      <label className="block text-[11px] font-semibold text-[#566476] dark:text-slate-400 mb-1.5 uppercase">
                        Cabin Class
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'].map(cClass => (
                          <button
                            key={cClass}
                            type="button"
                            onClick={() => setCabinClass(cClass)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                              cabinClass === cClass 
                                ? 'bg-[#005cab] text-white' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {cClass.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Search Action CTA Button */}
              <div className={`${
                tripType === 'ROUND_TRIP' ? 'md:col-span-2 lg:col-span-1' : 'md:col-span-1'
              }`}>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-full min-h-[56px] bg-[#005cab] hover:bg-[#004786] active:scale-95 text-white rounded-xl flex items-center justify-center p-3 transition shadow-sm cursor-pointer"
                  title="Search Flights"
                >
                  {loading ? (
                    <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[24px]">search</span>
                  )}
                </button>
              </div>

            </form>
          ) : (
            /* Multi-City Journey Builder */
            <div className="space-y-3 mt-4">
              {multiCitySectors.map((sector, sIdx) => (
                <div key={sIdx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#f5f3f3] dark:bg-slate-800/60 p-3 rounded-xl border border-[#E6E6E6] dark:border-slate-800">
                  <div className="md:col-span-1 font-bold text-xs text-[#005cab] dark:text-blue-400">
                    Sector {sIdx + 1}
                  </div>
                  <div 
                    onClick={() => setAirportModal({ multiIndex: sIdx, field: 'origin' })}
                    className="md:col-span-4 bg-white dark:bg-slate-900 rounded-lg p-2.5 cursor-pointer border border-[#E6E6E6] dark:border-slate-700 hover:border-[#005cab] transition"
                  >
                    <span className="text-[10px] text-slate-400 block font-semibold">FROM</span>
                    <span className="font-bold text-sm">{sector.origin}</span> - {airportDirectory[sector.origin]?.city || sector.origin}
                  </div>
                  <div 
                    onClick={() => setAirportModal({ multiIndex: sIdx, field: 'destination' })}
                    className="md:col-span-4 bg-white dark:bg-slate-900 rounded-lg p-2.5 cursor-pointer border border-[#E6E6E6] dark:border-slate-700 hover:border-[#005cab] transition"
                  >
                    <span className="text-[10px] text-slate-400 block font-semibold">TO</span>
                    <span className="font-bold text-sm">{sector.destination}</span> - {airportDirectory[sector.destination]?.city || sector.destination}
                  </div>
                  <div 
                    onClick={(e) => {
                      const inp = e.currentTarget.querySelector('input[type="date"]');
                      try { inp?.showPicker(); } catch(_) { inp?.focus(); }
                    }}
                    className="md:col-span-3 bg-white dark:bg-slate-900 rounded-lg p-2.5 border border-[#E6E6E6] dark:border-slate-700 cursor-pointer hover:border-[#005cab] transition select-none"
                  >
                    <span className="text-[10px] text-slate-400 block font-semibold">DATE</span>
                    <input 
                      type="date"
                      min={sIdx === 0 ? todayStr : (multiCitySectors[sIdx - 1]?.travelDate || todayStr)}
                      max={maxDateStr}
                      value={sector.travelDate}
                      onClick={(e) => {
                        e.stopPropagation();
                        try { e.target.showPicker(); } catch(_) {}
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val || val < todayStr) return;
                        const updated = [...multiCitySectors];
                        updated[sIdx].travelDate = val;
                        setMultiCitySectors(updated);
                      }}
                      className="bg-transparent font-medium text-xs text-[#1b1c1c] dark:text-white border-none p-0 outline-none w-full cursor-pointer [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const lastSec = multiCitySectors[multiCitySectors.length - 1];
                    setMultiCitySectors([...multiCitySectors, { origin: lastSec.destination, destination: 'CCU', travelDate: lastSec.travelDate }]);
                  }}
                  className="text-xs font-bold text-[#005cab] dark:text-blue-400 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  Add Another Flight Sector
                </button>
                <button
                  type="button"
                  onClick={() => fetchItineraries(multiCitySectors[0].travelDate)}
                  className="px-6 py-2.5 bg-[#005cab] text-white rounded-xl text-xs font-bold shadow hover:bg-[#004786] transition cursor-pointer"
                >
                  Search Multi-City Schedules
                </button>
              </div>
            </div>
          )}

        </section>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 text-xs font-semibold animate-fadeIn shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-amber-600 dark:text-amber-400 flex-shrink-0">
                error
              </span>
              <span>{errorMsg}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setErrorMsg('')} 
              className="p-1 hover:bg-amber-200/50 dark:hover:bg-amber-800/50 rounded cursor-pointer"
              title="Dismiss"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
           COMPREHENSIVE DATE FARE STRIP (Horizontal Flexible Dates)
           ────────────────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[#1b1c1c] dark:text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-[20px]">
                payments
              </span>
              Lowest Fares for Flexible Dates
            </h2>
            <span className="text-xs text-[#566476] dark:text-slate-400 font-semibold">
              Prices in INR (₹)
            </span>
          </div>

          <div className="flex items-center space-x-2.5 overflow-x-auto no-scrollbar py-1">
            {flexibleDates.map((item) => (
              <button
                key={item.iso}
                type="button"
                disabled={item.isPast || item.isFutureExceeded}
                onClick={() => {
                  if (item.isPast || item.isFutureExceeded) return;
                  handleSelectFlexibleDate(item.iso);
                }}
                className={`flex-shrink-0 min-w-[136px] p-3 text-center rounded-xl border transition-all relative select-none ${
                  item.isPast || item.isFutureExceeded
                    ? 'border-dashed border-slate-300 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 opacity-40 cursor-not-allowed'
                    : item.isSelected
                      ? 'border-2 border-[#005cab] bg-[#F2F8FF] dark:bg-slate-800 ring-1 ring-[#005cab] shadow-sm cursor-pointer'
                      : item.isLowest
                        ? 'border-[#00A698] bg-white dark:bg-slate-900 hover:border-[#00A698] cursor-pointer'
                        : 'border-[#E6E6E6] dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#005cab] cursor-pointer'
                }`}
              >
                {item.isPast ? (
                  <div className="inline-block px-1.5 py-0.5 rounded bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-bold mb-1 tracking-wider uppercase">
                    PAST DATE
                  </div>
                ) : item.isSelected ? (
                  <div className="inline-block px-1.5 py-0.5 rounded bg-[#005cab] text-white text-[9px] font-bold mb-1 tracking-wider">
                    SELECTED
                  </div>
                ) : item.isLowest ? (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-[#00A698] text-white text-[9px] font-bold uppercase tracking-wider">
                    Lowest
                  </span>
                ) : null}
                <span className={`block text-xs ${
                  item.isPast
                    ? 'text-slate-400 dark:text-slate-500 line-through'
                    : item.isSelected 
                      ? 'text-[#005cab] dark:text-blue-400 font-bold' 
                      : 'text-[#404754] dark:text-slate-400'
                }`}>
                  {item.label}
                </span>
                <span className={`block text-base font-bold mt-1 ${
                  item.isPast
                    ? 'text-slate-400 dark:text-slate-500 text-sm'
                    : item.isSelected
                      ? 'text-[#005cab] dark:text-blue-400 text-lg'
                      : item.isLowest
                        ? 'text-[#00A698]'
                        : 'text-[#1b1c1c] dark:text-white'
                }`}>
                  {item.isPast ? 'Unavailable' : `₹${item.fare.toLocaleString('en-IN')}`}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
           3. 2-COLUMN SEARCH RESULTS LAYOUT (Filters + Listings)
           ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ==============================================================
             LEFT FILTER SIDEBAR (Sticky Desktop Filters)
             ============================================================== */}
          <aside className="lg:col-span-3 space-y-6 bg-white dark:bg-slate-900 border border-[#E6E6E6] dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E6E6] dark:border-slate-800">
              <span className="text-lg font-bold text-[#1b1c1c] dark:text-white">
                Filters
              </span>
              <button 
                type="button" 
                onClick={handleClearFilters}
                className="text-[#005cab] dark:text-blue-400 text-xs font-semibold hover:underline cursor-pointer"
              >
                Clear All
              </button>
            </div>

            {/* Filter: Stops */}
            <div>
              <h3 className="text-xs font-bold text-[#1b1c1c] dark:text-white uppercase tracking-wider mb-3">
                Stops From {origin}
              </h3>
              <div className="space-y-2.5">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={filterStops.direct}
                      onChange={(e) => setFilterStops(p => ({ ...p, direct: e.target.checked }))}
                      className="rounded text-[#005cab] focus:ring-[#005cab] h-4 w-4 border-slate-300 dark:border-slate-700"
                    />
                    <span className="text-xs text-[#1b1c1c] dark:text-slate-300 group-hover:text-[#005cab] transition-colors">
                      Non-Stop (Direct)
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-[#566476] dark:text-slate-400">
                    {stopsMinFares.direct ? `₹${stopsMinFares.direct.toLocaleString('en-IN')}` : '—'}
                  </span>
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={filterStops.oneStop}
                      onChange={(e) => setFilterStops(p => ({ ...p, oneStop: e.target.checked }))}
                      className="rounded text-[#005cab] focus:ring-[#005cab] h-4 w-4 border-slate-300 dark:border-slate-700"
                    />
                    <span className="text-xs text-[#1b1c1c] dark:text-slate-300 group-hover:text-[#005cab] transition-colors">
                      1 Stop
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-[#566476] dark:text-slate-400">
                    {stopsMinFares.oneStop ? `₹${stopsMinFares.oneStop.toLocaleString('en-IN')}` : '—'}
                  </span>
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={filterStops.twoPlus}
                      onChange={(e) => setFilterStops(p => ({ ...p, twoPlus: e.target.checked }))}
                      className="rounded text-[#005cab] focus:ring-[#005cab] h-4 w-4 border-slate-300 dark:border-slate-700"
                    />
                    <span className="text-xs text-[#1b1c1c] dark:text-slate-300 group-hover:text-[#005cab] transition-colors">
                      2+ Stops
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-[#566476] dark:text-slate-400">
                    {stopsMinFares.twoPlus ? `₹${stopsMinFares.twoPlus.toLocaleString('en-IN')}` : '—'}
                  </span>
                </label>
              </div>
            </div>

            <hr className="border-[#E6E6E6] dark:border-slate-800" />

            {/* Filter: Max Price Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-[#1b1c1c] dark:text-white uppercase tracking-wider">
                  Max Price
                </h3>
                <span className="text-xs font-bold text-[#005cab] dark:text-blue-400">
                  ₹{maxPriceFilter.toLocaleString('en-IN')}
                </span>
              </div>
              <input 
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={250}
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                className="w-full accent-[#005cab] h-2 bg-[#f5f3f3] dark:bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#566476] dark:text-slate-400 mt-1">
                <span>₹{priceBounds.min.toLocaleString('en-IN')}</span>
                <span>₹{priceBounds.max.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <hr className="border-[#E6E6E6] dark:border-slate-800" />

            {/* Filter: Departure Time Slots */}
            <div>
              <h3 className="text-xs font-bold text-[#1b1c1c] dark:text-white uppercase tracking-wider mb-3">
                Departure from {origin}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                
                {/* Early Morning */}
                <button
                  type="button"
                  onClick={() => setSelectedTimeSlots(p => ({ ...p, earlyMorning: !p.earlyMorning }))}
                  className={`p-2.5 rounded-xl text-left transition flex flex-col cursor-pointer ${
                    selectedTimeSlots.earlyMorning
                      ? 'border-2 border-[#005cab] bg-[#F2F8FF] dark:bg-slate-800'
                      : 'border border-[#E6E6E6] dark:border-slate-800 hover:border-[#005cab]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-[#005cab] dark:text-blue-400">
                    wb_twilight
                  </span>
                  <span className="text-xs font-semibold mt-1">Early Morning</span>
                  <span className="text-[10px] text-[#566476] dark:text-slate-400">00:00 - 06:00</span>
                </button>

                {/* Morning */}
                <button
                  type="button"
                  onClick={() => setSelectedTimeSlots(p => ({ ...p, morning: !p.morning }))}
                  className={`p-2.5 rounded-xl text-left transition flex flex-col cursor-pointer ${
                    selectedTimeSlots.morning
                      ? 'border-2 border-[#005cab] bg-[#F2F8FF] dark:bg-slate-800'
                      : 'border border-[#E6E6E6] dark:border-slate-800 hover:border-[#005cab]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-[#005cab] dark:text-blue-400">
                    wb_sunny
                  </span>
                  <span className="text-xs font-semibold mt-1">Morning</span>
                  <span className="text-[10px] text-[#566476] dark:text-slate-400">06:00 - 12:00</span>
                </button>

                {/* Afternoon */}
                <button
                  type="button"
                  onClick={() => setSelectedTimeSlots(p => ({ ...p, afternoon: !p.afternoon }))}
                  className={`p-2.5 rounded-xl text-left transition flex flex-col cursor-pointer ${
                    selectedTimeSlots.afternoon
                      ? 'border-2 border-[#005cab] bg-[#F2F8FF] dark:bg-slate-800'
                      : 'border border-[#E6E6E6] dark:border-slate-800 hover:border-[#005cab]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-[#005cab] dark:text-blue-400">
                    light_mode
                  </span>
                  <span className="text-xs font-semibold mt-1">Afternoon</span>
                  <span className="text-[10px] text-[#566476] dark:text-slate-400">12:00 - 18:00</span>
                </button>

                {/* Evening */}
                <button
                  type="button"
                  onClick={() => setSelectedTimeSlots(p => ({ ...p, evening: !p.evening }))}
                  className={`p-2.5 rounded-xl text-left transition flex flex-col cursor-pointer ${
                    selectedTimeSlots.evening
                      ? 'border-2 border-[#005cab] bg-[#F2F8FF] dark:bg-slate-800'
                      : 'border border-[#E6E6E6] dark:border-slate-800 hover:border-[#005cab]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-[#005cab] dark:text-blue-400">
                    bedtime
                  </span>
                  <span className="text-xs font-semibold mt-1">Evening</span>
                  <span className="text-[10px] text-[#566476] dark:text-slate-400">18:00 - 24:00</span>
                </button>

              </div>
            </div>

            <hr className="border-[#E6E6E6] dark:border-slate-800" />

            {/* Filter: Airlines */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#1b1c1c] dark:text-white uppercase tracking-wider">
                  Airlines
                </h3>
                {selectedAirlineCodes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedAirlineCodes([])}
                    className="text-[11px] text-[#005cab] dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="space-y-2.5">
                {availableAirlines.map(airline => {
                  const isChecked = selectedAirlineCodes.length === 0 || selectedAirlineCodes.includes(airline.code);
                  return (
                    <div key={airline.code} className="flex items-center justify-between group py-0.5">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleToggleAirline(airline.code)}
                          className="rounded text-[#005cab] focus:ring-[#005cab] h-4 w-4 border-slate-300 dark:border-slate-700 cursor-pointer"
                        />
                        <span className="text-xs text-[#1b1c1c] dark:text-slate-300 group-hover:text-[#005cab] transition-colors font-medium">
                          {airline.name}
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#566476] dark:text-slate-400">
                          From ₹{airline.minFare.toLocaleString('en-IN')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSelectOnlyAirline(airline.code)}
                          className="text-[10px] font-bold uppercase tracking-wider text-[#005cab] dark:text-blue-400 hover:underline px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 cursor-pointer transition-colors"
                          title={`Show ${airline.name} flights only`}
                        >
                          Only
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <hr className="border-[#E6E6E6] dark:border-slate-800" />

            {/* Filter: Flight Features */}
            <div>
              <h3 className="text-xs font-bold text-[#1b1c1c] dark:text-white uppercase tracking-wider mb-3">
                Flight Features
              </h3>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={featuresFilter.freeMeal}
                    onChange={(e) => setFeaturesFilter(p => ({ ...p, freeMeal: e.target.checked }))}
                    className="rounded text-[#005cab] focus:ring-[#005cab] h-4 w-4 border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-xs text-[#1b1c1c] dark:text-slate-300">Free In-Flight Meal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={featuresFilter.baggage}
                    onChange={(e) => setFeaturesFilter(p => ({ ...p, baggage: e.target.checked }))}
                    className="rounded text-[#005cab] focus:ring-[#005cab] h-4 w-4 border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-xs text-[#1b1c1c] dark:text-slate-300">Check-in Baggage Included</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={featuresFilter.wifi}
                    onChange={(e) => setFeaturesFilter(p => ({ ...p, wifi: e.target.checked }))}
                    className="rounded text-[#005cab] focus:ring-[#005cab] h-4 w-4 border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-xs text-[#1b1c1c] dark:text-slate-300">Wi-Fi on Board</span>
                </label>
              </div>
            </div>

          </aside>

          {/* ==============================================================
             RIGHT FLIGHT LISTINGS (Sorting Header + Flight Cards)
             ============================================================== */}
          <section className="lg:col-span-9 space-y-4">
            
            {/* Sorting Tabs Header */}
            <div className="bg-white dark:bg-slate-900 border border-[#E6E6E6] dark:border-slate-800 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
              
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  type="button"
                  onClick={() => setSortBy('cheapest')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    sortBy === 'cheapest'
                      ? 'bg-[#005cab] text-white shadow-xs'
                      : 'text-[#566476] dark:text-slate-300 hover:bg-[#f5f3f3] dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px]">verified</span>
                  <span>Cheapest</span>
                  <span className="text-[11px] opacity-90 pl-0.5">₹{lowestPriceFound.toLocaleString('en-IN')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortBy('fastest')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    sortBy === 'fastest'
                      ? 'bg-[#005cab] text-white shadow-xs'
                      : 'text-[#566476] dark:text-slate-300 hover:bg-[#f5f3f3] dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px]">bolt</span>
                  <span>Fastest</span>
                  <span className="text-[11px] opacity-90 pl-0.5">{fastestDurationFound}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortBy('bestValue')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    sortBy === 'bestValue'
                      ? 'bg-[#005cab] text-white shadow-xs'
                      : 'text-[#566476] dark:text-slate-300 hover:bg-[#f5f3f3] dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px]">thumb_up</span>
                  <span>Best Value</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortBy('earliest')}
                  className={`hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold items-center gap-1.5 transition cursor-pointer ${
                    sortBy === 'earliest'
                      ? 'bg-[#005cab] text-white shadow-xs'
                      : 'text-[#566476] dark:text-slate-300 hover:bg-[#f5f3f3] dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px]">schedule</span>
                  <span>Earliest Departure</span>
                </button>
              </div>

              <div className="text-xs font-medium text-[#566476] dark:text-slate-400 px-3">
                Showing <strong className="text-[#1b1c1c] dark:text-white font-bold">{filteredFlights.length} flights</strong> found
              </div>

            </div>

            {/* Active Airline Filter Quick-Pill */}
            {selectedAirlineCodes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pb-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Active Filter:</span>
                {selectedAirlineCodes.map(code => {
                  const air = availableAirlines.find(a => a.code === code);
                  return (
                    <span 
                      key={code} 
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#005cab] text-white shadow-xs"
                    >
                      <span>{air?.name || code} Only</span>
                      <button 
                        type="button" 
                        onClick={() => handleToggleAirline(code)} 
                        className="hover:text-amber-200 cursor-pointer flex items-center"
                        title="Remove filter"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    </span>
                  );
                })}
                <button 
                  type="button" 
                  onClick={() => setSelectedAirlineCodes([])} 
                  className="text-xs text-[#005cab] dark:text-blue-400 hover:underline font-semibold cursor-pointer ml-1"
                >
                  Show All Airlines
                </button>
              </div>
            )}

            {/* Flight Cards List */}
            {loading ? (
              /* Loading Skeleton */
              <div className="space-y-4">
                {[1, 2, 3].map(n => (
                  <div key={n} className="bg-white dark:bg-slate-900 border border-[#E6E6E6] dark:border-slate-800 rounded-2xl p-6 shadow-xs animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-4" />
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                      <div className="col-span-6 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                      <div className="col-span-3 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFlights.length === 0 ? (
              /* Empty Search Results */
              <div className="bg-white dark:bg-slate-900 border border-[#E6E6E6] dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
                <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-600 mb-3">
                  flight_takeoff
                </span>
                <h3 className="text-lg font-bold text-[#1b1c1c] dark:text-white mb-1">
                  No flights match your filter criteria
                </h3>
                <p className="text-xs text-[#566476] dark:text-slate-400 max-w-sm mx-auto mb-4">
                  Try adjusting your price range, relaxing stops, or clearing all filters to see available itineraries.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-5 py-2 bg-[#005cab] text-white rounded-xl text-xs font-bold hover:bg-[#004786] transition cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              paginatedFlights.map((flight, idx) => {
                const isExpanded = !!expandedDetails[flight.id];
                const firstSeg = flight.segments[0];
                const lastSeg = flight.segments[flight.segments.length - 1];

                // Dynamically evaluate recommendation based on filtered flight list
                const isRecommended = flight.id === recommendedFlightId;
                const isCheapest = flight.id === cheapestFlightId && !isRecommended;
                const recAirlineName = firstSeg?.airline?.name || 'Horizon-X';

                return (
                  <article 
                    key={`${flight.id}_${flight.departureTime}_${idx}`}
                    className="bg-white dark:bg-slate-900 border border-[#E6E6E6] dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow relative"
                  >
                    
                    {/* Top Tag Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        {isRecommended && (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#d3e1f6] text-[#005cab] text-[11px] font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">star</span>
                            {recAirlineName} Recommended
                          </span>
                        )}
                        {isCheapest && (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#00A698]/15 text-[#00A698] text-[11px] font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">sell</span>
                            Cheapest Flight
                          </span>
                        )}
                        {flight.experienceBadge && (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#ffdbc9] text-[#964400] text-[11px] font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">flight_class</span>
                            {flight.experienceBadge}
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f5f3f3] dark:bg-slate-800 text-[#404754] dark:text-slate-300 text-[11px] font-semibold">
                          {flight.refundableType}
                        </span>
                      </div>

                      <span className="text-xs text-[#566476] dark:text-slate-400">
                        {flight.ecoBadge}
                      </span>
                    </div>

                    {/* Main Info Row (Airline, Schedule Line, Pricing & Action) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      
                      {/* Airline Details & Aircraft IATA code */}
                      <div className="md:col-span-3 flex items-center gap-3 min-w-0">
                        <AirlineLogo 
                          code={firstSeg?.airline?.code || 'HX'} 
                          name={firstSeg?.airline?.name} 
                          size={48} 
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base font-bold text-[#1b1c1c] dark:text-white leading-tight truncate">
                            {firstSeg?.airline?.name || 'Horizon-X Wings'}
                          </h4>
                          <p className="text-xs text-[#566476] dark:text-slate-400 mt-0.5 truncate">
                            {flight.flightNumber || firstSeg?.flightNumber || 'HX-101'} • {firstSeg?.aircraft}
                          </p>
                        </div>
                      </div>

                      {/* Flight Times & Visual Route Indicator */}
                      <div className="md:col-span-6 grid grid-cols-7 items-center text-center">
                        
                        {/* Origin Time & Code */}
                        <div className="col-span-2 text-left">
                          <span className="block text-2xl font-black text-[#1b1c1c] dark:text-white tracking-tight">
                            {formatTime(flight.departureTime)}
                          </span>
                          <span className="block text-sm font-bold text-[#005cab] dark:text-blue-400">
                            {firstSeg?.origin || origin}
                          </span>
                          <span className="block text-[11px] text-[#566476] dark:text-slate-400">
                            {firstSeg?.originTerminal || 'Terminal 3'}
                          </span>
                        </div>

                        {/* Route Line & Duration */}
                        <div className="col-span-3 px-2">
                          <span className="text-xs font-semibold text-[#566476] dark:text-slate-400">
                            {formatDuration(flight.totalDuration)}
                          </span>
                          <div className="relative flex items-center my-1.5">
                            <div className="w-2 h-2 rounded-full border-2 border-[#005cab] bg-white dark:bg-slate-900" />
                            <div className="flex-grow border-t-2 border-[#005cab]" />
                            {flight.isDirect ? (
                              <span className="material-symbols-outlined text-[16px] text-[#005cab] dark:text-blue-400 rotate-90 mx-0.5">
                                flight
                              </span>
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-[#bc5700] flex items-center justify-center text-[8px] text-white font-bold mx-0.5">
                                1
                              </div>
                            )}
                            <div className="flex-grow border-t-2 border-[#005cab]" />
                            <div className="w-2 h-2 rounded-full bg-[#005cab]" />
                          </div>
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                            flight.isDirect 
                              ? 'bg-[#F2F8FF] dark:bg-slate-800 text-[#005cab] dark:text-blue-400' 
                              : 'bg-[#ffdbc9] text-[#964400]'
                          }`}>
                            {flight.layoverText}
                          </span>
                        </div>

                        {/* Destination Time & Code */}
                        <div className="col-span-2 text-right">
                          <span className="block text-2xl font-black text-[#1b1c1c] dark:text-white tracking-tight">
                            {formatTime(flight.arrivalTime)}
                          </span>
                          <span className="block text-sm font-bold text-[#005cab] dark:text-blue-400">
                            {lastSeg?.destination || destination}
                          </span>
                          <span className="block text-[11px] text-[#566476] dark:text-slate-400">
                            {lastSeg?.destinationTerminal || 'Terminal 2'}
                          </span>
                        </div>

                      </div>

                      {/* Pricing & Selection CTA */}
                      <div className="md:col-span-3 md:border-l md:border-[#E6E6E6] dark:md:border-slate-800 md:pl-6 flex flex-col items-end justify-center">
                        <span className="text-[11px] text-[#566476] dark:text-slate-400">
                          Per traveller
                        </span>
                        <div className="flex items-baseline gap-1 my-0.5">
                          <span className="text-2xl font-black text-[#005cab] dark:text-blue-400">
                            ₹{flight.pricing.totalFare.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mb-2.5">
                          All-inclusive flight fare
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleSelectFlight(flight)}
                          className="w-full bg-[#005cab] hover:bg-[#004786] active:scale-95 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <span>Select Flight</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      </div>

                    </div>

                    {/* Bottom Amenities Strip & Expand Details Link */}
                    <div className="mt-4 pt-3 border-t border-[#E6E6E6] dark:border-slate-800 flex flex-wrap items-center justify-between text-[#566476] dark:text-slate-400 text-xs gap-2">
                      <div className="flex items-center gap-4 flex-wrap">
                        {flight.features?.meal ? (
                          <span className="flex items-center gap-1 text-[#00A698] font-semibold">
                            <span className="material-symbols-outlined text-[16px]">restaurant</span>
                            Free Meal Included
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400 line-through">
                            <span className="material-symbols-outlined text-[16px]">restaurant</span>
                            Meal Extra
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">luggage</span>
                          15 kg Check-in
                        </span>

                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">power</span>
                          USB Power
                        </span>

                        {flight.features?.wifi && (
                          <span className="flex items-center gap-1 text-[#005cab] dark:text-blue-400 font-semibold">
                            <span className="material-symbols-outlined text-[16px]">wifi</span>
                            In-Flight Wi-Fi
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleFlightDetails(flight.id)}
                        className="text-[#005cab] dark:text-blue-400 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Flight Details' : 'View Flight Details'}</span>
                        <span 
                          className="material-symbols-outlined text-[18px] transition-transform duration-200"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                          expand_more
                        </span>
                      </button>
                    </div>

                    {/* Collapsible Expandable Flight Details Drawer */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-dashed border-[#E6E6E6] dark:border-slate-800 bg-[#f5f3f3] dark:bg-slate-800/60 rounded-xl p-4 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          
                          {/* Segment Legs Details */}
                          <div>
                            <h5 className="text-xs font-bold text-[#1b1c1c] dark:text-white uppercase tracking-wider mb-2">
                              Flight Routing & Gates
                            </h5>
                            {flight.segments.map((seg, sIdx) => (
                              <div key={sIdx} className="mb-2.5 last:mb-0 text-xs">
                                <p className="font-bold text-[#005cab] dark:text-blue-400">
                                  Leg {sIdx + 1}: {seg.origin} → {seg.destination} ({seg.aircraft})
                                </p>
                                <p className="text-slate-600 dark:text-slate-300">
                                  Departure: {formatTime(seg.departureTime)}, {seg.originTerminal} ({seg.originGate})
                                </p>
                                <p className="text-slate-600 dark:text-slate-300">
                                  Arrival: {formatTime(seg.arrivalTime)}, {seg.destinationTerminal} ({seg.destinationBelt})
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Baggage Policy */}
                          <div>
                            <h5 className="text-xs font-bold text-[#1b1c1c] dark:text-white uppercase tracking-wider mb-2">
                              Baggage Allowance
                            </h5>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              • <strong>Cabin:</strong> 7 kg (1 standard piece + laptop bag)
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                              • <strong>Check-in:</strong> 15 kg (1 standard checked piece)
                            </p>
                            <p className="text-[11px] text-[#00A698] font-bold mt-2">
                              ✓ Additional baggage can be added during online check-in.
                            </p>
                          </div>

                          {/* Cancellation & Rescheduling Rules */}
                          <div>
                            <h5 className="text-xs font-bold text-[#1b1c1c] dark:text-white uppercase tracking-wider mb-2">
                              Cancellation & Flexibility
                            </h5>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              • Cancellation fee applies up to 24 hours prior to scheduled departure.
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                              • Rescheduling available with nominal sector fare adjustment.
                            </p>
                            <p className="text-[11px] text-[#005cab] dark:text-blue-400 font-bold mt-2">
                              Horizon-X passenger wallet refund supported instantly.
                            </p>
                          </div>

                        </div>
                      </div>
                    )}

                  </article>
                );
              })
            )}

            {/* Pagination Controls */}
            {filteredFlights.length > 0 && (
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E6E6E6] dark:border-slate-800 mt-6">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-[#566476] dark:text-slate-400">
                    Showing <strong className="text-slate-800 dark:text-slate-200">{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-slate-800 dark:text-slate-200">{Math.min(filteredFlights.length, currentPage * itemsPerPage)}</strong> of <strong className="text-slate-800 dark:text-slate-200">{filteredFlights.length}</strong> available itineraries
                  </p>
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="text-[11px]">Per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-0.5 text-xs font-semibold focus:outline-hidden focus:border-[#005cab] dark:text-slate-200"
                    >
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                    </select>
                  </div>
                </div>

                {totalPages > 1 ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => {
                        setCurrentPage(p => Math.max(1, p - 1));
                        window.scrollTo({ top: 380, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                      <span>Previous</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i + 1}
                          type="button"
                          onClick={() => {
                            setCurrentPage(i + 1);
                            window.scrollTo({ top: 380, behavior: 'smooth' });
                          }}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                            currentPage === i + 1
                              ? 'bg-[#005cab] text-white shadow-xs'
                              : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => {
                        setCurrentPage(p => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 380, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer flex items-center gap-1"
                    >
                      <span>Next</span>
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="px-4 py-1.5 rounded-lg border border-[#005cab] text-[#005cab] dark:text-blue-400 text-xs font-bold hover:bg-[#F2F8FF] dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Back to Top
                  </button>
                )}
              </div>
            )}

          </section>

        </div>

      </main>

      {/* ==============================================================
         AIRPORT SELECTOR MODAL / BOTTOM SHEET
         ============================================================== */}
      {airportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-[#E6E6E6] dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E6E6] dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-[#1b1c1c] dark:text-white">
                Select {airportModal === 'origin' ? 'Departure' : 'Arrival'} Airport
              </h3>
              <button 
                type="button"
                onClick={() => setAirportModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input 
                type="text" 
                value={airportSearchTerm}
                onChange={(e) => setAirportSearchTerm(e.target.value)}
                placeholder="Search city, airport or code..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#005cab]"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {Object.values(airportDirectory)
                .filter(a => {
                  const q = airportSearchTerm.toLowerCase().trim();
                  if (!q) return true;
                  return a.code.toLowerCase().includes(q) || a.city.toLowerCase().includes(q) || a.airport.toLowerCase().includes(q);
                })
                .map(a => (
                  <div
                    key={a.code}
                    onClick={() => {
                      if (airportModal === 'origin') {
                        setOrigin(a.code);
                      } else if (airportModal === 'destination') {
                        setDestination(a.code);
                      } else if (airportModal?.multiIndex !== undefined) {
                        const updated = [...multiCitySectors];
                        updated[airportModal.multiIndex][airportModal.field] = a.code;
                        setMultiCitySectors(updated);
                      }
                      setAirportModal(null);
                      setAirportSearchTerm('');
                    }}
                    className="flex items-center justify-between p-2.5 hover:bg-[#F2F8FF] dark:hover:bg-slate-800 rounded-xl cursor-pointer transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#1b1c1c] dark:text-white">{a.city} ({a.code})</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{a.airport}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#005cab] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 rounded">
                      {a.code}
                    </span>
                  </div>
                ))}
            </div>

          </div>
        </div>
      )}

      {/* ==============================================================
         SELECTED FLIGHT CONFIRMATION DRAWER / MODAL
         ============================================================== */}
      {selectedFlightForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-[#E6E6E6] dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E6E6] dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-[24px]">
                  task_alt
                </span>
                <h3 className="text-base font-bold text-[#1b1c1c] dark:text-white">
                  Flight Selection Confirmed
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedFlightForBooking(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="bg-[#f5f3f3] dark:bg-slate-800/80 rounded-xl p-4 mb-4 text-xs space-y-2">
              <div className="flex justify-between items-center font-bold text-sm text-[#005cab] dark:text-blue-400">
                <span>{selectedFlightForBooking.id} • {selectedFlightForBooking.segments[0]?.airline?.name}</span>
                <span className="text-lg text-emerald-600 dark:text-emerald-400 font-black">
                  ₹{selectedFlightForBooking.pricing.totalFare.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Route: {origin} → {destination}</span>
                <span>Duration: {formatDuration(selectedFlightForBooking.totalDuration)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                <span>Departure: {formatTime(selectedFlightForBooking.departureTime)}</span>
                <span>Arrival: {formatTime(selectedFlightForBooking.arrivalTime)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              You are ready to book. Would you like to proceed to passenger check-in details or manage your bookings?
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setSelectedFlightForBooking(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Select Another Flight
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedFlightForBooking;
                  setSelectedFlightForBooking(null);
                  handleSelectFlight(target);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#005cab] hover:bg-[#004786] text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Proceed with Reservation
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==============================================================
         3. FOOTER (High Contrast in Light Mode & Dark Mode)
         ============================================================== */}
      <footer className="w-full shrink-0 py-6 px-4 md:px-10 bg-white/95 dark:bg-slate-900/95 border-t border-[#E6E6E6] dark:border-slate-800 transition-colors duration-200 mt-12">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#404754] dark:text-slate-400 font-medium">
          
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#005cab] dark:text-blue-400">
              Horizon<span className="text-blue-500">-X</span>
            </span>
            <span>© 2026 Horizon-X Travel. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <a className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors" href="#">Help Center</a>
            <a className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors" href="#">About Us</a>
            <a className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors" href="#">Terms of Service</a>
            <a className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors" href="#">Contact</a>
          </div>

        </div>
      </footer>

    </div>
  );
}
