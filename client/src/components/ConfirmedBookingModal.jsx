import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { closePaymentModals } from '../store/bookingSlice';

/**
 * ConfirmedFlightTicketBookingModal
 * Requirement 1:
 * - Interactive Success animation
 * - Success Title: Booking Confirmed!
 * - Message: Your flight ticket has been successfully booked ! Your booking details has been sent to your registered email and phone number
 * - User should be redirected to the landing page on the countdown of 3 automatically or on clicking Back to Home ->
 */
export default function ConfirmedBookingModal({ isOpen, onClose, pnrOverride, details }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const bookingState = useSelector((state) => state.booking);
  const paymentState = bookingState?.payment || {};
  const bookingResult = bookingState?.bookingResult || {};
  const selectedFlight = bookingState?.selectedFlight || {};
  const contactInfo = bookingState?.contactInfo || {};

  const pnr = pnrOverride || paymentState.pnr || bookingResult.pnr || 'HX-CONFIRMED';
  const flightNumber = selectedFlight?.segments?.[0]?.flightNumber || selectedFlight?.flightNumber || 'Flight';

  const [countdown, setCountdown] = useState(3);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    setCountdown(3);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleRedirectHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  const handleRedirectHome = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    dispatch(closePaymentModals());
    if (onClose) onClose();
    navigate('/');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center transform transition-all scale-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmed-modal-title"
      >
        {/* Ambient Celebration Light Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Decorative Floating Confetti Accent Dots */}
        <div className="absolute top-6 left-8 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse pointer-events-none" />
        <div className="absolute top-10 right-10 w-2 h-2 rounded-full bg-blue-400 animate-ping pointer-events-none" />
        <div className="absolute bottom-12 left-10 w-2 h-2 rounded-full bg-amber-400 animate-bounce pointer-events-none" />
        <div className="absolute bottom-8 right-12 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse pointer-events-none" />

        {/* ==============================================================
           1. INTERACTIVE SUCCESS ANIMATION
           Multi-layered pulsing checkmark with ripple halo
           ============================================================== */}
        <div className="relative mx-auto mb-5 w-24 h-24 flex items-center justify-center">
          {/* Outer Ripple Rings */}
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 animate-ping opacity-75" />
          <div className="absolute inset-2 rounded-full bg-emerald-500/25 dark:bg-emerald-500/35 animate-pulse" />
          
          {/* Core Badge */}
          <div className="relative w-18 h-18 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 border-2 border-white dark:border-slate-800">
            <svg 
              className="w-10 h-10 text-white" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        {/* ==============================================================
           2. SUCCESS TITLE & USER'S EXACT SPECIFIED MESSAGE
           ============================================================== */}
        <h2 
          id="confirmed-modal-title" 
          className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2"
        >
          Booking Confirmed!
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto mb-5">
          Your flight ticket has been successfully booked ! Your booking details has been sent to your registered email and phone number
        </p>

        {/* Booking Reference Snippet */}
        <div className="p-3.5 mb-6 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Booking Reference
            </span>
            <span className="text-base font-black font-mono text-[#005cab] dark:text-blue-400">
              {pnr}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Departure
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {flightNumber}
            </span>
          </div>
        </div>

        {/* ==============================================================
           3. COUNTDOWN & BACK TO HOME BUTTON
           Automatic countdown of 3 or instant redirect on button click
           ============================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400 animate-spin">
              progress_activity
            </span>
            <span>
              Redirecting to landing page in <strong className="text-slate-800 dark:text-slate-200 font-bold">{countdown}s</strong>...
            </span>
          </div>

          <button
            type="button"
            onClick={handleRedirectHome}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#005cab] to-[#0070cc] hover:from-[#004786] hover:to-[#005cab] text-white text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Back to Home</span>
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
