import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { adminApi, userApi } from '../services/api';

export default function ForgotPasswordPage({ isAdmin: propIsAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Detect admin mode from prop or current pathname
  const isAdmin = propIsAdmin ?? location.pathname.startsWith('/admin');

  // Navigation targets
  const signInPath = isAdmin ? '/admin/login' : '/signin';

  // Form state
  const [isFlipped, setIsFlipped] = useState(false);
  const [identifier, setIdentifier] = useState(isAdmin ? 'admin@horizonx.com' : '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle Step 1: Send Reset Code
  const handleSendResetCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!identifier.trim()) {
      setErrorMessage(isAdmin ? 'Please enter your registered admin email.' : 'Please enter your registered email or phone number.');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (isAdmin) {
        res = await adminApi.forgotPassword(identifier.trim());
      } else {
        res = await userApi.forgotPassword(identifier.trim());
      }

      setSuccessMessage(res.message || 'Reset code dispatched successfully!');
      setTimeout(() => {
        setIsFlipped(true);
        setSuccessMessage('');
        setErrorMessage('');
      }, 600);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Unable to process password reset request. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Reset Password with 4-Digit OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!otp || otp.trim().length !== 4) {
      setErrorMessage('Please enter the 4-digit verification code.');
      return;
    }

    if (newPassword.length < 8 || !/\d/.test(newPassword)) {
      setErrorMessage('Password must be at least 8 characters long and contain at least one number.');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (isAdmin) {
        res = await adminApi.resetPassword(identifier.trim(), otp.trim(), newPassword);
      } else {
        res = await userApi.resetPassword(identifier.trim(), otp.trim(), newPassword);
      }

      setSuccessMessage(res.message || 'Password updated successfully! Clearing for departure...');
      setTimeout(() => {
        navigate(signInPath);
      }, 1500);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Invalid 4-digit OTP or error updating password.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (!identifier.trim()) return;
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    try {
      if (isAdmin) {
        await adminApi.forgotPassword(identifier.trim());
      } else {
        await userApi.forgotPassword(identifier.trim());
      }
      setSuccessMessage('A new 4-digit verification code has been dispatched.');
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen max-h-screen overflow-hidden flex flex-col justify-between bg-slate-50 dark:bg-slate-950 font-sans antialiased select-none">
      
      {/* ==============================================================
         BACKGROUND LAYER (Smooth Flight Takeoff Backdrop)
         ============================================================== */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-100"
        style={{ backgroundImage: `url('/takeoff.jpg')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/60 to-slate-950/85 backdrop-blur-[2px]" />
      </div>

      {/* ==============================================================
         TOP NAVIGATION BAR
         ============================================================== */}
      <header className="relative z-30 w-full px-6 sm:px-12 py-3 flex items-center justify-between">
        <Link 
          to={isAdmin ? "/admin/login" : "/"} 
          className="flex items-center gap-1.5 focus:outline-none group"
        >
          <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white group-hover:text-blue-300 transition">
            Horizon<span className="text-blue-400">-X</span>
          </span>
          {isAdmin && (
            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Admin
            </span>
          )}
        </Link>

        <div className="flex items-center gap-4">
          <ThemeToggle showLabel={false} />
          <Link
            to={signInPath}
            className="text-xs sm:text-sm font-medium text-slate-200 hover:text-white flex items-center gap-1.5 bg-white/10 hover:bg-white/20 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 border border-white/15 px-3 py-1.5 rounded-lg backdrop-blur-md transition shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_back</span>
            <span>Back to Sign In</span>
          </Link>
        </div>
      </header>

      {/* ==============================================================
         MAIN WORKSPACE: 3D FLIP CARD
         ============================================================== */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 py-2">
        <div className="w-full max-w-[440px] perspective-[1200px]">
          
          {/* Card Container with 3D Flip */}
          <div 
            className={`relative w-full transition-transform duration-700 ease-out transform-style-preserve-3d ${
              isFlipped ? '[transform:rotateY(180deg)]' : ''
            }`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            
            {/* ──────────────────────────────────────────────────────────
               FACE 1: FORGOT PASSWORD (FRONT)
               ────────────────────────────────────────────────────────── */}
            <div 
              className={`w-full bg-white dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col backdrop-blur-xl ${
                isFlipped ? 'pointer-events-none' : ''
              }`}
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
              
              {/* Header Icon & Title */}
              <div className="text-center mb-5">
                <div className="w-13 h-13 sm:w-14 sm:h-14 bg-blue-50 dark:bg-blue-950/60 text-[#005cab] dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner border border-blue-100 dark:border-blue-900/50">
                  <span className="material-symbols-outlined text-[28px] sm:text-[32px]">lock_reset</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                  Forgot Password
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {isAdmin 
                    ? 'Ground Control access recovery. Enter your registered administrative email.'
                    : 'No worries, it happens. Enter your details to get a reset code.'
                  }
                </p>
              </div>

              {/* Alert Feedback */}
              {errorMessage && !isFlipped && (
                <div className="mb-3.5 p-2.5 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-900/80 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <span className="material-symbols-outlined text-red-500 text-[16px] shrink-0">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && !isFlipped && (
                <div className="mb-3.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-900/80 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[16px] shrink-0">check_circle</span>
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Step 1 Form */}
              <form onSubmit={handleSendResetCode} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label 
                    className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider" 
                    htmlFor="recovery_identifier"
                  >
                    {isAdmin ? 'Registered Admin Email' : 'Email or Phone Number'}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-[18px] pointer-events-none">
                      mail
                    </span>
                    <input 
                      id="recovery_identifier"
                      name="recovery_identifier"
                      type={isAdmin ? "email" : "text"}
                      required
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder={isAdmin ? "admin@horizonx.com" : "e.g. travel@horizonx.com"}
                      className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-[#005cab] dark:focus:border-blue-500 focus:ring-2 focus:ring-[#005cab]/15 transition font-normal"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-11 bg-[#005cab] hover:bg-[#004b8c] active:bg-[#003d73] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send Reset Code</span>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Return Link */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Remembered your password?{' '}
                  <Link 
                    to={signInPath} 
                    className="text-[#005cab] dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </div>

            {/* ──────────────────────────────────────────────────────────
               FACE 2: RESET PASSWORD (BACK)
               ────────────────────────────────────────────────────────── */}
            <div 
              className={`absolute inset-0 w-full bg-white dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col backdrop-blur-xl [transform:rotateY(180deg)] ${
                !isFlipped ? 'pointer-events-none' : ''
              }`}
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
              
              {/* Header Icon & Title */}
              <div className="text-center mb-4">
                <div className="w-13 h-13 sm:w-14 sm:h-14 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2.5 shadow-inner border border-emerald-100 dark:border-emerald-900/50">
                  <span className="material-symbols-outlined text-[28px] sm:text-[32px]">verified_user</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                  Reset Password
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {isAdmin 
                    ? 'Enter the 4-digit Ground Control OTP and your new password.'
                    : 'Enter the 4-digit OTP sent to your registered account.'
                  }
                </p>
              </div>

              {/* Alert Feedback */}
              {errorMessage && isFlipped && (
                <div className="mb-3 p-2 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-900/80 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <span className="material-symbols-outlined text-red-500 text-[16px] shrink-0">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && isFlipped && (
                <div className="mb-3 p-2 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-900/80 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[16px] shrink-0">check_circle</span>
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Step 2 Form */}
              <form onSubmit={handleResetPassword} className="space-y-3">
                
                {/* 4-Digit OTP Input */}
                <div className="space-y-1 text-left">
                  <label 
                    className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider" 
                    htmlFor="otp_input"
                  >
                    4-Digit Verification Code (OTP)
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-[18px] pointer-events-none">
                      pin
                    </span>
                    <input 
                      id="otp_input"
                      name="otp_input"
                      type="text"
                      maxLength={4}
                      required
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                        setOtp(val);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="• • • •"
                      className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-base text-center font-mono font-bold tracking-[0.5em] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-[#005cab] dark:focus:border-blue-500 focus:ring-2 focus:ring-[#005cab]/15 transition"
                    />
                  </div>
                </div>

                {/* New Password Input */}
                <div className="space-y-1 text-left">
                  <label 
                    className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider" 
                    htmlFor="new_password"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-[18px] pointer-events-none">
                      lock
                    </span>
                    <input 
                      id="new_password"
                      name="new_password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="••••••••"
                      className="w-full h-11 pl-10 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-[#005cab] dark:focus:border-blue-500 focus:ring-2 focus:ring-[#005cab]/15 transition"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Minimum 8 characters with at least one number.
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-11 bg-[#005cab] hover:bg-[#004b8c] active:bg-[#003d73] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Actions */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-center flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsFlipped(false);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-slate-500 hover:text-[#005cab] dark:text-slate-400 dark:hover:text-blue-400 transition flex items-center justify-center gap-1 cursor-pointer mx-auto"
                >
                  <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                  <span>Back to Forgot Password</span>
                </button>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Didn't receive a code?{' '}
                  <button 
                    type="button"
                    onClick={handleResendOtp}
                    className="text-[#005cab] dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                  >
                    Resend OTP
                  </button>
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ==============================================================
         FOOTER
         ============================================================== */}
      <footer className="relative z-20 w-full shrink-0 px-6 sm:px-12 py-2.5 bg-white/95 dark:bg-slate-950/85 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#005cab] dark:text-blue-400">
              Horizon<span className="text-blue-500">-X</span>
            </span>
            <span>© 2026 Horizon-X Travel. All rights reserved.</span>
          </div>
          <div className="flex gap-4 sm:gap-6">
            <a href="#" className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[#005cab] dark:hover:text-blue-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
