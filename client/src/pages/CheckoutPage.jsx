import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  setContactInfo,
  updatePassenger,
  addPassenger,
  removePassenger,
  toggleAddon,
  setPromoInput,
  applyPromoCode,
  removePromoCode,
  setReviewModalOpen,
  setSeatMapModalOpen,
  setSeatMapActivePaxIndex,
  assignSeatToPassenger,
  autoAssignSeatToPassenger,
  autoAssignAllSeats,
  clearPassengerSeat,
  setAdminFeeConfig,
  setCheckoutLoading,
  setCheckoutError,
  setBookingResult,
  setPaymentUrls,
  setPaymentSuccess,
  setPaymentDeclined,
  setSuccessModalOpen,
  setDeclinedModalOpen,
  closePaymentModals
} from '../store/bookingSlice';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import AirlineLogo from '../components/AirlineLogo';
import ConfirmedBookingModal from '../components/ConfirmedBookingModal';
import DeclinedPaymentModal from '../components/DeclinedPaymentModal';
import { USER_ENDPOINTS } from '../services/api';

const COUNTRY_CODES = [
  { code: '+91', label: '+91 (IN)' },
  { code: '+1', label: '+1 (US)' },
  { code: '+44', label: '+44 (UK)' },
  { code: '+61', label: '+61 (AU)' },
  { code: '+49', label: '+49 (DE)' },
  { code: '+971', label: '+971 (AE)' },
  { code: '+65', label: '+65 (SG)' },
  { code: '+1', label: '+1 (CA)' }
];

const NATIONALITIES = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'United Arab Emirates',
  'Singapore',
  'France',
  'Japan'
];

const MEAL_OPTIONS = [
  'Standard Non-Veg',
  'Vegetarian Hindu Meal',
  'Asian Vegetarian',
  'Vegan Meal',
  'Gluten-Free Meal',
  'Diabetic Meal'
];

// Pre-occupied seats configuration for realistic simulation
const OCCUPIED_SEATS = new Set([
  '1A', '1F', '2B', '3C', '3D', '4A', '5B', '6F', 
  '7C', '8D', '10A', '10B', '11C', '12F', '14A', 
  '15B', '16E', '17C', '18A', '19D', '20F', '22B'
]);

