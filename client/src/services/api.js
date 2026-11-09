import axios from 'axios';

/**
 * Horizon-X Centralized API Configuration & Endpoints Service
 * Standardizes communication for both Admin Control Desk and Public/User Client.
 * Supports configurable VITE_API_BASE_URL for seamless local development, 
 * sandbox testing, and cloud deployments (Vercel, Render).
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

// ==========================================
// 1. ADMIN PANEL ENDPOINTS
// ==========================================
export const ADMIN_ENDPOINTS = {
  // Authentication
  LOGIN: `${API_BASE_URL}/admin/login`,

  // Operations & Hub Telemetry
  CITIES: `${API_BASE_URL}/cities`,
  FLIGHTS: `${API_BASE_URL}/flights`,
  USERS: `${API_BASE_URL}/users`,
  BOOKINGS: `${API_BASE_URL}/bookings`,

  // Fare & Fee Engine Configuration
  FEE_CONFIG: `${API_BASE_URL}/admin/fee-config`,
  UPDATE_PRICE: `${API_BASE_URL}/admin/update-price`,

  // Ground Control Operations
  COMPLETE_BOOKING: (pnr) => `${API_BASE_URL}/admin/bookings/${encodeURIComponent(pnr)}/complete`
};

// ==========================================
// 2. USER PANEL & PUBLIC RADAR ENDPOINTS
// ==========================================
export const USER_ENDPOINTS = {
  // System & Health
  HEALTH: `${API_BASE_URL}/health`,

  // Reference Master Catalogs
  AIRPORTS: `${API_BASE_URL}/airports`,
  AIRLINES: `${API_BASE_URL}/airlines`,

  // Public Flight Radar (Zero Auth Required)
  FLIGHT_STATUS: `${API_BASE_URL}/flight-status`,
  FLIGHTS_STATUS_ALIAS: `${API_BASE_URL}/flights/status`,

  // Flight Search & Itinerary
  SEARCH_ITINERARY: `${API_BASE_URL}/itinerary`,

  // Checkout & Payment
  CREATE_CHECKOUT_SESSION: `${API_BASE_URL}/checkout/create-session`,
  CONFIRM_CHECKOUT: `${API_BASE_URL}/checkout/confirm`,

  // Bookings & Reservation Manifest
  BOOKINGS: `${API_BASE_URL}/bookings`,
  BOOKINGS_MY_ALIAS: `${API_BASE_URL}/bookings/my-bookings`,
  BOOKING_BY_PNR: (pnr) => `${API_BASE_URL}/bookings/${encodeURIComponent(pnr)}`,

  // Document Manifest (E-Ticket & Boarding Pass)
  TICKET: (pnr, format = 'json', download = false) => 
    `${API_BASE_URL}/bookings/${encodeURIComponent(pnr)}/ticket?format=${format}${download ? '&download=true' : ''}`,
  
  BOARDING_PASS: (pnr, format = 'json', download = false) => 
    `${API_BASE_URL}/bookings/${encodeURIComponent(pnr)}/boarding-pass?format=${format}${download ? '&download=true' : ''}`,

  // Web Check-in Desk
  WEB_CHECKIN: `${API_BASE_URL}/checkin/web-checkin`,
  CANCEL_CHECKIN: `${API_BASE_URL}/checkin/cancel`,

  // Cancellation & Refunds
  CANCELLATION_REASONS: `${API_BASE_URL}/cancellation/reasons`,
  CANCEL_BOOKING: `${API_BASE_URL}/cancellation/cancel`,

  // User Authentication & Profile
  AUTH_REGISTER: `${API_BASE_URL}/auth/register`,
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  AUTH_FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
  AUTH_RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
  USER_PROFILE: `${API_BASE_URL}/users/profile`,
  USER_WALLET: `${API_BASE_URL}/users/wallet`,
  USER_DELETE: `${API_BASE_URL}/users`
};

// ==========================================
// 3. ADMIN API HELPER CLIENT
// ==========================================
export const adminApi = {
  login: async (username, password) => {
    const res = await axios.post(ADMIN_ENDPOINTS.LOGIN, { username, password });
    return res.data;
  },

  getHubData: async (token) => {
    const config = { headers: { Authorization: token || sessionStorage.getItem('hx_admin_token') } };
    const [citiesRes, flightsRes, usersRes, bookingsRes] = await Promise.all([
      axios.get(ADMIN_ENDPOINTS.CITIES, config),
      axios.get(ADMIN_ENDPOINTS.FLIGHTS, config),
      axios.get(ADMIN_ENDPOINTS.USERS, config),
      axios.get(ADMIN_ENDPOINTS.BOOKINGS, config).catch(() => ({ data: { data: [] } }))
    ]);

    return {
      cities: citiesRes.data,
      flights: flightsRes.data,
      users: usersRes.data,
      bookings: bookingsRes.data?.data || []
    };
  },

  markBookingComplete: async (pnr, token) => {
    const config = { headers: { Authorization: token || sessionStorage.getItem('hx_admin_token') } };
    const res = await axios.put(ADMIN_ENDPOINTS.COMPLETE_BOOKING(pnr), {}, config);
    return res.data;
  },

  getFeeConfig: async (token) => {
    const config = { headers: { Authorization: token || sessionStorage.getItem('hx_admin_token') } };
    const res = await axios.get(ADMIN_ENDPOINTS.FEE_CONFIG, config);
    return res.data;
  },

  updateFeeConfig: async (payload, token) => {
    const config = { headers: { Authorization: token || sessionStorage.getItem('hx_admin_token') } };
    const res = await axios.put(ADMIN_ENDPOINTS.UPDATE_PRICE, payload, config);
    return res.data;
  }
};

// ==========================================
// 4. USER API HELPER CLIENT
// ==========================================
export const userApi = {
  getAirports: async () => {
    const res = await axios.get(USER_ENDPOINTS.AIRPORTS);
    return res.data;
  },

  getFlightStatus: async (params = {}) => {
    const res = await axios.get(USER_ENDPOINTS.FLIGHT_STATUS, { params });
    return res.data;
  },

  searchItinerary: async (payload) => {
    const res = await axios.post(USER_ENDPOINTS.SEARCH_ITINERARY, payload);
    return res.data;
  },

  createCheckoutSession: async (payload) => {
    const res = await axios.post(USER_ENDPOINTS.CREATE_CHECKOUT_SESSION, payload);
    return res.data;
  },

  confirmCheckout: async (sessionId) => {
    const res = await axios.post(USER_ENDPOINTS.CONFIRM_CHECKOUT, { sessionId });
    return res.data;
  },

  getBookings: async (contactEmail) => {
    const res = await axios.get(USER_ENDPOINTS.BOOKINGS, {
      params: contactEmail ? { contactEmail } : {}
    });
    return res.data;
  },

  getBookingByPnr: async (pnr) => {
    const res = await axios.get(USER_ENDPOINTS.BOOKING_BY_PNR(pnr));
    return res.data;
  },

  webCheckin: async (payload) => {
    const res = await axios.post(USER_ENDPOINTS.WEB_CHECKIN, payload);
    return res.data;
  },

  cancelCheckin: async (payload) => {
    const res = await axios.post(USER_ENDPOINTS.CANCEL_CHECKIN, payload);
    return res.data;
  },

  getCancellationReasons: async () => {
    const res = await axios.get(USER_ENDPOINTS.CANCELLATION_REASONS);
    return res.data;
  },

  cancelBooking: async (payload) => {
    const res = await axios.post(USER_ENDPOINTS.CANCEL_BOOKING, payload);
    return res.data;
  },

  getWalletBalance: async (userToken) => {
    const res = await axios.get(USER_ENDPOINTS.USER_WALLET, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    return res.data;
  }
};

export default {
  API_BASE_URL,
  ADMIN_ENDPOINTS,
  USER_ENDPOINTS,
  adminApi,
  userApi
};
