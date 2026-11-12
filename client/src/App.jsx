import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import FlightItineraryPage from './pages/FlightItineraryPage';
import CheckoutPage from './pages/CheckoutPage';
import BookingSuccessPage from './pages/BookingSuccessPage';
import SignUpPage from './pages/SignUpPage';
import SignInPage from './pages/SignInPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import MyBookingsPage from './pages/MyBookingsPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import { USER_ENDPOINTS } from './services/api';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('hx_admin_token'));

  const updateToken = (newToken) => {
    if (newToken) {
      sessionStorage.setItem('hx_admin_token', newToken);
    } else {
      sessionStorage.removeItem('hx_admin_token');
    }
    setToken(newToken);
  };

  const handleFlightSearch = async (searchPayload) => {
    try {
      console.log('Dispatching Search Payload:', searchPayload);
      const res = await fetch(USER_ENDPOINTS.SEARCH_ITINERARY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchPayload)
      });
      const data = await res.json();
      console.log('Search Results from Backend:', data);
    } catch (err) {
      console.error('Search request failed:', err);
    }
  };

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Flight Search Engine & Itinerary */}
          <Route path="/" element={<LandingPage onSearch={handleFlightSearch} />} />
          <Route path="/flights" element={<FlightItineraryPage />} />
          <Route path="/itinerary" element={<FlightItineraryPage />} />
          <Route path="/search" element={<FlightItineraryPage />} />

          {/* Passenger Details, Booking & Checkout Session */}
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/booking/checkout" element={<CheckoutPage />} />
          <Route path="/booking/cancelled" element={<Navigate to="/checkout?cancelled=true" replace />} />
          <Route path="/booking/success" element={<BookingSuccessPage />} />
          <Route path="/booking/confirmation" element={<BookingSuccessPage />} />

          {/* User Fast Passwordless Onboarding & Sign In (Cleartrip model) */}
          <Route path="/signup" element={<Navigate to="/signin" replace />} />
          <Route path="/register" element={<Navigate to="/signin" replace />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/login" element={<SignInPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage isAdmin={false} />} />
          
          {/* My Bookings & Web Check-in */}
          <Route path="/bookings" element={<MyBookingsPage />} />
          <Route path="/checkin" element={<MyBookingsPage defaultTab="checkin" />} />
          
          {/* Admin Authentication & Control Panel */}
          <Route 
            path="/admin/login" 
            element={<AdminLogin token={token} setToken={updateToken} />} 
          />
          <Route 
            path="/admin/forgot-password" 
            element={<ForgotPasswordPage isAdmin={true} />} 
          />
          
          <Route 
            path="/admin/dashboard" 
            element={
              token ? (
                <AdminDashboard token={token} setToken={updateToken} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            } 
          />

          {/* Fallback Catch-All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;