export default function CheckoutPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();

  const isCancelledFromStripe = searchParams.get('cancelled') === 'true';

  // Redux state
  const bookingState = useSelector((state) => state.booking);
  const {
    selectedFlight,
    tripType,
    cabinClass,
    origin,
    destination,
    departureDate,
    contactInfo,
    passengers,
    addons,
    feeConfig,
    promo,
    pricing,
    ui
  } = bookingState;

  // Validation errors state
  const [errors, setErrors] = useState({});

  // Seat Selection Prompt Modal (only shown if user hasn't selected seats)
  const [isSeatPromptOpen, setIsSeatPromptOpen] = useState(false);

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

  // Guest Onboarding Dialog State (Cleartrip model: Email + Phone -> 4-digit OTP -> Onboard complete -> Payment)
  const [isGuestAuthModalOpen, setIsGuestAuthModalOpen] = useState(false);
  const [guestAuthStep, setGuestAuthStep] = useState('prompt'); // 'prompt' | 'otp' | 'success'
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestOtp, setGuestOtp] = useState('');
  const [guestAuthLoading, setGuestAuthLoading] = useState(false);
  const [guestAuthError, setGuestAuthError] = useState('');
  const [guestAuthSuccessMsg, setGuestAuthSuccessMsg] = useState('');
  const [mockOtpHit, setMockOtpHit] = useState('');

  // Fetch admin fee configuration on mount
  useEffect(() => {
    const fetchFeeConfig = async () => {
      try {
        const res = await fetch(USER_ENDPOINTS.FEE_CONFIG);
        const data = await res.json();
        if (data.success && data.data) {
          dispatch(setAdminFeeConfig({
            platformFee: Number(data.data.platformFee),
            cancellationFee: Number(data.data.cancellationFee),
            currency: data.data.currency || 'INR'
          }));
        }
      } catch (err) {
        console.warn('Could not fetch remote fee config, using default admin fee cap:', err);
      }
    };
    fetchFeeConfig();
  }, [dispatch]);

  // Ensure user is redirected if no flight exists
  useEffect(() => {
    if (!selectedFlight) {
      try {
        const stored = sessionStorage.getItem('hx_journey_details');
        if (!stored) {
          navigate('/flights');
        }
      } catch {
        navigate('/flights');
      }
    }
  }, [selectedFlight, navigate]);

  // Synchronize Stripe Payment status and URLs into Redux
  useEffect(() => {
    const isDeclined = searchParams.get('cancelled') === 'true' || searchParams.get('declined') === 'true';
    const isSuccess = searchParams.get('success') === 'true';
    const pnrParam = searchParams.get('pnr');
    const sessionIdParam = searchParams.get('session_id');

    // Check if returning from Stripe via back navigation or cancel
    const wasStripePending = sessionStorage.getItem('hx_stripe_pending') === 'true';

    if (isDeclined || wasStripePending) {
      sessionStorage.removeItem('hx_stripe_pending');
      // Clean query parameters from URL so that page reload does not re-open the Declined Modal
      if (searchParams.has('cancelled') || searchParams.has('declined')) {
        const cleanParams = new URLSearchParams(searchParams);
        cleanParams.delete('cancelled');
        cleanParams.delete('declined');
        const cleanQuery = cleanParams.toString();
        const cleanUrl = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '');
        window.history.replaceState({}, '', cleanUrl);
      }
      dispatch(setPaymentDeclined({
        cancelUrl: window.location.href,
        errorMessage: 'Unfortunately, your payment could not be processed. Please check your payment details or try another payment method to complete your booking.'
      }));
    } else if (isSuccess) {
      sessionStorage.removeItem('hx_stripe_pending');
      // Clean success query parameter so reload does not re-trigger
      if (searchParams.has('success')) {
        const cleanParams = new URLSearchParams(searchParams);
        cleanParams.delete('success');
        const cleanQuery = cleanParams.toString();
        const cleanUrl = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '');
        window.history.replaceState({}, '', cleanUrl);
      }
      dispatch(setPaymentSuccess({
        successUrl: window.location.href,
        pnr: pnrParam,
        sessionId: sessionIdParam
      }));
    }
  }, [searchParams, dispatch]);

  // Handle bfcache pageshow (e.g. returning from Stripe via browser back button without reload)
  useEffect(() => {
    const handlePageShow = (event) => {
      if (sessionStorage.getItem('hx_stripe_pending') === 'true') {
        sessionStorage.removeItem('hx_stripe_pending');
        dispatch(setPaymentDeclined({
          cancelUrl: window.location.href,
          errorMessage: 'Unfortunately, your payment could not be processed. Please check your payment details or try another payment method to complete your booking.'
        }));
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [dispatch]);

  // Intercept Browser Back Button on Checkout Page & display Declined Payment Modal
  useEffect(() => {
    // Push an initial state into browser history stack to trap the back button
    window.history.pushState({ isCheckoutBackGuard: true }, '', window.location.href);

    const handlePopState = (event) => {
      // Display the decline modal on clicking the browser back button
      dispatch(setPaymentDeclined({
        cancelUrl: window.location.href,
        errorMessage: 'Unfortunately, your payment could not be processed. Please check your payment details or try another payment method to complete your booking.'
      }));
      // Push state again so subsequent back presses also prompt/display modal cleanly
      window.history.pushState({ isCheckoutBackGuard: true }, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [dispatch]);

  // Derived Flight Details
  const firstSegment = selectedFlight?.segments?.[0] || {};
  const lastSegment = selectedFlight?.segments?.[selectedFlight.segments?.length - 1] || firstSegment;
  const flightNumber = firstSegment.flightNumber || selectedFlight?.flightNumber || selectedFlight?.id || 'HX-402';
  const airlineName = firstSegment.airline?.name || 'Horizon-X Wings';
  const airlineCode = firstSegment.airline?.code || 'IX';
  const aircraft = firstSegment.aircraft || 'Airbus A321neo';

  // Format Time display in UTC for exact aviation schedule alignment (Bug 3 Fix)
  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '--:--';
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    } catch {
      return '--:--';
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Mon, Oct 12, 2026';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Mon, Oct 12, 2026';
    }
  };

  const formatDuration = (mins) => {
    if (!mins) return '2h 45m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const depTime = formatTime(selectedFlight?.departureTime || firstSegment.departureTime);
  const arrTime = formatTime(selectedFlight?.arrivalTime || lastSegment.arrivalTime);
  const travelDateFormatted = formatDate(selectedFlight?.departureTime || departureDate);
  const durationFormatted = formatDuration(selectedFlight?.totalDuration || 165);

  const originCode = firstSegment.origin || origin || 'DEL';
  const destCode = lastSegment.destination || destination || 'BLR';

  // Email & Phone format validation
  const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email?.trim());
  const isPhoneValid = (phone) => /^[0-9]{8,15}$/.test(phone?.trim().replace(/[\s-]/g, ''));

  // Validate passenger & contact forms
  const validateForm = () => {
    const newErrors = {};

    // Validate Contact Info
    if (!contactInfo.email || !isEmailValid(contactInfo.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!contactInfo.phone || !isPhoneValid(contactInfo.phone)) {
      newErrors.phone = 'Please enter a valid mobile number (8-15 digits).';
    }

    // Validate Passengers
    passengers.forEach((p, idx) => {
      if (!p.firstName || p.firstName.trim().length < 2) {
        newErrors[`pax_${idx}_firstName`] = 'First name is required (min 2 chars).';
      }
      if (!p.lastName || p.lastName.trim().length < 1) {
        newErrors[`pax_${idx}_lastName`] = 'Last name is required.';
      }
      if (!p.gender) {
        newErrors[`pax_${idx}_gender`] = 'Please select passenger gender.';
      }
      const ageNum = Number(p.age);
      if (!p.age || isNaN(ageNum) || ageNum < 1 || ageNum > 115) {
        newErrors[`pax_${idx}_age`] = 'Please enter a valid age (1-115).';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler for "Proceed to Payment"
  const handleProceedToPayment = () => {
    if (!validateForm()) {
      const firstErrorEl = document.querySelector('.border-red-500, .text-red-500');
      if (firstErrorEl) {
        firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Check if any passenger has unassigned seat (manual seat or auto-assign counts as assigned)
    const unassignedPax = passengers.some(p => !p.isAutoAssigned && p.seatNo !== 'AUTO' && (!p.seatNo || p.seatNo === null));
    if (unassignedPax) {
      // Open Seat Selection Choice Dialog (OTA style)
      setIsSeatPromptOpen(true);
      return;
    }

    dispatch(setReviewModalOpen(true));
  };

  // Guest Onboarding Handlers (Cleartrip model: Email + Phone -> 4-digit OTP -> Onboard complete -> Stripe Payment)
  const handleGuestSendOtp = async () => {
    const cleanEmail = String(guestEmail || '').trim();
    const cleanPhone = String(guestPhone || '').trim();
    if (!cleanEmail || !cleanPhone) {
      setGuestAuthError('Please enter both your email address and mobile number.');
      return;
    }
    if (!cleanEmail.includes('@')) {
      setGuestAuthError('Please enter a valid email address.');
      return;
    }
    if (cleanPhone.replace(/\D/g, '').length < 10) {
      setGuestAuthError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setGuestAuthLoading(true);
    setGuestAuthError('');
    try {
      const res = await fetch(USER_ENDPOINTS.AUTH_SEND_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, phone: cleanPhone })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }
      setMockOtpHit(data.mockOtp || '1234');
      setGuestAuthStep('otp');
    } catch (err) {
      setGuestAuthError(err.message || 'Error sending OTP. Please try again.');
    } finally {
      setGuestAuthLoading(false);
    }
  };

  const handleGuestVerifyOtp = async () => {
    if (!guestOtp || guestOtp.length !== 4) {
      setGuestAuthError('Please enter the 4-digit verification code.');
      return;
    }
    setGuestAuthLoading(true);
    setGuestAuthError('');
    try {
      const primaryPax = passengers && passengers[0] ? passengers[0] : {};
      const res = await fetch(USER_ENDPOINTS.AUTH_OTP_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: guestEmail.trim(),
          phone: guestPhone.trim(),
          otp: guestOtp.trim(),
          firstName: primaryPax.firstName || '',
          lastName: primaryPax.lastName || ''
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid 4-digit code. Please try again.');
      }
      if (data.token) {
        localStorage.setItem('hx_user_token', data.token);
        sessionStorage.setItem('hx_user_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('hx_user_profile', JSON.stringify(data.user));
        sessionStorage.setItem('hx_user_profile', JSON.stringify(data.user));
        setUser(data.user);
      }
      setGuestAuthSuccessMsg(data.message || 'Onboarding complete! Proceeding to secure payment...');
      setGuestAuthStep('success');
      setTimeout(() => {
        setIsGuestAuthModalOpen(false);
        executePaymentCheckout();
      }, 1400);
    } catch (err) {
      setGuestAuthError(err.message || 'Verification failed. Please try again.');
    } finally {
      setGuestAuthLoading(false);
    }
  };

  // Handler for "Complete Payment" in Review Modal (Guest sign-in prompt)
  const handleCompletePayment = () => {
    const userToken = localStorage.getItem('hx_user_token') || sessionStorage.getItem('hx_user_token');
    const isGuest = !userToken;

    if (isGuest) {
      setGuestEmail(contactInfo.email || '');
      setGuestPhone(contactInfo.phone || '');
      setGuestAuthStep('prompt');
      setGuestAuthError('');
      setGuestOtp('');
      setIsGuestAuthModalOpen(true);
      return;
    }

    executePaymentCheckout();
  };

  // Execution of Stripe Checkout Session Creation
  const executePaymentCheckout = async () => {
    dispatch(setCheckoutLoading(true));
    dispatch(setCheckoutError(null));

    try {
      // Build legs payload for checkout session
      const legs = (selectedFlight?.segments && selectedFlight.segments.length > 0)
        ? selectedFlight.segments.map(seg => ({
            flightId: seg.flightId,
            flightNumber: seg.flightNumber,
            origin: seg.origin,
            destination: seg.destination
          }))
        : [
            {
              flightId: selectedFlight?.id || '65c33d5b-510d-49f3-a8d3-b47ae34cf882',
              flightNumber: flightNumber,
              origin: originCode,
              destination: destCode
            }
          ];

      // Build passengers payload
      const paxPayload = passengers.map(p => ({
        firstName: p.firstName.trim(),
        lastName: p.lastName.trim(),
        gender: p.gender || 'UNSPECIFIED',
        age: Number(p.age),
        nationality: p.nationality || 'India',
        seatNo: p.seatNo && !p.seatNo.startsWith('AUTO') ? p.seatNo : '14A',
        mealPreference: p.mealPreference || 'Standard Non-Veg',
        foodOption: p.mealPreference || 'Standard Non-Veg'
      }));

      const fullPhone = `${contactInfo.countryCode}${contactInfo.phone.trim().replace(/[\s-]/g, '')}`;

      const checkoutPayload = {
        contactInfo: {
          email: contactInfo.email.trim().toLowerCase(),
          phone: fullPhone
        },
        tripType: tripType || 'ONEWAY',
        cabinClass: cabinClass || 'ECONOMY',
        legs,
        passengers: paxPayload
      };

      console.log('Dispatching Create Checkout Session request:', checkoutPayload);

      const userToken = sessionStorage.getItem('hx_user_token') || localStorage.getItem('token') || sessionStorage.getItem('hx_token');
      const headers = { 'Content-Type': 'application/json' };
      if (userToken) {
        headers['Authorization'] = userToken.startsWith('Bearer ') ? userToken : `Bearer ${userToken}`;
      }

      const res = await fetch(USER_ENDPOINTS.CREATE_CHECKOUT_SESSION, {
        method: 'POST',
        headers,
        body: JSON.stringify(checkoutPayload)
      });

      const data = await res.json();
      console.log('Checkout session response:', data);

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Unable to initialize checkout session.');
      }

      // Record result & URLs in Redux
      dispatch(setBookingResult(data.data));
      if (data.data?.successUrl || data.data?.cancelUrl) {
        dispatch(setPaymentUrls({
          successUrl: data.data.successUrl,
          cancelUrl: data.data.cancelUrl
        }));
      }

      // Open Stripe's checkout interface directly
      if (data.data?.checkoutUrl) {
        sessionStorage.setItem('hx_stripe_pending', 'true');
        window.location.href = data.data.checkoutUrl;
      } else {
        throw new Error('Checkout session generated without a valid redirect URL.');
      }
    } catch (err) {
      console.error('Checkout creation error:', err);
      dispatch(setCheckoutError(err.message || 'Payment clearance failed. Please try again.'));
      dispatch(setPaymentDeclined({
        errorMessage: err.message || 'Payment clearance failed. Please try again.'
      }));
    }
  };

  // Aircraft Seat Map helper data
  const seatMapRows = useMemo(() => {
    const rows = [];
    for (let r = 1; r <= 24; r++) {
      // Rows 1-3: Front Extra Legroom (₹1,200)
      // Row 11-12: Emergency Exit Wings Extra Legroom (₹1,200)
      // Other rows: Standard Free (₹0)
      const isExtraLegroom = r <= 3 || r === 11 || r === 12;
      const price = isExtraLegroom ? 1200 : 0;
      const type = isExtraLegroom ? 'extraLegroom' : 'standard';

      rows.push({
        rowNumber: r,
        isExtraLegroom,
        price,
        type,
        seatsLeft: ['A', 'B', 'C'].map(col => `${r}${col}`),
        seatsRight: ['D', 'E', 'F'].map(col => `${r}${col}`)
      });
    }
    return rows;
  }, []);

  // Map of seats selected across all passengers in current booking
  const selectedSeatPassengerMap = useMemo(() => {
    const map = {};
    passengers.forEach((p, idx) => {
      if (p.seatNo && !p.seatNo.startsWith('AUTO')) {
        map[p.seatNo] = {
          paxIndex: idx,
          paxName: p.firstName ? `${p.firstName} ${p.lastName}` : `Passenger ${idx + 1}`
        };
      }
    });
    return map;
  }, [passengers]);

  const activePax = passengers[ui.seatMapActivePaxIndex] || passengers[0];

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#fbf9f8] text-[#1b1c1c]'
    }`}>
      {/* ==============================================================
         1. TOP APP BAR / HEADER (Horizon-X Branding & Flight Deck Nav)
         ============================================================== */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-[#E6E6E6]'
      }`}>
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Left: Brand Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-[28px] group-hover:scale-110 transition-transform">
                flight_takeoff
              </span>
              <span className="font-bold text-xl tracking-tight text-[#005cab] dark:text-blue-400">
                Horizon-X
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link to="/flights" className="text-[#005cab] dark:text-blue-400 font-bold border-b-2 border-[#005cab] pb-1">
                Flights
              </Link>
              <Link to="/bookings" className="text-slate-600 dark:text-slate-400 hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">
                My Bookings
              </Link>
              <Link to="/flights" className="text-slate-600 dark:text-slate-400 hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">
                Deals
              </Link>
              <Link to="/flights" className="text-slate-600 dark:text-slate-400 hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">
                Support
              </Link>
            </nav>
          </div>

          {/* Right: Actions Cluster (Cleartrip unified Sign In, no Create Account) */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
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
                className="bg-[#005cab] hover:bg-[#004786] text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">account_circle</span>
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Notice Banner if returned from Stripe Cancel / Back */}
      {isCancelledFromStripe && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-4 py-3 text-center text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[18px]">info</span>
          <span>Payment checkout was interrupted. Your passenger details and selected flight have been preserved so you can complete your booking.</span>
        </div>
      )}

      {/* ==============================================================
         2. MAIN CONTAINER (3-Step Breadcrumbs & 2-Column Responsive Layout)
         ============================================================== */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 md:px-8 py-8">
        
        {/* STEP INDICATOR / BREADCRUMB */}
        <section className="mb-8">
          <div className={`border rounded-xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E6E6E6]'
          }`}>
            {/* Step 1: Completed */}
            <Link to="/flights" className="flex items-center gap-3 group">
              <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                <span className="material-symbols-outlined text-[18px]">check</span>
              </span>
              <div>
                <div className="text-[11px] text-slate-400">Step 1</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#005cab] transition-colors">
                  1. Flight Selection
                </div>
              </div>
            </Link>

            <div className="hidden sm:block flex-1 max-w-[80px] h-[2px] bg-emerald-500"></div>

            {/* Step 2: Active */}
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#005cab] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                2
              </span>
              <div>
                <div className="text-[11px] text-[#005cab] dark:text-blue-400 font-semibold">Current Step</div>
                <div className="text-xs font-bold text-[#005cab] dark:text-blue-400">
                  2. Passenger Details
                </div>
              </div>
            </div>

            <div className="hidden sm:block flex-1 max-w-[80px] h-[2px] bg-slate-200 dark:bg-slate-800"></div>

            {/* Step 3: Upcoming */}
            <div className="flex items-center gap-3 opacity-60">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}>
                3
              </span>
              <div>
                <div className="text-[11px] text-slate-400">Final Step</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  3. Review & Payment
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2-COLUMN GRID (Left 8 cols, Right 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ==============================================================
             LEFT COLUMN (65% / 8 Cols): Flight Card + Forms + Add-ons
             ============================================================== */}
          <div className="lg:col-span-8 space-y-6">

            {/* 1. FLIGHT SUMMARY CARD BANNER (Fixed Logo & Fixed UTC Times) */}
            <div className={`border rounded-xl p-6 shadow-xs ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E6E6E6]'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1 shadow-xs">
                    <AirlineLogo 
                      code={airlineCode} 
                      name={airlineName} 
                      size={44} 
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {airlineName}
                      </h2>
                      <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-[11px] font-mono font-bold px-2 py-0.5 rounded">
                        {flightNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {aircraft} • {tripType === 'ROUND_TRIP' ? 'Round Trip' : 'One Way'} • Cabin: {cabinClass}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Confirmed Fare
                  </span>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {travelDateFormatted}
                  </div>
                </div>
              </div>

              {/* Flight Itinerary Row (Exact 100% Time Alignment) */}
              <div className="pt-5 grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                {/* Departure */}
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {depTime}
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {originCode} • Delhi
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {firstSegment.originTerminal || 'Indira Gandhi Intl, T3'}
                  </div>
                </div>

                {/* Duration & Route Path (No Overlapping, Clear Vertical Spacing) */}
                <div className="flex flex-col items-center justify-center text-center px-4 min-w-[140px]">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                    {durationFormatted}
                  </span>
                  <div className="w-full flex items-center justify-center relative my-1 h-6 max-w-[140px]">
                    <div className="h-[2px] w-full bg-slate-300 dark:bg-slate-700"></div>
                    <div className={`absolute px-2 text-[#005cab] dark:text-blue-400 flex items-center justify-center ${
                      isDark ? 'bg-slate-900' : 'bg-white'
                    }`}>
                      <span className="material-symbols-outlined text-[16px] rotate-90 leading-none">flight</span>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    {selectedFlight?.isDirect ? 'Non-Stop' : selectedFlight?.layoverText || '1 Stop'}
                  </span>
                </div>

                {/* Arrival */}
                <div className="text-left sm:text-right">
                  <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {arrTime}
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {destCode} • Bengaluru
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {lastSegment.destinationTerminal || 'Kempegowda Intl, T2'}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. CONTACT INFORMATION SECTION */}
            <div className={`border rounded-xl p-6 shadow-xs ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E6E6E6]'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-[22px]">
                  contact_mail
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Contact Information
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto hidden sm:inline">
                  Tickets & updates will be sent here
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                {/* Email Input */}
                <div className="sm:col-span-7">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5" htmlFor="contactEmail">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="contactEmail"
                      type="email"
                      value={contactInfo.email}
                      onChange={(e) => {
                        dispatch(setContactInfo({ email: e.target.value }));
                        if (errors.email) setErrors({ ...errors, email: null });
                      }}
                      placeholder="name@domain.com"
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition-all focus:outline-hidden ${
                        errors.email 
                          ? 'border-red-500 ring-1 ring-red-500' 
                          : 'border-slate-300 dark:border-slate-700 focus:border-[#005cab] focus:ring-1 focus:ring-[#005cab]'
                      } ${isDark ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-slate-50/50 text-slate-900 placeholder-slate-400'}`}
                    />
                    {isEmailValid(contactInfo.email) && (
                      <div className="absolute right-3 top-2.5 text-emerald-500 flex items-center">
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                      </div>
                    )}
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-[11px] mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Phone Number Input */}
                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5" htmlFor="contactPhone">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <select
                      id="contactCountryCode"
                      value={contactInfo.countryCode}
                      onChange={(e) => dispatch(setContactInfo({ countryCode: e.target.value }))}
                      className={`rounded-l-lg border border-r-0 text-xs font-semibold px-2 py-2.5 focus:outline-hidden ${
                        isDark 
                          ? 'bg-slate-800 border-slate-700 text-slate-200' 
                          : 'bg-slate-100 border-slate-300 text-slate-800'
                      }`}
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.label} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                    <input
                      id="contactPhone"
                      type="tel"
                      value={contactInfo.phone}
                      onChange={(e) => {
                        dispatch(setContactInfo({ phone: e.target.value }));
                        if (errors.phone) setErrors({ ...errors, phone: null });
                      }}
                      placeholder="Mobile number"
                      className={`w-full rounded-r-lg border px-3.5 py-2.5 text-sm transition-all focus:outline-hidden ${
                        errors.phone 
                          ? 'border-red-500 ring-1 ring-red-500' 
                          : 'border-slate-300 dark:border-slate-700 focus:border-[#005cab] focus:ring-1 focus:ring-[#005cab]'
                      } ${isDark ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-slate-50/50 text-slate-900 placeholder-slate-400'}`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-[11px] mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>

              {/* WhatsApp & SMS updates checkbox */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                <input
                  id="whatsappUpdates"
                  type="checkbox"
                  checked={contactInfo.whatsappUpdates}
                  onChange={(e) => dispatch(setContactInfo({ whatsappUpdates: e.target.checked }))}
                  className="mt-1 rounded text-[#005cab] focus:ring-[#005cab] border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <label htmlFor="whatsappUpdates" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  Send booking updates, boarding pass, and real-time gate notifications via WhatsApp & SMS
                </label>
              </div>
            </div>

            {/* 3. PASSENGER DETAILS SECTIONS (No Pre-selected Seat, Dedicated Screen) */}
            {passengers.map((pax, index) => {
              const hasManualSeat = Boolean(pax.seatNo && pax.seatNo !== 'AUTO' && !pax.isAutoAssigned);
              const isAutoAssigned = Boolean(pax.isAutoAssigned || pax.seatNo === 'AUTO');

              return (
                <div
                  key={pax.id}
                  className={`border rounded-xl p-6 shadow-xs ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E6E6E6]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-[22px]">
                        person
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Passenger {index + 1} ({index === 0 ? 'Adult - Primary' : 'Traveler'})
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasManualSeat ? (
                        <span className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">airline_seat_recline_normal</span>
                          Seat {pax.seatNo} {pax.seatPrice > 0 ? `(+₹${pax.seatPrice})` : '(Free)'}
                        </span>
                      ) : isAutoAssigned ? (
                        <span className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[#005cab] dark:text-blue-400 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                          Auto-Assigned at Check-in (Free)
                        </span>
                      ) : (
                        <span className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                          Seat Not Selected
                        </span>
                      )}

                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => dispatch(removePassenger(index))}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* First Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5" htmlFor={`firstName_${index}`}>
                        First / Given Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`firstName_${index}`}
                        type="text"
                        value={pax.firstName}
                        onChange={(e) => {
                          dispatch(updatePassenger({ index, field: 'firstName', value: e.target.value }));
                          if (errors[`pax_${index}_firstName`]) {
                            setErrors({ ...errors, [`pax_${index}_firstName`]: null });
                          }
                        }}
                        placeholder="e.g. Alex"
                        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition-all focus:outline-hidden ${
                          errors[`pax_${index}_firstName`] 
                            ? 'border-red-500 ring-1 ring-red-500' 
                            : 'border-slate-300 dark:border-slate-700 focus:border-[#005cab] focus:ring-1 focus:ring-[#005cab]'
                        } ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-50/50 text-slate-900'}`}
                      />
                      {errors[`pax_${index}_firstName`] && (
                        <p className="text-red-500 text-[11px] mt-1">{errors[`pax_${index}_firstName`]}</p>
                      )}
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5" htmlFor={`lastName_${index}`}>
                        Last / Surname <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`lastName_${index}`}
                        type="text"
                        value={pax.lastName}
                        onChange={(e) => {
                          dispatch(updatePassenger({ index, field: 'lastName', value: e.target.value }));
                          if (errors[`pax_${index}_lastName`]) {
                            setErrors({ ...errors, [`pax_${index}_lastName`]: null });
                          }
                        }}
                        placeholder="e.g. Rivera"
                        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition-all focus:outline-hidden ${
                          errors[`pax_${index}_lastName`] 
                            ? 'border-red-500 ring-1 ring-red-500' 
                            : 'border-slate-300 dark:border-slate-700 focus:border-[#005cab] focus:ring-1 focus:ring-[#005cab]'
                        } ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-50/50 text-slate-900'}`}
                      />
                      {errors[`pax_${index}_lastName`] && (
                        <p className="text-red-500 text-[11px] mt-1">{errors[`pax_${index}_lastName`]}</p>
                      )}
                    </div>

                    {/* Gender (Requirement 2) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5" htmlFor={`gender_${index}`}>
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        id={`gender_${index}`}
                        value={pax.gender || ''}
                        onChange={(e) => {
                          dispatch(updatePassenger({ index, field: 'gender', value: e.target.value }));
                          if (errors[`pax_${index}_gender`]) {
                            setErrors({ ...errors, [`pax_${index}_gender`]: null });
                          }
                        }}
                        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition-all focus:outline-hidden ${
                          errors[`pax_${index}_gender`] 
                            ? 'border-red-500 ring-1 ring-red-500' 
                            : 'border-slate-300 dark:border-slate-700 focus:border-[#005cab] focus:ring-1 focus:ring-[#005cab]'
                        } ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-50/50 text-slate-900'}`}
                      >
                        <option value="">Select Gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                      {errors[`pax_${index}_gender`] && (
                        <p className="text-red-500 text-[11px] mt-1">{errors[`pax_${index}_gender`]}</p>
                      )}
                    </div>

                    {/* Age */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5" htmlFor={`passengerAge_${index}`}>
                        Age (Years) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`passengerAge_${index}`}
                        type="number"
                        min="1"
                        max="115"
                        value={pax.age}
                        onChange={(e) => {
                          dispatch(updatePassenger({ index, field: 'age', value: e.target.value }));
                          if (errors[`pax_${index}_age`]) {
                            setErrors({ ...errors, [`pax_${index}_age`]: null });
                          }
                        }}
                        placeholder="32"
                        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition-all focus:outline-hidden ${
                          errors[`pax_${index}_age`] 
                            ? 'border-red-500 ring-1 ring-red-500' 
                            : 'border-slate-300 dark:border-slate-700 focus:border-[#005cab] focus:ring-1 focus:ring-[#005cab]'
                        } ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-50/50 text-slate-900'}`}
                      />
                      {errors[`pax_${index}_age`] && (
                        <p className="text-red-500 text-[11px] mt-1">{errors[`pax_${index}_age`]}</p>
                      )}
                    </div>

                    {/* Nationality */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5" htmlFor={`passengerNationality_${index}`}>
                        Nationality <span className="text-red-500">*</span>
                      </label>
                      <select
                        id={`passengerNationality_${index}`}
                        value={pax.nationality}
                        onChange={(e) => dispatch(updatePassenger({ index, field: 'nationality', value: e.target.value }))}
                        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition-all focus:outline-hidden ${
                          isDark 
                            ? 'bg-slate-800 border-slate-700 text-white' 
                            : 'bg-slate-50/50 border-slate-300 text-slate-900'
                        }`}
                      >
                        {NATIONALITIES.map((nat) => (
                          <option key={nat} value={nat}>{nat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Seat Selection & Meal Options */}
                  <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">
                      Flight Preferences & In-Cabin Services
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                      
                      {/* DEDICATED SEAT SELECTION BUTTON / AUTO-ASSIGN OPTION */}
                      <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                          Seat Allocation
                        </label>
                        
                        <div className="flex flex-col gap-2">
                          {hasManualSeat ? (
                            <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40">
                              <div className="flex items-center gap-2.5">
                                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[20px]">airline_seat_recline_normal</span>
                                <div>
                                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                    Seat {pax.seatNo} Selected
                                  </div>
                                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                    {pax.seatType === 'extraLegroom' ? 'Extra Legroom Seat (+₹1,200)' : 'Standard Cabin Seat (Included)'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => dispatch(setSeatMapModalOpen({ isOpen: true, paxIndex: index }))}
                                  className="text-xs font-bold text-[#005cab] dark:text-blue-400 hover:underline cursor-pointer"
                                >
                                  Change
                                </button>
                                <button
                                  type="button"
                                  onClick={() => dispatch(clearPassengerSeat(index))}
                                  className="text-xs text-red-500 hover:underline cursor-pointer"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          ) : isAutoAssigned ? (
                            <div className="flex items-center justify-between p-3 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40">
                              <div className="flex items-center gap-2.5">
                                <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-[20px]">shuffle</span>
                                <div>
                                  <div className="text-xs font-bold text-[#005cab] dark:text-blue-300">
                                    Auto-assigned at Check-in
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Free seat assigned automatically at airport check-in
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => dispatch(setSeatMapModalOpen({ isOpen: true, paxIndex: index }))}
                                  className="text-xs font-bold text-[#005cab] dark:text-blue-400 hover:underline cursor-pointer"
                                >
                                  Choose Seat
                                </button>
                                <button
                                  type="button"
                                  onClick={() => dispatch(clearPassengerSeat(index))}
                                  className="text-xs text-red-500 hover:underline cursor-pointer"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <button
                                type="button"
                                onClick={() => dispatch(setSeatMapModalOpen({ isOpen: true, paxIndex: index }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-[#005cab] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-between cursor-pointer"
                              >
                                <span className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">airline_seat_recline_extra</span>
                                  <span>Select Seat on Aircraft Map</span>
                                </span>
                                <span className="text-[11px] underline">Open Map</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => dispatch(autoAssignSeatToPassenger(index))}
                                className="text-[11px] text-[#005cab] dark:text-blue-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">shuffle</span>
                                <span>Opt for Free Auto-Assign at Check-in</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {errors[`pax_${index}_seat`] && (
                          <p className="text-red-500 text-[11px] mt-1">{errors[`pax_${index}_seat`]}</p>
                        )}
                      </div>

                      {/* Meal Preference Dropdown */}
                      <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1" htmlFor={`mealPref_${index}`}>
                          Complimentary In-flight Meal
                        </label>
                        <select
                          id={`mealPref_${index}`}
                          value={pax.mealPreference}
                          onChange={(e) => dispatch(updatePassenger({ index, field: 'mealPreference', value: e.target.value }))}
                          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition-all focus:outline-hidden ${
                            isDark 
                              ? 'bg-slate-800 border-slate-700 text-white' 
                              : 'bg-slate-50/50 border-slate-300 text-slate-900'
                          }`}
                        >
                          {MEAL_OPTIONS.map((meal) => (
                            <option key={meal} value={meal}>{meal}</option>
                          ))}
                        </select>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Another Passenger Button */}
            <div>
              <button
                type="button"
                onClick={() => dispatch(addPassenger())}
                className="flex items-center gap-1.5 text-[#005cab] dark:text-blue-400 hover:underline text-xs font-bold transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Add Another Passenger
              </button>
            </div>

            {/* 4. ADD-ONS / BAGGAGE & TRAVEL PROTECTION */}
            <div className={`border rounded-xl p-6 shadow-xs ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E6E6E6]'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-[22px]">
                    luggage
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Baggage & Trip Protection
                  </h3>
                </div>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  Included: 1 Cabin (7kg) + 1 Check-in (15kg)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Travel Insurance Option */}
                <label className={`border rounded-lg p-4 cursor-pointer flex items-start gap-3 transition-all ${
                  addons.insurance 
                    ? 'border-[#005cab] bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-[#005cab]' 
                    : isDark ? 'border-slate-800 bg-slate-800/40 hover:border-slate-700' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={addons.insurance}
                    onChange={() => dispatch(toggleAddon('insurance'))}
                    className="mt-1 rounded text-[#005cab] focus:ring-[#005cab] border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Horizon-X Protect
                      </span>
                      <span className="text-xs font-bold text-[#005cab] dark:text-blue-400">
                        +₹499.00
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Medical coverage up to ₹50,00,000, trip cancellation, and baggage loss protection.
                    </p>
                  </div>
                </label>

                {/* Extra Baggage Option */}
                <label className={`border rounded-lg p-4 cursor-pointer flex items-start gap-3 transition-all ${
                  addons.extraBaggage 
                    ? 'border-[#005cab] bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-[#005cab]' 
                    : isDark ? 'border-slate-800 bg-slate-800/40 hover:border-slate-700' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={addons.extraBaggage}
                    onChange={() => dispatch(toggleAddon('extraBaggage'))}
                    className="mt-1 rounded text-[#005cab] focus:ring-[#005cab] border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Additional 10kg Baggage
                      </span>
                      <span className="text-xs font-bold text-[#005cab] dark:text-blue-400">
                        +₹999.00
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Pre-purchase extra allowance at 40% discount versus airport check-in desk rates.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* PROCEED TO PAYMENT CTA BUTTON */}
            <div className="pt-2">
              <button
                type="button"
                id="proceedBtn"
                onClick={handleProceedToPayment}
                className="w-full bg-[#005cab] hover:bg-[#004786] active:scale-[0.99] text-white font-bold py-4 px-8 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer text-base"
              >
                <span>Proceed to Payment</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-3">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>256-bit encrypted checkout with instant e-ticket issuance</span>
              </div>
            </div>

          </div>

          {/* ==============================================================
             RIGHT COLUMN (35% / 4 Cols): Sticky Fare Summary + Promo
             ============================================================== */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`border rounded-xl p-6 shadow-xs sticky top-24 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E6E6E6]'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Fare Summary
                </h3>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {passengers.length} {passengers.length === 1 ? 'Traveler' : 'Travelers'}
                </span>
              </div>

              {/* Line Items (Convenience & Platform Fee exact admin fee cap, NO cancellation fee) */}
              <div className="py-4 space-y-3 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <span>Base Fare ({passengers.length} Adult)</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ₹{pricing.baseFare.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    Convenience & Platform Fee
                    <span className="material-symbols-outlined text-slate-400 text-[14px] cursor-help" title="Configured Ground Control platform & security fee cap">
                      verified
                    </span>
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ₹{pricing.platformFee.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Seat Selection</span>
                  <span className={pricing.seatMealAddon > 0 ? 'font-semibold text-[#005cab] dark:text-blue-400' : 'font-semibold text-emerald-600 dark:text-emerald-400'}>
                    {pricing.seatMealAddon > 0 
                      ? `+₹${pricing.seatMealAddon.toLocaleString('en-IN')}` 
                      : 'Included (₹0.00)'}
                  </span>
                </div>

                {pricing.extraAddons > 0 && (
                  <div className="flex justify-between items-center text-[#005cab] dark:text-blue-400 font-semibold">
                    <span>Extra Add-ons</span>
                    <span>+₹{pricing.extraAddons.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {pricing.discount > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Promo Discount ({promo.appliedCode})</span>
                    <span>-₹{pricing.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* Total Payable Display */}
              <div className="py-4 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                    Total Payable
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Includes all statutory fees
                  </div>
                </div>

                {/* High Contrast Chip */}
                <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[#005cab] dark:text-blue-400 text-2xl font-black px-3.5 py-1 rounded-xl tracking-tight">
                  ₹{pricing.totalPayable.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Promo Code Input */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5" htmlFor="promoInput">
                  Have a Promo Code or Miles Voucher?
                </label>
                <div className="flex gap-2">
                  <input
                    id="promoInput"
                    type="text"
                    value={promo.code}
                    onChange={(e) => dispatch(setPromoInput(e.target.value))}
                    placeholder="FLYHIGH"
                    className={`w-full rounded-lg border text-xs font-mono uppercase px-3 py-2 transition-all focus:outline-hidden ${
                      promo.isError 
                        ? 'border-red-500 ring-1 ring-red-500' 
                        : 'border-slate-300 dark:border-slate-700 focus:border-[#005cab]'
                    } ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-900'}`}
                  />
                  <button
                    type="button"
                    onClick={() => dispatch(applyPromoCode())}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    }`}
                  >
                    Apply
                  </button>
                </div>

                {promo.message && (
                  <div className={`mt-2 text-xs flex items-center gap-1 font-medium ${
                    promo.isError ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <span className="material-symbols-outlined text-[16px]">
                      {promo.isError ? 'error' : 'check_circle'}
                    </span>
                    <span>{promo.message}</span>
                  </div>
                )}
              </div>

              {/* Horizon-X Assurance Guarantee Badge */}
              <div className={`mt-5 p-3.5 rounded-xl border flex items-start gap-2.5 ${
                isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-[20px] mt-0.5">
                  verified_user
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Horizon-X Assurance Guarantee
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Free date changes up to 24 hours prior to departure. Instant refunds to original payment source.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ==============================================================
         3. DEDICATED AIRCRAFT SEAT MAP SCREEN / MODAL (OTA Standards)
         ============================================================== */}
      {ui.isSeatMapOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className={`border rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#E6E6E6] text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#005cab] dark:text-blue-400">
                  <span className="material-symbols-outlined text-[24px]">airline_seat_recline_extra</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Select Seats • {aircraft}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {airlineName} ({flightNumber}) • {originCode} ➔ {destCode}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dispatch(setSeatMapModalOpen({ isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Passenger Switcher Tabs (if multiple passengers) */}
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                Selecting For:
              </span>
              {passengers.map((p, idx) => {
                const isActive = ui.seatMapActivePaxIndex === idx;
                const pName = p.firstName ? `${p.firstName} ${p.lastName}` : `Passenger ${idx + 1}`;
                const seatBadge = p.seatNo && !p.seatNo.startsWith('AUTO') 
                  ? p.seatNo 
                  : p.isAutoAssigned 
                    ? 'Auto' 
                    : 'Choose';

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => dispatch(setSeatMapActivePaxIndex(idx))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isActive 
                        ? 'bg-[#005cab] text-white shadow-xs' 
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-[#005cab]'
                    }`}
                  >
                    <span>{pName}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-[#005cab] dark:text-blue-400'
                    }`}>
                      {seatBadge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-[11px] flex flex-wrap items-center justify-center gap-4 text-slate-600 dark:text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 inline-block"></span>
                Standard (Included)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border border-purple-400 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 inline-block"></span>
                Extra Legroom (+₹1,200)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-[#005cab] inline-block"></span>
                Selected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-slate-300 dark:bg-slate-700 inline-block opacity-60"></span>
                Occupied
              </span>
            </div>

            {/* Active Passenger Seat Status Banner */}
            {(() => {
              const activePax = passengers[ui.seatMapActivePaxIndex] || passengers[0];
              const isCurrentPaxAuto = Boolean(activePax?.isAutoAssigned || activePax?.seatNo === 'AUTO');
              const hasCurrentPaxSeat = Boolean(activePax?.seatNo && activePax?.seatNo !== 'AUTO' && !activePax?.isAutoAssigned);
              const paxLabel = activePax?.firstName ? `${activePax.firstName} ${activePax.lastName}` : `Passenger ${ui.seatMapActivePaxIndex + 1}`;

              return (
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{paxLabel}:</span>
                    {hasCurrentPaxSeat ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="material-symbols-outlined text-[16px]">airline_seat_recline_normal</span>
                        Seat {activePax.seatNo} Selected {activePax.seatPrice > 0 ? `(+₹${activePax.seatPrice})` : '(Free)'}
                      </span>
                    ) : isCurrentPaxAuto ? (
                      <span className="inline-flex items-center gap-1 font-bold text-[#005cab] dark:text-blue-400">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Auto-assigned at Check-in (Free)
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        No seat selected yet (Tap any seat on map or keep auto-assign)
                      </span>
                    )}
                  </div>

                  {hasCurrentPaxSeat && (
                    <button
                      type="button"
                      onClick={() => dispatch(autoAssignSeatToPassenger(ui.seatMapActivePaxIndex))}
                      className="text-[11px] font-semibold text-[#005cab] dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">shuffle</span>
                      <span>Switch to Auto-Assign</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Fuselage / Aircraft Cabin Map */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950/60">
              <div className="max-w-md mx-auto">
                
                {/* Airplane Nose / Cockpit Graphic */}
                <div className="w-32 h-16 border-t-2 border-x-2 border-slate-300 dark:border-slate-700 rounded-t-full mx-auto flex flex-col items-center justify-center text-slate-400 mb-4 bg-white dark:bg-slate-900 shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">flight</span>
                  <span className="text-[9px] uppercase tracking-wider font-bold">Cockpit</span>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 mb-2 px-3">
                  <span>A</span>
                  <span>B</span>
                  <span>C</span>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600">AISLE</span>
                  <span>D</span>
                  <span>E</span>
                  <span>F</span>
                </div>

                {/* Rows Grid */}
                <div className="space-y-2">
                  {seatMapRows.map((row) => (
                    <div key={row.rowNumber} className="relative">
                      {/* Emergency Exit wings indicator at Row 11 */}
                      {row.rowNumber === 11 && (
                        <div className="my-2 py-1 bg-amber-500/10 border-y border-amber-500/30 text-[10px] font-bold text-center text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                          Emergency Exit Row (Extra Legroom)
                        </div>
                      )}

                      <div className="grid grid-cols-7 gap-1 items-center px-2">
                        {/* Left 3 Seats (A, B, C) */}
                        {row.seatsLeft.map(seatId => {
                          const isOccupied = OCCUPIED_SEATS.has(seatId);
                          const isSelectedByCurrent = activePax.seatNo === seatId;
                          const assignedToOther = selectedSeatPassengerMap[seatId];
                          const isAssignedToOther = assignedToOther && assignedToOther.paxIndex !== ui.seatMapActivePaxIndex;

                          let seatClasses = "w-full aspect-square rounded-lg border text-[11px] font-bold flex flex-col items-center justify-center transition-all select-none ";
                          
                          if (isSelectedByCurrent) {
                            seatClasses += "bg-[#005cab] text-white border-[#005cab] shadow-xs scale-105 ring-2 ring-blue-300";
                          } else if (isAssignedToOther) {
                            seatClasses += "bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border-blue-400 cursor-not-allowed opacity-90";
                          } else if (isOccupied) {
                            seatClasses += "bg-slate-200 dark:bg-slate-800/80 text-slate-400 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-50";
                          } else if (row.isExtraLegroom) {
                            seatClasses += "bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:border-purple-500 hover:scale-105 cursor-pointer";
                          } else {
                            seatClasses += "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-[#005cab] hover:scale-105 cursor-pointer";
                          }

                          return (
                            <button
                              key={seatId}
                              type="button"
                              disabled={isOccupied || isAssignedToOther}
                              onClick={() => {
                                dispatch(assignSeatToPassenger({
                                  index: ui.seatMapActivePaxIndex,
                                  seatNo: seatId,
                                  seatLabel: `${seatId} (${row.isExtraLegroom ? 'Extra Legroom' : 'Standard'})`,
                                  seatType: row.type,
                                  seatPrice: row.price
                                }));
                                // If there are remaining unassigned passengers, auto-advance
                                const nextUnassigned = passengers.findIndex((p, i) => i !== ui.seatMapActivePaxIndex && !p.seatNo);
                                if (nextUnassigned !== -1) {
                                  dispatch(setSeatMapActivePaxIndex(nextUnassigned));
                                }
                              }}
                              className={seatClasses}
                              title={
                                isAssignedToOther 
                                  ? `Assigned to ${assignedToOther.paxName}` 
                                  : isOccupied 
                                    ? 'Occupied' 
                                    : `Seat ${seatId} (${row.isExtraLegroom ? '+₹1,200' : 'Free'})`
                              }
                            >
                              <span>{seatId}</span>
                              {row.isExtraLegroom && !isSelectedByCurrent && (
                                <span className="text-[8px] text-purple-600 dark:text-purple-400 font-normal leading-none">+1.2k</span>
                              )}
                            </button>
                          );
                        })}

                        {/* Aisle Row Number */}
                        <div className="text-center font-mono font-bold text-xs text-slate-400">
                          {row.rowNumber}
                        </div>

                        {/* Right 3 Seats (D, E, F) */}
                        {row.seatsRight.map(seatId => {
                          const isOccupied = OCCUPIED_SEATS.has(seatId);
                          const isSelectedByCurrent = activePax.seatNo === seatId;
                          const assignedToOther = selectedSeatPassengerMap[seatId];
                          const isAssignedToOther = assignedToOther && assignedToOther.paxIndex !== ui.seatMapActivePaxIndex;

                          let seatClasses = "w-full aspect-square rounded-lg border text-[11px] font-bold flex flex-col items-center justify-center transition-all select-none ";
                          
                          if (isSelectedByCurrent) {
                            seatClasses += "bg-[#005cab] text-white border-[#005cab] shadow-xs scale-105 ring-2 ring-blue-300";
                          } else if (isAssignedToOther) {
                            seatClasses += "bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border-blue-400 cursor-not-allowed opacity-90";
                          } else if (isOccupied) {
                            seatClasses += "bg-slate-200 dark:bg-slate-800/80 text-slate-400 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-50";
                          } else if (row.isExtraLegroom) {
                            seatClasses += "bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:border-purple-500 hover:scale-105 cursor-pointer";
                          } else {
                            seatClasses += "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-[#005cab] hover:scale-105 cursor-pointer";
                          }

                          return (
                            <button
                              key={seatId}
                              type="button"
                              disabled={isOccupied || isAssignedToOther}
                              onClick={() => {
                                dispatch(assignSeatToPassenger({
                                  index: ui.seatMapActivePaxIndex,
                                  seatNo: seatId,
                                  seatLabel: `${seatId} (${row.isExtraLegroom ? 'Extra Legroom' : 'Standard'})`,
                                  seatType: row.type,
                                  seatPrice: row.price
                                }));
                                const nextUnassigned = passengers.findIndex((p, i) => i !== ui.seatMapActivePaxIndex && !p.seatNo);
                                if (nextUnassigned !== -1) {
                                  dispatch(setSeatMapActivePaxIndex(nextUnassigned));
                                }
                              }}
                              className={seatClasses}
                              title={
                                isAssignedToOther 
                                  ? `Assigned to ${assignedToOther.paxName}` 
                                  : isOccupied 
                                    ? 'Occupied' 
                                    : `Seat ${seatId} (${row.isExtraLegroom ? '+₹1,200' : 'Free'})`
                              }
                            >
                              <span>{seatId}</span>
                              {row.isExtraLegroom && !isSelectedByCurrent && (
                                <span className="text-[8px] text-purple-600 dark:text-purple-400 font-normal leading-none">+1.2k</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                {(() => {
                  const activePax = passengers[ui.seatMapActivePaxIndex] || passengers[0];
                  const isCurrentPaxAuto = Boolean(activePax?.isAutoAssigned || activePax?.seatNo === 'AUTO');
                  const hasCurrentPaxSeat = Boolean(activePax?.seatNo && activePax?.seatNo !== 'AUTO' && !activePax?.isAutoAssigned);

                  if (isCurrentPaxAuto) {
                    return (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[#005cab] dark:text-blue-400 text-xs font-semibold">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Auto-Assign Active (Free)</span>
                      </div>
                    );
                  }

                  if (hasCurrentPaxSeat) {
                    return (
                      <button
                        type="button"
                        onClick={() => dispatch(autoAssignSeatToPassenger(ui.seatMapActivePaxIndex))}
                        className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">shuffle</span>
                        <span>Change to Free Auto-Assign</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      type="button"
                      onClick={() => dispatch(autoAssignSeatToPassenger(ui.seatMapActivePaxIndex))}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">shuffle</span>
                      <span>Opt for Free Auto-Assign</span>
                    </button>
                  );
                })()}

                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                  Seat Extra: <strong className="text-[#005cab] dark:text-blue-400">₹{pricing.seatMealAddon.toLocaleString('en-IN')}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => dispatch(setSeatMapModalOpen({ isOpen: false }))}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#005cab] hover:bg-[#004786] text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Confirm Seats & Continue</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==============================================================
         4. INTERACTIVE REVIEW JOURNEY & PAYMENT MODAL
         ============================================================== */}
      {ui.isReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#E6E6E6] text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-[24px]">
                  assignment_turned_in
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Review Your Journey
                </h2>
              </div>
              <button
                type="button"
                onClick={() => dispatch(setReviewModalOpen(false))}
                disabled={ui.isSubmitting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-5 space-y-4">
              
              {/* Flight Snippet */}
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {airlineName} ({flightNumber})
                  </span>
                  <span className="text-xs font-semibold text-[#005cab] dark:text-blue-400">
                    {cabinClass} Class
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-900 dark:text-white">
                  <div>
                    <div className="font-black text-base">{depTime} {originCode}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {firstSegment.originTerminal || 'Terminal 3'}
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-[11px] text-slate-400 font-medium">{durationFormatted}</span>
                    <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-[18px]">
                      arrow_forward
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-base">{arrTime} {destCode}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {lastSegment.destinationTerminal || 'Terminal 2'}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  Date: {travelDateFormatted} • {selectedFlight?.isDirect ? 'Non-stop' : '1 Stop'}
                </div>
              </div>

              {/* Passenger Details Overview */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Passenger Details
                </h4>
                <div className="space-y-3 pt-1">
                  {passengers.map((p, idx) => (
                    <div key={p.id} className="grid grid-cols-2 gap-2 text-xs border-b border-slate-100 dark:border-slate-800 pb-2 last:border-b-0 last:pb-0">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Passenger {idx + 1}:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {p.firstName} {p.lastName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Age, Gender & Nationality:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {p.age} Yrs • {p.gender === 'MALE' ? 'Male' : p.gender === 'FEMALE' ? 'Female' : p.gender === 'OTHER' ? 'Other' : 'Unspecified'} • {p.nationality}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Seat Allocated:</span>
                        <span className="font-bold text-[#005cab] dark:text-blue-400">
                          {p.seatNo && !p.seatNo.startsWith('AUTO') ? `Seat ${p.seatNo}` : 'Auto-assigned at Check-in'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Meal Preference:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {p.mealPreference}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Info Summary */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Booking Confirmation will be sent to
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {contactInfo.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Mobile:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {contactInfo.countryCode} {contactInfo.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Breakdown Summary */}
              <div className="bg-blue-50/70 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold">
                    Final Payable Amount
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Includes flight fare, platform fee & active selections
                  </span>
                </div>
                <div className="text-2xl font-black text-[#005cab] dark:text-blue-400">
                  ₹{pricing.totalPayable.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Error Message if API fails */}
              {ui.errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                  <span>{ui.errorMessage}</span>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => dispatch(setReviewModalOpen(false))}
                disabled={ui.isSubmitting}
                className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Edit Details
              </button>

              <button
                type="button"
                id="completePaymentBtn"
                onClick={handleCompletePayment}
                disabled={ui.isSubmitting}
                className="px-6 py-2.5 rounded-lg bg-[#005cab] hover:bg-[#004786] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {ui.isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Opening Stripe Gateway...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    <span>Complete Payment</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==============================================================
         4A. SEAT SELECTION PREFERENCE PROMPT MODAL (OTA Flow)
         ============================================================== */}
      {isSeatPromptOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl relative ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E6E6E6]'
          }`}>
            <button
              type="button"
              onClick={() => setIsSeatPromptOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#005cab] dark:text-blue-400 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[28px]">airline_seat_recline_extra</span>
            </div>
            
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Seat Selection Preference
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              You haven't selected seats for all passengers. Would you like to pick your seats manually on the aircraft cabin map now, or proceed with free auto-assignment at check-in?
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setIsSeatPromptOpen(false);
                  dispatch(setSeatMapModalOpen({ isOpen: true, paxIndex: 0 }));
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#005cab] hover:bg-[#004786] text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">map</span>
                <span>Select Seats on Aircraft Map</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch(autoAssignAllSeats());
                  setIsSeatPromptOpen(false);
                  dispatch(setReviewModalOpen(true));
                }}
                className="w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">shuffle</span>
                <span>Auto-Assign Free Seats & Continue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
         4B. GUEST SIGN-IN & ONBOARDING DIALOG (Requirement 5)
         ============================================================== */}
      {isGuestAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl relative ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E6E6E6]'
          }`}>
            
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsGuestAuthModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            {/* Step 1: Prompt to complete onboarding with both Email and Phone */}
            {guestAuthStep === 'prompt' && (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#005cab] dark:text-blue-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">verified_user</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Complete Onboarding to Book Flight
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Enter both your email and mobile number to manage your itinerary, receive real-time boarding pass updates, and unlock seamless web check-in.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => {
                        setGuestEmail(e.target.value);
                        setGuestAuthError('');
                      }}
                      placeholder="e.g. alex@example.com"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-sm bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#005cab]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden focus-within:border-[#005cab]">
                      <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700 select-none">
                        +91 (IN)
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={guestPhone}
                        onChange={(e) => {
                          setGuestPhone(e.target.value.replace(/\D/g, ''));
                          setGuestAuthError('');
                        }}
                        placeholder="10-digit mobile number"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50/50 dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {guestAuthError && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 rounded-lg text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      <span>{guestAuthError}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGuestSendOtp}
                    disabled={guestAuthLoading || !guestEmail.trim() || !guestPhone.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-[#005cab] hover:bg-[#004786] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{guestAuthLoading ? 'Sending Verification Code...' : 'Get OTP'}</span>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Enter 4-digit OTP */}
            {guestAuthStep === 'otp' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Enter 4-Digit Verification Code
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    We sent a 4-digit code to <strong className="text-slate-800 dark:text-slate-200">{guestEmail}</strong> and <strong className="text-slate-800 dark:text-slate-200">+91 {guestPhone}</strong>.
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 text-[11px] text-[#005cab] dark:text-blue-300">
                  ⚡ Sandbox Mode Demo Code: <strong className="font-mono text-xs">{mockOtpHit || '1234'}</strong> (or 1111 / 2222)
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5 text-center">
                    Enter 4-Digit OTP
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={guestOtp}
                    onChange={(e) => {
                      setGuestOtp(e.target.value.replace(/\D/g, ''));
                      setGuestAuthError('');
                    }}
                    placeholder="• • • •"
                    className="w-48 mx-auto block text-center tracking-[12px] text-2xl font-bold font-mono py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#005cab]"
                  />
                  {guestAuthError && (
                    <p className="text-red-500 text-xs mt-1.5 text-center">{guestAuthError}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setGuestAuthStep('prompt')}
                    className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleGuestVerifyOtp}
                    disabled={guestAuthLoading || guestOtp.length !== 4}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-[#005cab] hover:bg-[#004786] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {guestAuthLoading ? 'Verifying...' : 'Complete Onboarding & Proceed'}
                  </button>
                </div>
              </div>
            )}

            {guestAuthStep === 'success' && (
              <div className="space-y-4 text-center py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[32px]">check_circle</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Onboarding complete!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {guestAuthSuccessMsg || 'You are signed in. Please complete your booking.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsGuestAuthModalOpen(false);
                    executePaymentCheckout();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#005cab] hover:bg-[#004786] text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Complete Booking & Proceed to Payment</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ==============================================================
         4C. CONFIRMED FLIGHT TICKET BOOKING MODAL (Requirement 1)
         ============================================================== */}
      <ConfirmedBookingModal
        isOpen={ui.isSuccessModalOpen}
        onClose={() => dispatch(setSuccessModalOpen(false))}
        pnrOverride={searchParams.get('pnr')}
      />

      {/* ==============================================================
         4D. DECLINED PAYMENT MODAL (Requirement 2)
         ============================================================== */}
      <DeclinedPaymentModal
        isOpen={ui.isDeclinedModalOpen}
        onClose={() => dispatch(setDeclinedModalOpen(false))}
        onReviewBooking={() => dispatch(setReviewModalOpen(true))}
        onTryAgain={executePaymentCheckout}
        isRetrying={ui.isSubmitting}
      />

      {/* ==============================================================
         5. FOOTER (High Contrast in Light Mode & Dark Mode)
         ============================================================== */}
      <footer className={`border-t mt-auto py-12 px-4 md:px-8 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
      }`}>
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <span className="text-xl font-bold tracking-tight text-[#005cab] dark:text-blue-400">
              Horizon-X
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              © 2026 Horizon-X Aviation Systems. All rights reserved.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <Link to="/flights" className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">Help Center</Link>
            <Link to="/flights" className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">About Us</Link>
            <Link to="/flights" className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">Terms of Service</Link>
            <Link to="/flights" className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">Privacy Policy</Link>
            <Link to="/flights" className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
