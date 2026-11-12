import React from 'react';
import { useDispatch } from 'react-redux';
import { closePaymentModals, setReviewModalOpen } from '../store/bookingSlice';

/**
 * DeclinedPaymentModal
 * Requirement 2:
 * - Interactive Failure animation
 * - Decline Payment Title: Payment Declined!
 * - Message: Your payment didn't go through. Don't worry! Review your booking details and complete the payment to confirm your reservation.
 * - Buttons: Review Booking, Try again with a cross icon to close the modal
 * - Clicking on Try again opens Stripe once again
 */
export default function DeclinedPaymentModal({ 
  isOpen, 
  onClose, 
  onReviewBooking, 
  onTryAgain, 
  isRetrying,
  message 
}) {
  const dispatch = useDispatch();

  if (!isOpen) return null;

  const handleClose = () => {
    dispatch(closePaymentModals());
    if (onClose) onClose();
  };

  const handleReview = () => {
    dispatch(closePaymentModals());
    if (onReviewBooking) {
      onReviewBooking();
    } else {
      dispatch(setReviewModalOpen(true));
    }
  };

  const handleRetry = () => {
    dispatch(closePaymentModals());
    if (onTryAgain) {
      onTryAgain();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-red-300 dark:border-red-900/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center transform transition-all scale-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="declined-modal-title"
      >
        {/* Top-Right Cross Icon (X) to Close the Modal */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close declined payment modal"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>

        {/* Ambient Red Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-44 h-44 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* ==============================================================
           1. INTERACTIVE FAILURE ANIMATION
           Vibrating/pulsing red circular shield with animated cross
           ============================================================== */}
        <div className="relative mx-auto mb-5 w-24 h-24 flex items-center justify-center">
          {/* Outer Pulsing Wave Rings */}
          <div className="absolute inset-0 rounded-full bg-red-500/20 dark:bg-red-500/30 animate-ping opacity-60" />
          <div className="absolute inset-2 rounded-full bg-red-500/25 dark:bg-red-500/35 animate-pulse" />

          {/* Core Danger Badge */}
          <div className="relative w-18 h-18 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 border-2 border-white dark:border-slate-800 animate-bounce duration-1000">
            <svg 
              className="w-10 h-10 text-white" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        </div>

        {/* ==============================================================
           2. DECLINE TITLE & EXACT SPECIFIED MESSAGE
           ============================================================== */}
        <h2 
          id="declined-modal-title" 
          className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2"
        >
          Payment Declined!
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto mb-6">
          {message || "Unfortunately, your payment could not be processed. Please check your payment details or try another payment method to complete your booking."}
        </p>

        {/* Helper Security & Seat Hold Badge */}
        <div className="p-3 mb-6 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/80 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[16px]">lock_clock</span>
          <span>Your flight seats & itinerary details remain temporarily held.</span>
        </div>

        {/* ==============================================================
           3. BUTTONS: REVIEW BOOKING & TRY AGAIN
           ============================================================== */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleReview}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            <span>Review Booking</span>
          </button>

          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#005cab] hover:bg-[#004786] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <span className="material-symbols-outlined text-[16px] animate-spin-reverse">refresh</span>
            <span>{isRetrying ? 'Opening Stripe...' : 'Try again'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
