import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Users, 
  Plane, 
  LogOut, 
  LayoutGrid, 
  Radio, 
  CheckCircle, 
  Ticket, 
  Sliders, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  Calendar, 
  CreditCard, 
  ArrowRight,
  Trash2,
  Clock,
  XCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Copy,
  Check,
  X
} from 'lucide-react';
import axios from 'axios';
import { ADMIN_ENDPOINTS, adminApi } from '../../services/api';
import ThemeToggle from '../../components/ThemeToggle';
import AirlineLogo from '../../components/AirlineLogo';
import FlightCalendarIcon from '../../components/FlightCalendarIcon';

export default function AdminDashboard({ token, setToken }) {
  // Tab Navigation: 'overview' | 'cities' | 'airlines' | 'flights' | 'users' | 'journeys' | 'pricing'
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    const validTabs = ['overview', 'cities', 'airlines', 'flights', 'users', 'journeys', 'pricing'];
    return validTabs.includes(hash) ? hash : 'overview';
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Datasets
  const [cities, setCities] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [flights, setFlights] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [feeConfig, setFeeConfig] = useState({ cancellationFee: 1500, platformFee: 250, currency: 'INR' });

  // Search & Filter queries
  const [citiesSearch, setCitiesSearch] = useState('');
  const [airlinesSearch, setAirlinesSearch] = useState('');
  const [flightsSearch, setFlightsSearch] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  const [journeysSearch, setJourneysSearch] = useState('');
  const [journeyStatusFilter, setJourneyStatusFilter] = useState('ALL');

  // Pagination States
  const [citiesPage, setCitiesPage] = useState(1);
  const [citiesRowsPerPage, setCitiesRowsPerPage] = useState(10);

  const [flightPage, setFlightPage] = useState(1);
  const [flightRowsPerPage, setFlightRowsPerPage] = useState(10);

  const [usersPage, setUsersPage] = useState(1);
  const [usersRowsPerPage, setUsersRowsPerPage] = useState(10);

  const [journeysPage, setJourneysPage] = useState(1);
  const [journeysRowsPerPage, setJourneysRowsPerPage] = useState(10);

  // Detailed PNR Inspection Modal State
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [copiedPnr, setCopiedPnr] = useState(false);

  // Status Action Loading States
  const [actionMessage, setActionMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Price / Fee Config Form
  const [feeForm, setFeeForm] = useState({ cancellationFee: '', platformFee: '' });
  const [feeUpdating, setFeeUpdating] = useState(false);
  const [feeMessage, setFeeMessage] = useState(null);

  // =========================================================
  // BROWSER BACK/FORWARD NAVIGATION & DYNAMIC FAV-TEXT SYNC
  // =========================================================
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const validTabs = ['overview', 'cities', 'airlines', 'flights', 'users', 'journeys', 'pricing'];
      setActiveTab(validTabs.includes(hash) ? hash : 'overview');
      setActionMessage(null);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Dynamic Browser Page Title (Fav-Text)
  useEffect(() => {
    const titleMap = {
      overview: 'Operations Overview | Horizon-X Operations',
      cities: 'Airports & Cities in India | Horizon-X Operations',
      airlines: 'Active Operational Airlines | Horizon-X Operations',
      flights: 'Scheduled Flights Schedule | Horizon-X Operations',
      users: 'Registered Passengers Directory | Horizon-X Operations',
      journeys: 'Recent Passenger Journeys | Horizon-X Operations',
      pricing: 'Pricing & Fee Configuration | Horizon-X Operations'
    };
    document.title = titleMap[activeTab] || 'Flight Operations Portal | Horizon-X';
  }, [activeTab]);

  const switchTab = (tab) => {
    if (activeTab === tab) return;
    setActiveTab(tab);
    window.location.hash = tab;
    setActionMessage(null);
  };

  const handleAuthExpired = () => {
    sessionStorage.removeItem('hx_admin_token');
    if (typeof setToken === 'function') setToken(null);
    window.location.href = '/admin/login?expired=1';
  };

  const checkAuthError = (err) => {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      handleAuthExpired();
      return true;
    }
    return false;
  };

  const fetchDashboardData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const config = { headers: { Authorization: token } };
      
      const handleCallError = (err, fallback) => {
        if (checkAuthError(err)) return fallback;
        return fallback;
      };

      const [citiesRes, airlinesRes, flightsRes, usersRes, bookingsRes, feeRes] = await Promise.all([
        axios.get(ADMIN_ENDPOINTS.AIRPORTS).catch(() => ({ data: [] })),
        axios.get(ADMIN_ENDPOINTS.AIRLINES).catch(() => ({ data: [] })),
        axios.get(ADMIN_ENDPOINTS.FLIGHTS, config).catch((err) => handleCallError(err, { data: [] })),
        axios.get(ADMIN_ENDPOINTS.USERS, config).catch((err) => handleCallError(err, { data: [] })),
        axios.get(ADMIN_ENDPOINTS.BOOKINGS, config).catch((err) => handleCallError(err, { data: { data: [] } })),
        axios.get(ADMIN_ENDPOINTS.FEE_CONFIG, config).catch((err) => handleCallError(err, { data: { data: { cancellationFee: 1500, platformFee: 250, currency: 'INR' } } }))
      ]);

      const loadedCities = Array.isArray(citiesRes.data) ? citiesRes.data : [];
      const loadedAirlines = Array.isArray(airlinesRes.data) ? airlinesRes.data : [];
      const loadedFlights = Array.isArray(flightsRes.data) ? flightsRes.data : [];
      const loadedUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
      const rawBookings = bookingsRes.data?.data || (Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
      const loadedBookings = rawBookings.map(b => ({
        ...b,
        origin: b.origin || b.journey?.origin || '—',
        destination: b.destination || b.journey?.destination || '—',
        originCity: b.originCity || b.journey?.originCity || b.origin || '—',
        destinationCity: b.destinationCity || b.journey?.destinationCity || b.destination || '—',
        travelDate: b.travelDate || (b.journey?.departureTime ? new Date(b.journey.departureTime).toLocaleDateString() : (b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : '—')),
        contactEmail: b.contactEmail || b.contactInfo?.email || '—',
        contactPhone: b.contactPhone || b.contactInfo?.phone || '—',
      }));
      const loadedFee = feeRes.data?.data || { cancellationFee: 1500, platformFee: 250, currency: 'INR' };

      setCities(loadedCities);
      setAirlines(loadedAirlines);
      setFlights(loadedFlights);
      setUsers(loadedUsers);
      setBookings(loadedBookings);
      setFeeConfig(loadedFee);
      setFeeForm({
        cancellationFee: loadedFee.cancellationFee,
        platformFee: loadedFee.platformFee
      });
    } catch (err) {
      if (checkAuthError(err)) return;
      console.error("Failed to load operations data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Handle Mark Flight Completed (Requires Web Check-in)
  const handleMarkComplete = async (booking) => {
    if (!booking) return;

    if (!booking.isCheckedIn) {
      setActionMessage({
        type: 'error',
        text: `Cannot complete journey for PNR ${booking.pnr}: Passenger must complete web check-in first.`
      });
      return;
    }

    setActionLoading(true);
    setActionMessage(null);
    try {
      const config = { headers: { Authorization: token } };
      const res = await axios.put(ADMIN_ENDPOINTS.COMPLETE_BOOKING(booking.pnr), {}, config);
      setActionMessage({ 
        type: 'success', 
        text: res.data.message || `Journey for PNR ${booking.pnr} has been marked as Completed (Arrived).` 
      });
      setSelectedJourney(prev => prev && prev.pnr === booking.pnr ? { ...prev, status: 'COMPLETED' } : prev);
      await fetchDashboardData(true);
    } catch (err) {
      if (checkAuthError(err)) return;
      setActionMessage({ 
        type: 'error', 
        text: err.response?.data?.error || err.message || 'Unable to complete journey.' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Completed Journey (Enabled ONLY when completed, manual action)
  const handleDeleteBooking = async (booking) => {
    if (!booking) return;

    if (booking.status !== 'COMPLETED') {
      setActionMessage({
        type: 'error',
        text: `Deletion refused: Only COMPLETED journeys can be purged from the records. Current status: ${booking.status}.`
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete completed journey record for PNR ${booking.pnr}? This will permanently clean this record from the database.`)) {
      return;
    }

    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await adminApi.deleteBooking(booking.pnr, token);
      setActionMessage({
        type: 'success',
        text: res.message || `Completed journey record for PNR ${booking.pnr} has been permanently deleted.`
      });
      if (selectedJourney && selectedJourney.pnr === booking.pnr) {
        setSelectedJourney(null);
      }
      await fetchDashboardData(true);
    } catch (err) {
      if (checkAuthError(err)) return;
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to delete journey record.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Update Flight Operational Status (Mark Delayed / Cancelled)
  const handleUpdateFlightStatus = async (flightId, newStatus) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await adminApi.updateFlightStatus(flightId, newStatus, token);
      setActionMessage({
        type: 'success',
        text: res.message || `Flight status updated to ${newStatus}.`
      });
      await fetchDashboardData(true);
    } catch (err) {
      if (checkAuthError(err)) return;
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to update flight status.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Fee Config Update
  const handleUpdateFees = async (e) => {
    e.preventDefault();
    const cancellationFeeNum = Number(feeForm.cancellationFee);
    const platformFeeNum = Number(feeForm.platformFee);

    if (isNaN(cancellationFeeNum) || isNaN(platformFeeNum) || cancellationFeeNum < 0 || platformFeeNum < 0) {
      setFeeMessage({ type: 'error', text: 'Please enter valid non-negative amounts for both fees.' });
      return;
    }

    setFeeUpdating(true);
    setFeeMessage(null);
    try {
      const payload = {
        cancellationFee: cancellationFeeNum,
        platformFee: platformFeeNum
      };

      const res = await adminApi.updateFeeConfig(payload, token);
      const updated = res.data || payload;
      setFeeConfig(prev => ({
        ...prev,
        cancellationFee: updated.cancellationFee,
        platformFee: updated.platformFee,
        updatedAt: updated.updatedAt || new Date().toISOString()
      }));

      setFeeMessage({ 
        type: 'success', 
        text: res.message || 'Price configuration updated successfully!' 
      });
    } catch (err) {
      if (checkAuthError(err)) return;
      setFeeMessage({ 
        type: 'error', 
        text: err.response?.data?.error || err.message || 'Failed to update price configuration.' 
      });
    } finally {
      setFeeUpdating(false);
    }
  };

  // Filtered Datasets
  const filteredCities = cities.filter(c => {
    const q = citiesSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      c.airportCode?.toLowerCase().includes(q) ||
      c.cityName?.toLowerCase().includes(q) ||
      c.stateOrUt?.toLowerCase().includes(q)
    );
  });

  // Cities Pagination
  const totalCityPages = Math.ceil(filteredCities.length / citiesRowsPerPage) || 1;
  const safeCityPage = Math.min(citiesPage, totalCityPages);
  const paginatedCities = filteredCities.slice(
    (safeCityPage - 1) * citiesRowsPerPage,
    safeCityPage * citiesRowsPerPage
  );

  const filteredAirlines = airlines.filter(a => {
    const q = airlinesSearch.toLowerCase().trim();
    if (!q) return true;
    const airlineName = (a.name || a.airlineService || '').toLowerCase();
    const airlineCode = (a.iataCode || a.airlineCode || '').toLowerCase();
    return airlineName.includes(q) || airlineCode.includes(q);
  });

  const filteredFlights = flights.filter(f => {
    const q = flightsSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      f.flightNumber?.toLowerCase().includes(q) ||
      f.airlineData?.name?.toLowerCase().includes(q) ||
      f.originAirportCode?.toLowerCase().includes(q) ||
      f.destinationAirportCode?.toLowerCase().includes(q) ||
      f.originData?.cityName?.toLowerCase().includes(q) ||
      f.destinationData?.cityName?.toLowerCase().includes(q) ||
      f.status?.toLowerCase().includes(q)
    );
  });

  // Paginated Flights
  const totalFlightPages = Math.ceil(filteredFlights.length / flightRowsPerPage) || 1;
  const safeFlightPage = Math.min(flightPage, totalFlightPages);
  const paginatedFlights = filteredFlights.slice(
    (safeFlightPage - 1) * flightRowsPerPage,
    safeFlightPage * flightRowsPerPage
  );

  const filteredUsers = users.filter(u => {
    const q = usersSearch.toLowerCase().trim();
    if (!q) return true;
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const filteredJourneys = bookings.filter(b => {
    const matchesStatus = journeyStatusFilter === 'ALL' || b.status === journeyStatusFilter;
    if (!matchesStatus) return false;

    const q = journeysSearch.toLowerCase().trim();
    if (!q) return true;

    const passengerName = b.passengers && b.passengers.length > 0 
      ? `${b.passengers[0].firstName} ${b.passengers[0].lastName}`.toLowerCase() 
      : '';

    return (
      b.pnr?.toLowerCase().includes(q) ||
      passengerName.includes(q) ||
      b.contactEmail?.toLowerCase().includes(q) ||
      b.origin?.toLowerCase().includes(q) ||
      b.destination?.toLowerCase().includes(q)
    );
  });

  // Users Pagination
  const totalUsersPages = Math.ceil(filteredUsers.length / usersRowsPerPage) || 1;
  const safeUsersPage = Math.min(usersPage, totalUsersPages);
  const paginatedUsers = filteredUsers.slice(
    (safeUsersPage - 1) * usersRowsPerPage,
    safeUsersPage * usersRowsPerPage
  );

  // Journeys Pagination
  const totalJourneysPages = Math.ceil(filteredJourneys.length / journeysRowsPerPage) || 1;
  const safeJourneysPage = Math.min(journeysPage, totalJourneysPages);
  const paginatedJourneys = filteredJourneys.slice(
    (safeJourneysPage - 1) * journeysRowsPerPage,
    safeJourneysPage * journeysRowsPerPage
  );

  // Native CSV Downloader
  const downloadCsv = (filename, headers, rows) => {
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportFlightsCsv = () => {
    const headers = [
      'Flight Number',
      'Airline Name',
      'IATA Code',
      'Origin Airport',
      'Origin City',
      'Destination Airport',
      'Destination City',
      'Departure Time',
      'Arrival Time',
      'Operational Status'
    ];
    const rows = filteredFlights.map(f => [
      f.flightNumber || '—',
      f.airlineData?.name || f.airlineCode || 'Horizon-X Air',
      f.airlineCode || f.airlineData?.iataCode || '—',
      f.originAirportCode || '—',
      f.originData?.cityName || '—',
      f.destinationAirportCode || '—',
      f.destinationData?.cityName || '—',
      f.departureTime || '—',
      f.arrivalTime || '—',
      f.status || 'SCHEDULED'
    ]);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCsv(`horizon_flights_manifest_${dateStr}.csv`, headers, rows);
  };

  const handleExportJourneysCsv = () => {
    const headers = [
      'PNR',
      'Status',
      'Payment Status',
      'Trip Type',
      'Cabin Class',
      'Origin Airport',
      'Destination Airport',
      'Travel Date',
      'Manifested Passengers',
      'Passenger Count',
      'Total Amount (INR)',
      'Web Check-In',
      'Contact Email',
      'Contact Phone',
      'Booking Date'
    ];
    const rows = filteredJourneys.map(b => {
      const passengerNames = (b.passengers || []).map(p => `${p.firstName || ''} ${p.lastName || ''}`.trim()).filter(Boolean).join('; ');
      return [
        b.pnr || '—',
        b.status || '—',
        b.paymentStatus || 'PAID',
        b.tripType || 'ONEWAY',
        b.cabinClass || 'ECONOMY',
        b.origin || b.journey?.origin || '—',
        b.destination || b.journey?.destination || '—',
        b.travelDate || '—',
        passengerNames || b.contactEmail || 'Guest',
        (b.passengers || []).length || 1,
        b.totalAmount || 0,
        b.isCheckedIn ? 'YES' : 'NO',
        b.contactEmail || '—',
        b.contactPhone || '—',
        b.bookingDate || b.createdAt ? new Date(b.bookingDate || b.createdAt).toLocaleDateString() : '—'
      ];
    });
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCsv(`horizon_passenger_journeys_${dateStr}.csv`, headers, rows);
  };

  const handleCopyPnr = (pnr) => {
    if (!pnr) return;
    navigator.clipboard.writeText(pnr);
    setCopiedPnr(true);
    setTimeout(() => setCopiedPnr(false), 2000);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 flex flex-col gap-3 items-center justify-center font-sans text-sm transition-colors duration-300">
        <span className="w-6 h-6 border-2 border-slate-900 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span>Loading Flight Operations...</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex font-sans antialiased transition-colors duration-300">
      
      {/* ==========================================
         EXECUTIVE FIXED SIDEBAR
         Sign Out is ALWAYS pinned and visible at bottom
         ========================================== */}
      <aside className="w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-5 flex flex-col justify-between shrink-0 transition-colors duration-300 z-20">
        
        {/* Top Scrollable Section */}
        <div className="overflow-y-auto space-y-6 pr-1">
          
          {/* Logo & Portal Branding */}
          <div className="flex items-center gap-2.5 px-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
            <div>
              <span className="text-sm font-black tracking-wider text-slate-900 dark:text-white uppercase block">
                HORIZON<span className="text-blue-600 dark:text-blue-400">-</span>X
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium block">
                Operations Portal
              </span>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-400 px-3 mb-2 font-bold">
              Operations Menu
            </div>
            
            {/* 1. Dashboard Overview */}
            <button
              onClick={() => switchTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition text-left cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <LayoutGrid size={16} />
              <span>Dashboard Overview</span>
            </button>
            
            {/* 2. Airports & Cities */}
            <button
              onClick={() => switchTab('cities')}
              className={`w-full flex justify-between items-center px-3 py-2.5 rounded-xl text-xs font-medium tracking-wide transition text-left cursor-pointer ${
                activeTab === 'cities'
                  ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <MapPin size={16} className={activeTab === 'cities' ? 'text-white' : 'text-blue-500'} />
                <span>Airports & Cities</span>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                activeTab === 'cities'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700'
              }`}>
                {cities.length}
              </span>
            </button>

            {/* 3. Active Airlines (Plane Icon) */}
            <button
              onClick={() => switchTab('airlines')}
              className={`w-full flex justify-between items-center px-3 py-2.5 rounded-xl text-xs font-medium tracking-wide transition text-left cursor-pointer ${
                activeTab === 'airlines'
                  ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Plane size={16} className={`rotate-45 ${activeTab === 'airlines' ? 'text-white' : 'text-sky-500'}`} />
                <span>Active Airlines</span>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                activeTab === 'airlines'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700'
              }`}>
                {airlines.length}
              </span>
            </button>

            {/* 4. Scheduled Flights (Aircraft with Calendar Icon) */}
            <button
              onClick={() => switchTab('flights')}
              className={`w-full flex justify-between items-center px-3 py-2.5 rounded-xl text-xs font-medium tracking-wide transition text-left cursor-pointer ${
                activeTab === 'flights'
                  ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <FlightCalendarIcon size={16} className={activeTab === 'flights' ? 'text-white' : 'text-amber-500'} />
                <span>Scheduled Flights</span>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                activeTab === 'flights'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700'
              }`}>
                {flights.length}
              </span>
            </button>

            {/* 5. Passengers */}
            <button
              onClick={() => switchTab('users')}
              className={`w-full flex justify-between items-center px-3 py-2.5 rounded-xl text-xs font-medium tracking-wide transition text-left cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={16} className={activeTab === 'users' ? 'text-white' : 'text-emerald-500'} />
                <span>Passengers</span>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                activeTab === 'users'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700'
              }`}>
                {users.length}
              </span>
            </button>

            {/* 6. Recent Journeys */}
            <button
              onClick={() => switchTab('journeys')}
              className={`w-full flex justify-between items-center px-3 py-2.5 rounded-xl text-xs font-medium tracking-wide transition text-left cursor-pointer ${
                activeTab === 'journeys'
                  ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Ticket size={16} className={activeTab === 'journeys' ? 'text-white' : 'text-indigo-500'} />
                <span>Recent Journeys</span>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                activeTab === 'journeys'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700'
              }`}>
                {bookings.length}
              </span>
            </button>

            {/* 7. Price & Fee Settings */}
            <button
              onClick={() => switchTab('pricing')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium tracking-wide transition text-left cursor-pointer ${
                activeTab === 'pricing'
                  ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <Sliders size={16} className={activeTab === 'pricing' ? 'text-white' : 'text-purple-500'} />
              <span>Pricing & Fee Settings</span>
            </button>
          </nav>
        </div>

        {/* Pinned Bottom Section - Sign Out ALWAYS visible without scrolling */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button 
            onClick={() => setToken(null)} 
            className="w-full bg-slate-50 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-red-200 dark:hover:border-red-800 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition duration-200 cursor-pointer shadow-xs"
          >
            <LogOut size={14} />
            <span>Exit Cockpit</span>
          </button>
        </div>
      </aside>

      {/* ==========================================
         MAIN CONTENT AREA (Scrolls independently)
         ========================================== */}
      <main className="flex-1 h-full overflow-y-auto p-8 lg:p-10 relative">
        
        {/* Cockpit Executive Header Bar with Theme Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 mb-8 transition-colors">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              {activeTab === 'overview' && 'Flight Operations Dashboard'}
              {activeTab === 'cities' && 'Airports & Operational Cities'}
              {activeTab === 'airlines' && 'Active Operational Airlines'}
              {activeTab === 'flights' && 'Scheduled Flights Schedule'}
              {activeTab === 'users' && 'Registered Passenger Directory'}
              {activeTab === 'journeys' && 'Passenger Scheduled Journeys'}
              {activeTab === 'pricing' && 'Pricing & Fee Configuration'}
            </h1>
            <p className="text-slate-400 dark:text-slate-400 text-xs mt-1 font-mono uppercase tracking-wider flex items-center gap-2">
              <Radio size={12} className="text-emerald-500 animate-pulse" />
              Operations Status: Normal &bull; Flight Network Live
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              title="Refresh Data"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer shadow-xs"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-600' : ''} />
            </button>
            <ThemeToggle showLabel={true} />
          </div>
        </div>

        {/* Global Notification Banner */}
        {actionMessage && (
          <div className={`mb-6 p-4 rounded-xl text-xs font-medium border flex items-center justify-between ${
            actionMessage.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800' 
              : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
          }`}>
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-xs opacity-60 hover:opacity-100 underline ml-4 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* =========================================================
           VIEW 1: DASHBOARD OVERVIEW
           - Header "Quick Actions" over cards
           - All cards clickable with direct redirection to side menu bar items
           - Recent Journeys table (recent 5 journeys)
           ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Quick Actions Header & Cards Grid */}
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-xs font-bold font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Quick Actions
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* Card 1: Airports & Cities */}
                <div 
                  onClick={() => switchTab('cities')}
                  className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-slate-400 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                        Airports & Cities
                      </span>
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition">
                        <MapPin size={16} />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{cities.length}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition">
                    <span>View Directory</span>
                    <ArrowRight size={12} />
                  </div>
                </div>

                {/* Card 2: Active Airlines */}
                <div 
                  onClick={() => switchTab('airlines')}
                  className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-md cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-slate-400 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                        Active Airlines
                      </span>
                      <div className="p-2 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/60 rounded-xl group-hover:bg-sky-600 group-hover:text-white transition">
                        <Plane size={16} className="rotate-45" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{airlines.length}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition">
                    <span>View Airlines</span>
                    <ArrowRight size={12} />
                  </div>
                </div>

                {/* Card 3: Scheduled Flights (Calendar with Plane Icon) */}
                <div 
                  onClick={() => switchTab('flights')}
                  className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-slate-400 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                        Scheduled Flights
                      </span>
                      <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition">
                        <FlightCalendarIcon size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{flights.length}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition">
                    <span>View Flight Schedule</span>
                    <ArrowRight size={12} />
                  </div>
                </div>

                {/* Card 4: Registered Passengers */}
                <div 
                  onClick={() => switchTab('users')}
                  className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-slate-400 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                        Passengers
                      </span>
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition">
                        <Users size={16} />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{users.length}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition">
                    <span>View Passenger List</span>
                    <ArrowRight size={12} />
                  </div>
                </div>

                {/* Card 5: Recent Journeys / Bookings */}
                <div 
                  onClick={() => switchTab('journeys')}
                  className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-slate-400 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                        Total Journeys
                      </span>
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition">
                        <Ticket size={16} />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{bookings.length}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition">
                    <span>View All Journeys</span>
                    <ArrowRight size={12} />
                  </div>
                </div>

              </div>
            </div>

            {/* Recent Journeys Table (Recent 5 Journeys) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
              <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Ticket size={18} className="text-indigo-600 dark:text-indigo-400" />
                    Recent Journeys
                  </h2>
                </div>
                <button
                  onClick={() => switchTab('journeys')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Journeys</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-semibold">PNR</th>
                      <th className="pb-3 font-semibold">Route & Date</th>
                      <th className="pb-3 font-semibold">Passenger(s)</th>
                      <th className="pb-3 font-semibold">Fare (₹)</th>
                      <th className="pb-3 font-semibold">Web Check-In</th>
                      <th className="pb-3 font-semibold">Journey Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {bookings.slice(0, 5).map((b) => (
                      <tr key={b.id || b.pnr} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                          <button
                            onClick={() => setSelectedJourney(b)}
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer font-mono font-bold"
                            title="Inspect PNR Manifest & Itinerary"
                          >
                            <span>{b.pnr}</span>
                            <Eye size={12} className="opacity-70" />
                          </button>
                        </td>
                        <td className="py-3 text-slate-700 dark:text-slate-200">
                          <span className="font-semibold">{b.origin} &rarr; {b.destination}</span>
                          <span className="block text-[11px] text-slate-400 dark:text-slate-400">{b.travelDate}</span>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          {b.passengers && b.passengers.length > 0 ? (
                            <span>{b.passengers[0].firstName} {b.passengers[0].lastName} {b.passengers.length > 1 ? `(+${b.passengers.length - 1})` : ''}</span>
                          ) : (
                            b.contactEmail || 'Guest'
                          )}
                        </td>
                        <td className="py-3 font-mono text-slate-800 dark:text-slate-100 font-semibold">
                          ₹{b.totalAmount?.toLocaleString?.() || b.totalAmount}
                        </td>
                        <td className="py-3">
                          {b.isCheckedIn ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Checked In
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-400 text-[11px]">Not Checked In</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            b.status === 'COMPLETED'
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              : b.status === 'CONFIRMED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 dark:bg-red-950/70 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* =========================================================
           VIEW 2: AIRPORTS & OPERATIONAL CITIES (ActiveAirPorts.js data + Pagination)
           ========================================================= */}
        {activeTab === 'cities' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Operational Airports & Cities in India</h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Rows Per Page Selector */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>Rows:</span>
                  <select
                    value={citiesRowsPerPage}
                    onChange={(e) => {
                      setCitiesRowsPerPage(Number(e.target.value));
                      setCitiesPage(1);
                    }}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-56">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search city, code, state/UT..."
                    value={citiesSearch}
                    onChange={(e) => {
                      setCitiesSearch(e.target.value);
                      setCitiesPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Airport Code (IATA)</th>
                    <th className="pb-3 font-semibold">City Name</th>
                    <th className="pb-3 font-semibold">State / Union Territory</th>
                    <th className="pb-3 font-semibold">Operational Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedCities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No airports found matching your search.
                      </td>
                    </tr>
                  ) : (
                    paginatedCities.map((c) => (
                      <tr key={c.airportCode} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                          {c.airportCode}
                        </td>
                        <td className="py-3.5 font-semibold text-slate-900 dark:text-white">
                          {c.cityName}
                        </td>
                        <td className="py-3.5 text-slate-600 dark:text-slate-300">
                          {c.stateOrUt || 'National Territory'}
                        </td>
                        <td className="py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Active Operational
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Cities Pagination Controls */}
            {totalCityPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Showing {Math.min((safeCityPage - 1) * citiesRowsPerPage + 1, filteredCities.length)} to {Math.min(safeCityPage * citiesRowsPerPage, filteredCities.length)} of {filteredCities.length} airports
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCitiesPage(p => Math.max(1, p - 1))}
                    disabled={safeCityPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <span className="px-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                    {safeCityPage} / {totalCityPages}
                  </span>

                  <button
                    onClick={() => setCitiesPage(p => Math.min(totalCityPages, p + 1))}
                    disabled={safeCityPage === totalCityPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
           VIEW 3: ACTIVE AIRLINES (Actual Logos of IndiGo, Air India, etc.)
           ========================================================= */}
        {activeTab === 'airlines' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Operational Airlines in India</h2>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search airline name or code..."
                  value={airlinesSearch}
                  onChange={(e) => setAirlinesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Airline Name</th>
                    <th className="pb-3 font-semibold">IATA Code</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredAirlines.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400">
                        No airlines found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredAirlines.map((a) => {
                      const name = a.name || a.airlineService || 'Airline';
                      const code = a.iataCode || a.airlineCode || '—';
                      const active = a.isInService !== undefined ? a.isInService : a.status;

                      return (
                        <tr key={code} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            {/* Authentic Airline Brand Logo SVG */}
                            <AirlineLogo code={code} name={name} size={28} />
                            <span className="text-sm font-semibold">{name}</span>
                          </td>
                          <td className="py-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {code}
                          </td>
                          <td className="py-3.5">
                            {active ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Active (In Service)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/70 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800">
                                Inactive (Suspended)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================
           VIEW 4: SCHEDULED FLIGHTS (Pagination + Delayed/Cancelled Actions)
           ========================================================= */}
        {activeTab === 'flights' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FlightCalendarIcon size={18} className="text-amber-500" />
                  Scheduled Flights Schedule
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Export Flight Manifest (CSV) */}
                <button
                  onClick={handleExportFlightsCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-200/80 dark:border-slate-700 shadow-xs"
                  title="Export scheduled flights to CSV"
                >
                  <Download size={13} className="text-amber-500" />
                  <span>Export Manifest (CSV)</span>
                </button>

                {/* Rows Per Page Selector */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>Rows:</span>
                  <select
                    value={flightRowsPerPage}
                    onChange={(e) => {
                      setFlightRowsPerPage(Number(e.target.value));
                      setFlightPage(1);
                    }}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-56">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search flight, airline..."
                    value={flightsSearch}
                    onChange={(e) => {
                      setFlightsSearch(e.target.value);
                      setFlightPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Flight No</th>
                    <th className="pb-3 font-semibold">Airline</th>
                    <th className="pb-3 font-semibold">Route</th>
                    <th className="pb-3 font-semibold">Departure</th>
                    <th className="pb-3 font-semibold">Arrival</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Operational Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedFlights.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No scheduled flights found matching your search.
                      </td>
                    </tr>
                  ) : (
                    paginatedFlights.map((f) => (
                      <tr key={f.id || f.flightNumber} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                          {f.flightNumber}
                        </td>
                        <td className="py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                          <div className="flex items-center gap-2.5">
                            <AirlineLogo code={f.airlineCode || f.airlineData?.iataCode} name={f.airlineData?.name} size={22} />
                            <span>{f.airlineData?.name || f.airlineCode || 'Horizon-X Air'}</span>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {f.originAirportCode} &rarr; {f.destinationAirportCode}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {f.originData?.cityName} to {f.destinationData?.cityName}
                          </span>
                        </td>
                        <td className="py-3.5 font-mono text-slate-600 dark:text-slate-300">
                          {f.scheduledDeparture ? new Date(f.scheduledDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '06:00 AM'}
                        </td>
                        <td className="py-3.5 font-mono text-slate-600 dark:text-slate-300">
                          {f.scheduledArrival ? new Date(f.scheduledArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:30 AM'}
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            f.status === 'COMPLETED'
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              : f.status === 'SCHEDULED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : f.status === 'DELAYED'
                              ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-red-50 dark:bg-red-950/70 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800'
                          }`}>
                            {f.status || 'SCHEDULED'}
                          </span>
                        </td>
                        <td className="py-3.5 text-right space-x-1.5">
                          {f.status !== 'DELAYED' && f.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handleUpdateFlightStatus(f.id, 'DELAYED')}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                              title="Mark flight delayed"
                            >
                              Delay
                            </button>
                          )}

                          {f.status !== 'CANCELLED' && f.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handleUpdateFlightStatus(f.id, 'CANCELLED')}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                              title="Mark flight cancelled"
                            >
                              Cancel
                            </button>
                          )}

                          {f.status === 'DELAYED' && (
                            <button
                              onClick={() => handleUpdateFlightStatus(f.id, 'SCHEDULED')}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                              title="Reset flight to on-time scheduled"
                            >
                              On-Time
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Flights Pagination Controls */}
            {totalFlightPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Showing {Math.min((safeFlightPage - 1) * flightRowsPerPage + 1, filteredFlights.length)} to {Math.min(safeFlightPage * flightRowsPerPage, filteredFlights.length)} of {filteredFlights.length} flights
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFlightPage(p => Math.max(1, p - 1))}
                    disabled={safeFlightPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <span className="px-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                    {safeFlightPage} / {totalFlightPages}
                  </span>

                  <button
                    onClick={() => setFlightPage(p => Math.min(totalFlightPages, p + 1))}
                    disabled={safeFlightPage === totalFlightPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
           VIEW 5: REGISTERED PASSENGERS
           ========================================================= */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Registered Passengers</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  User accounts and passenger profiles ({filteredUsers.length} total)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Rows Per Page Selector */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>Rows:</span>
                  <select
                    value={usersRowsPerPage}
                    onChange={(e) => {
                      setUsersRowsPerPage(Number(e.target.value));
                      setUsersPage(1);
                    }}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search passenger name, email..."
                    value={usersSearch}
                    onChange={(e) => {
                      setUsersSearch(e.target.value);
                      setUsersPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Passenger Name</th>
                    <th className="pb-3 font-semibold">Email Address</th>
                    <th className="pb-3 font-semibold">Phone Number</th>
                    <th className="pb-3 font-semibold">Account Role</th>
                    <th className="pb-3 font-semibold">Wallet Balance</th>
                    <th className="pb-3 font-semibold">Member Since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No registered passengers found matching your search.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => (
                      <tr key={u.id || u.email} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3.5 font-bold text-slate-900 dark:text-white">
                          {u.firstName || ''} {u.lastName || ''}
                        </td>
                        <td className="py-3.5 font-mono text-slate-600 dark:text-slate-300">
                          {u.email}
                        </td>
                        <td className="py-3.5 font-mono text-slate-600 dark:text-slate-300">
                          {u.phone || '—'}
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {u.role || 'PASSENGER'}
                          </span>
                        </td>
                        <td className="py-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          ₹{Number(u.walletBalance || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 text-slate-400 dark:text-slate-400">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Users Pagination Controls */}
            {totalUsersPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Showing {Math.min((safeUsersPage - 1) * usersRowsPerPage + 1, filteredUsers.length)} to {Math.min(safeUsersPage * usersRowsPerPage, filteredUsers.length)} of {filteredUsers.length} passengers
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                    disabled={safeUsersPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <span className="px-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                    {safeUsersPage} / {totalUsersPages}
                  </span>

                  <button
                    onClick={() => setUsersPage(p => Math.min(totalUsersPages, p + 1))}
                    disabled={safeUsersPage === totalUsersPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
           VIEW 6: RECENT JOURNEYS
           - Mark Complete ONLY IF web check-in completed
           - Manual Delete ONLY IF marked complete (to clean DB size)
           ========================================================= */}
        {activeTab === 'journeys' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            
            {/* Header and Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Ticket size={18} className="text-indigo-600 dark:text-indigo-400" />
                  Scheduled Passenger Journeys
                </h2>
              </div>

              {/* Status Filters, Rows, CSV Export & Search */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Export Journeys (CSV) */}
                <button
                  onClick={handleExportJourneysCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-200/80 dark:border-slate-700 shadow-xs"
                  title="Export passenger journeys manifest to CSV"
                >
                  <Download size={13} className="text-indigo-500" />
                  <span>Export Manifest (CSV)</span>
                </button>

                {/* Rows Per Page Selector */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>Rows:</span>
                  <select
                    value={journeysRowsPerPage}
                    onChange={(e) => {
                      setJourneysRowsPerPage(Number(e.target.value));
                      setJourneysPage(1);
                    }}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                  {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setJourneyStatusFilter(st);
                        setJourneysPage(1);
                      }}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                        journeyStatusFilter === st
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search PNR, passenger..."
                    value={journeysSearch}
                    onChange={(e) => {
                      setJourneysSearch(e.target.value);
                      setJourneysPage(1);
                    }}
                    className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Journeys Manifest Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">PNR</th>
                    <th className="pb-3 font-semibold">Route & Date</th>
                    <th className="pb-3 font-semibold">Passenger(s)</th>
                    <th className="pb-3 font-semibold">Fare (₹)</th>
                    <th className="pb-3 font-semibold">Web Check-In</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Ground Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedJourneys.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No passenger journeys found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedJourneys.map((b) => (
                      <tr key={b.id || b.pnr} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3.5 font-mono font-bold text-slate-900 dark:text-white tracking-wider">
                          <button
                            onClick={() => setSelectedJourney(b)}
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer font-mono font-bold"
                            title="Inspect PNR Manifest & Itinerary"
                          >
                            <span>{b.pnr}</span>
                            <Eye size={12} className="opacity-70" />
                          </button>
                        </td>
                        <td className="py-3.5 text-slate-700 dark:text-slate-200">
                          <span className="font-semibold">{b.origin} &rarr; {b.destination}</span>
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
                          ₹{b.totalAmount?.toLocaleString?.() || b.totalAmount}
                        </td>
                        <td className="py-3.5">
                          {b.isCheckedIn ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Checked In
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-400 text-[11px]">Not Checked In</span>
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
                        <td className="py-3.5 text-right space-x-2">
                          {/* Inspect Manifest Action */}
                          <button
                            onClick={() => setSelectedJourney(b)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold transition cursor-pointer inline-flex items-center gap-1"
                            title="Inspect full manifest and passenger roster"
                          >
                            <Eye size={12} className="text-blue-500" />
                            <span>Inspect</span>
                          </button>

                          {/* Mark Complete Action: ENABLED ONLY IF Checked-In */}
                          {b.status === 'CONFIRMED' && (
                            b.isCheckedIn ? (
                              <button
                                onClick={() => handleMarkComplete(b)}
                                disabled={actionLoading}
                                className="px-3 py-1 bg-slate-900 hover:bg-emerald-600 dark:bg-blue-600 dark:hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold transition duration-150 shadow-xs cursor-pointer"
                              >
                                Mark Completed
                              </button>
                            ) : (
                              <span 
                                title="Passenger has not completed web check-in. Check-in must be completed first."
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-700 cursor-not-allowed select-none"
                              >
                                Check-in Required
                              </span>
                            )
                          )}

                          {/* Delete Completed Action: ENABLED ONLY ONCE MARKED AS COMPLETED */}
                          {b.status === 'COMPLETED' && (
                            <button
                              onClick={() => handleDeleteBooking(b)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg text-[11px] font-semibold transition cursor-pointer inline-flex items-center gap-1"
                              title="Delete completed journey record to clean database"
                            >
                              <Trash2 size={12} />
                              <span>Delete Record</span>
                            </button>
                          )}

                          {b.status === 'CANCELLED' && (
                            <span className="text-[11px] font-mono text-red-400 dark:text-red-400 italic">
                              Cancelled
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Journeys Pagination Controls */}
            {totalJourneysPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Showing {Math.min((safeJourneysPage - 1) * journeysRowsPerPage + 1, filteredJourneys.length)} to {Math.min(safeJourneysPage * journeysRowsPerPage, filteredJourneys.length)} of {filteredJourneys.length} journeys
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setJourneysPage(p => Math.max(1, p - 1))}
                    disabled={safeJourneysPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <span className="px-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                    {safeJourneysPage} / {totalJourneysPages}
                  </span>

                  <button
                    onClick={() => setJourneysPage(p => Math.min(totalJourneysPages, p + 1))}
                    disabled={safeJourneysPage === totalJourneysPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
           VIEW 7: PRICING & FEE CONFIGURATION
           ========================================================= */}
        {activeTab === 'pricing' && (
          <div className="space-y-6 max-w-4xl">
            
            {/* Header info */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Sliders size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Platform & Cancellation Fee Settings
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manage global standard booking convenience fees and ticket cancellation fees.
                  </p>
                </div>
              </div>

              {feeMessage && (
                <div className={`mt-4 p-4 rounded-xl text-xs font-medium border flex items-center justify-between ${
                  feeMessage.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800' 
                    : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
                }`}>
                  <span>{feeMessage.text}</span>
                  <button onClick={() => setFeeMessage(null)} className="text-xs opacity-60 hover:opacity-100 underline ml-4 cursor-pointer">
                    Dismiss
                  </button>
                </div>
              )}

              {/* Current Active Rate Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                
                {/* Platform / Convenience Fee Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Current Platform / Convenience Fee
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono text-blue-600 dark:text-blue-400">
                      ₹{feeConfig.platformFee}
                    </span>
                    <span className="text-xs text-slate-400">per ticket</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Charged during passenger checkout. Non-refundable fee.
                  </p>
                </div>

                {/* Cancellation Fee Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Current Ticket Cancellation Fee
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono text-amber-600 dark:text-amber-400">
                      ₹{feeConfig.cancellationFee}
                    </span>
                    <span className="text-xs text-slate-400">per passenger</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Deducted from the total refund amount upon voluntary flight cancellation.
                  </p>
                </div>

              </div>

              {/* Fee Update Form */}
              <form onSubmit={handleUpdateFees} className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
                  Update Fee Rates
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                  
                  {/* Platform Fee Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Convenience / Platform Fee (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={feeForm.platformFee}
                      onChange={(e) => setFeeForm({ ...feeForm, platformFee: e.target.value })}
                      placeholder="e.g. 250"
                      className="w-full px-4 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Standard airline booking convenience fee.
                    </span>
                  </div>

                  {/* Cancellation Fee Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Ticket Cancellation Fee (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={feeForm.cancellationFee}
                      onChange={(e) => setFeeForm({ ...feeForm, cancellationFee: e.target.value })}
                      placeholder="e.g. 1500"
                      className="w-full px-4 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Fee deducted per seat cancelled.
                    </span>
                  </div>

                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 dark:text-slate-400 font-mono">
                    Last updated: {feeConfig.updatedAt ? new Date(feeConfig.updatedAt).toLocaleString() : 'System Default'}
                  </span>

                  <button
                    type="submit"
                    disabled={feeUpdating}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    {feeUpdating && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    <span>Save Pricing Changes</span>
                  </button>
                </div>
              </form>

            </div>

            {/* Aviation Standard Policy Info */}
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block mb-1">
                Aviation Industry Fee Policy Notes
              </span>
              <p>
                &bull; <strong>Convenience Fee:</strong> In accordance with civil aviation guidelines, the platform booking convenience fee covers secure checkout payment gateway processing, instant PNR generation, and automated electronic ticket issuance.
              </p>
              <p>
                &bull; <strong>Cancellation Fee:</strong> Per passenger airline reservation policies, voluntary ticket cancellations initiated before flight departure incur the flat cancellation fee, and the remainder is refunded directly to the passenger's payment method or Horizon-X wallet credit.
              </p>
            </div>

          </div>
        )}

        {/* =========================================================
           PNR MANIFEST INSPECTION MODAL / DRAWER
           Displays complete itinerary, multi-passenger roster, seats, 
           financial details, and ground actions.
           ========================================================= */}
        {selectedJourney && (
          <div 
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
            onClick={() => setSelectedJourney(null)}
          >
            <div 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: PNR, Badges, Copy, and Close */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                      Passenger Name Record (PNR)
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                      selectedJourney.status === 'COMPLETED'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        : selectedJourney.status === 'CONFIRMED'
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-950/70 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800'
                    }`}>
                      {selectedJourney.status}
                    </span>
                    {selectedJourney.isCheckedIn ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        Checked In
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700">
                        Not Checked In
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black font-mono tracking-wider text-slate-900 dark:text-white">
                      {selectedJourney.pnr}
                    </span>
                    <button
                      onClick={() => handleCopyPnr(selectedJourney.pnr)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 text-[11px]"
                      title="Copy PNR to clipboard"
                    >
                      {copiedPnr ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      <span className="text-[10px] font-mono">{copiedPnr ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedJourney(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Flight Route Banner */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 mb-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900/50">
                      <Plane size={20} className="rotate-45" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{selectedJourney.origin || selectedJourney.journey?.origin || '—'}</span>
                        <span className="text-slate-400 font-normal">&rarr;</span>
                        <span>{selectedJourney.destination || selectedJourney.journey?.destination || '—'}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedJourney.originCity || selectedJourney.journey?.originCity || 'Origin'} to {selectedJourney.destinationCity || selectedJourney.journey?.destinationCity || 'Destination'}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-mono text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Travel Date</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedJourney.travelDate || (selectedJourney.journey?.departureTime ? new Date(selectedJourney.journey.departureTime).toLocaleDateString() : '—')}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {selectedJourney.cabinClass || 'ECONOMY'} &bull; {selectedJourney.tripType || 'ONEWAY'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Passenger Manifest Roster */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Users size={14} className="text-blue-500" />
                    <span>Passenger Manifest ({(selectedJourney.passengers || []).length || 1})</span>
                  </h3>
                </div>

                <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                        <th className="py-2.5 px-3 font-semibold">Passenger</th>
                        <th className="py-2.5 px-3 font-semibold">Age / Gender</th>
                        <th className="py-2.5 px-3 font-semibold">Seat</th>
                        <th className="py-2.5 px-3 font-semibold">Meal</th>
                        <th className="py-2.5 px-3 font-semibold">Ticket No</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {selectedJourney.passengers && selectedJourney.passengers.length > 0 ? (
                        selectedJourney.passengers.map((p, pIdx) => (
                          <tr key={p.id || pIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {p.firstName || ''} {p.lastName || ''}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {p.age ? `${p.age} yrs` : '—'} / {p.gender || '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px]">
                                {p.seatNumber || 'Unassigned'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {p.foodOption || 'VEG'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {p.ticketNumber || `HX-${selectedJourney.pnr}-${pIdx + 1}`}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-3 px-3 text-slate-400 text-center">
                            Manifested as Primary Passenger ({selectedJourney.contactEmail || 'Guest'})
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial & Contact Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
                {/* Financial Box */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Payment & Fare
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
                      ₹{selectedJourney.totalAmount?.toLocaleString?.() || selectedJourney.totalAmount}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                      {selectedJourney.paymentStatus || 'PAID'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Currency: {selectedJourney.currency || 'INR'}
                  </span>
                </div>

                {/* Contact Box */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Primary Contact Info
                  </span>
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-200 block truncate">
                    {selectedJourney.contactEmail || selectedJourney.contactInfo?.email || '—'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                    {selectedJourney.contactPhone || selectedJourney.contactInfo?.phone || '—'}
                  </span>
                </div>
              </div>

              {/* Modal Footer Ground Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">
                  {selectedJourney.status === 'CONFIRMED' && !selectedJourney.isCheckedIn && (
                    <span className="text-amber-600 dark:text-amber-400">
                      &bull; Requires Web Check-in before arrival completion
                    </span>
                  )}
                  {selectedJourney.status === 'COMPLETED' && (
                    <span className="text-slate-500 dark:text-slate-400">
                      &bull; Completed record can be purged to save database space
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Mark Complete Action (inside modal) */}
                  {selectedJourney.status === 'CONFIRMED' && (
                    selectedJourney.isCheckedIn ? (
                      <button
                        onClick={() => handleMarkComplete(selectedJourney)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-slate-900 hover:bg-emerald-600 dark:bg-blue-600 dark:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle size={14} />
                        <span>Mark Journey Completed</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 cursor-not-allowed">
                        Web Check-in Required
                      </span>
                    )
                  )}

                  {/* Delete Record Action (inside modal) */}
                  {selectedJourney.status === 'COMPLETED' && (
                    <button
                      onClick={() => handleDeleteBooking(selectedJourney)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>Delete Record Permanently</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedJourney(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
