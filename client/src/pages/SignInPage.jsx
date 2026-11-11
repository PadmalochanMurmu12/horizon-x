import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { USER_ENDPOINTS } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Multi-step OTP authentication: 'INPUT' -> 'OTP' -> 'SUCCESS'
  const [step, setStep] = useState('INPUT');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [mockOtp, setMockOtp] = useState('1234');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-redirect destination if provided in query or state
  const returnTo = location.state?.from || '/bookings';

  useEffect(() => {
    document.title = 'Sign In | Horizon-X Flights';
    // If user is already authenticated, redirect straight to bookings
    const existingToken = localStorage.getItem('hx_user_token') || sessionStorage.getItem('hx_user_token');
    if (existingToken) {
      navigate('/bookings', { replace: true });
    }
  }, [navigate]);

  // ==========================================
  // STEP 1: SEND 4-DIGIT OTP
  // ==========================================
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanId = identifier.trim();
    if (!cleanId) {
      setErrorMessage('Please enter your mobile number or email address.');
      return;
    }

    const isEmail = cleanId.includes('@');
    if (!isEmail && cleanId.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number or email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(USER_ENDPOINTS.AUTH_SEND_OTP, {
        identifier: cleanId
      });

      setMockOtp(res.data?.mockOtp || '1234');
      setSuccessMessage(res.data?.message || `4-digit verification code sent to ${cleanId}.`);
      setStep('OTP');
    } catch (err) {
      const serverErr = err.response?.data?.error || err.response?.data?.message;
      setErrorMessage(serverErr || 'Unable to dispatch verification code. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 2: VERIFY 4-DIGIT OTP & ONBOARD/LOGIN
  // ==========================================
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 4) {
      setErrorMessage('Please enter the 4-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(USER_ENDPOINTS.AUTH_OTP_LOGIN, {
        identifier: identifier.trim(),
        otp: cleanOtp
      });

      const token = res.data.token;
      const user = res.data.user;

      if (token) {
        localStorage.setItem('hx_user_token', token);
        sessionStorage.setItem('hx_user_token', token);
      }
      if (user) {
        localStorage.setItem('hx_user_profile', JSON.stringify(user));
        sessionStorage.setItem('hx_user_profile', JSON.stringify(user));
      }

      setStep('SUCCESS');
      setSuccessMessage(res.data.message || 'Onboarding complete! Welcome to Horizon-X.');

      setTimeout(() => {
        navigate(returnTo, { replace: true });
      }, 1200);

    } catch (err) {
      const serverErr = err.response?.data?.error || err.response?.data?.message;
      setErrorMessage(serverErr || 'Invalid verification code. Please enter the 4-digit OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-blue-100 selection:text-blue-900 transition-colors">
      
      {/* Top Compact Brand Header */}
      <header className="relative z-20 w-full h-16 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between">
          <Link 
            to="/" 
            className="text-xl font-bold tracking-tight text-[#005cab] dark:text-blue-400 hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">flight_takeoff</span>
            <span>Horizon<span className="text-[#005cab] dark:text-blue-400">-X</span></span>
          </Link>

          <div className="flex items-center gap-4">
            <ThemeToggle showLabel={false} />
            <Link 
              to="/#support" 
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#005cab] dark:hover:text-blue-400 transition-colors"
            >
              Support
            </Link>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl transition-all">
          
          {/* Card Header Icon & Titles */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-800 text-[#005cab] dark:text-blue-400 mb-3 shadow-xs">
              <span className="material-symbols-outlined text-[24px]">
                {step === 'SUCCESS' ? 'check_circle' : 'travel_explore'}
              </span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {step === 'INPUT' && 'Sign In / Register'}
              {step === 'OTP' && 'Enter Verification Code'}
              {step === 'SUCCESS' && 'Cleared for Takeoff!'}
            </h1>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {step === 'INPUT' && 'Enter your mobile number or email to receive a 4-digit code.'}
              {step === 'OTP' && `We sent a 4-digit code to ${identifier}`}
              {step === 'SUCCESS' && 'Your passenger profile has been authenticated.'}
            </p>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-900/80 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-[18px] shrink-0">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && step !== 'SUCCESS' && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900/80 rounded-xl text-[#005cab] dark:text-blue-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[#005cab] dark:text-blue-400 text-[18px] shrink-0">info</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* STEP 1: MOBILE OR EMAIL INPUT */}
          {step === 'INPUT' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Mobile Number or Email Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="e.g. 9876543210 or traveler@example.com"
                    autoFocus
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 text-sm bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#005cab] dark:focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !identifier.trim()}
                className="w-full py-3 px-4 rounded-xl bg-[#005cab] hover:bg-[#004786] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-bold transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>{loading ? 'Sending Code...' : 'Continue with OTP'}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>

              <div className="pt-2 text-center">
                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
                  By continuing, you agree to Horizon-X Terms of Service and Privacy Policy. Zero passwords required.
                </p>
              </div>
            </form>
          )}

          {/* STEP 2: 4-DIGIT OTP VERIFICATION */}
          {step === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-center text-xs text-[#005cab] dark:text-blue-300">
                ⚡ Sandbox Demo Code: <strong className="font-mono text-sm tracking-wider">{mockOtp}</strong>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2 text-center">
                  Enter 4-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''));
                    setErrorMessage('');
                  }}
                  autoFocus
                  placeholder="• • • •"
                  className="w-48 mx-auto block text-center tracking-[14px] text-2xl font-bold font-mono py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#005cab] dark:focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('INPUT');
                    setOtp('');
                    setErrorMessage('');
                  }}
                  className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                >
                  Change
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 4}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#005cab] hover:bg-[#004786] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs sm:text-sm font-bold transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-xs text-[#005cab] dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  Didn't receive code? Resend OTP
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS CELEBRATION */}
          {step === 'SUCCESS' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Authentication successful! Redirecting you to your bookings...
              </p>
            </div>
          )}

        </div>
      </main>

      {/* Modern Compact Footer */}
      <footer className="relative z-20 w-full py-4 text-center border-t border-slate-200 dark:border-slate-800 text-[12px] text-slate-500 dark:text-slate-400">
        <p>© 2026 Horizon-X Aviation Systems. All rights reserved.</p>
      </footer>

    </div>
  );
}
