import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { USER_ENDPOINTS } from '../services/api';
import { 
  downloadTicketPdf, 
  downloadBoardingPassPdf, 
  savePdfBlobToDevice,
  generateSvgBarcode, 
  generate2DMatrixBarcodeSvg, 
  getAirlineLogo, 
  getSsrMealCode, 
  AIRPORT_DIRECTORY,
  calculateFlightTimes,
  formatCleanMealName,
  cleanTimeDisplay,
  cleanIssueDate
} from '../utils/pdfGenerator';

export default function MyBookingsPage({ defaultTab = 'ALL' }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [selectedBooking, setSelectedBooking] = useState(null); // for Details modal
  const [previewDoc, setPreviewDoc] = useState(null); // { type: 'TICKET'|'BOARDING_PASS', pnr, data, htmlUrl }
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isCheckinOpen, setIsCheckinOpen] = useState(defaultTab === 'checkin');
  
  // Checkin form state
  const [checkinForm, setCheckinForm] = useState({ pnr: '', lastName: '', email: '', mobileLast4: '' });
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState('');
  const [checkinSuccess, setCheckinSuccess] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch(USER_ENDPOINTS.BOOKINGS);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Exclude pending payment bookings (Requirement 1)
        const confirmedBookings = json.data.filter(
          b => b.status !== 'PENDING_PAYMENT' && b.paymentStatus !== 'UNPAID'
        );
        setBookings(confirmedBookings);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicket = async (pnr) => {
    try {
      const jsonRes = await fetch(USER_ENDPOINTS.TICKET(pnr, 'json'));
      const jsonData = await jsonRes.json();

      setPreviewDoc({
        type: 'TICKET',
        pnr,
        title: `E-Ticket Receipt (PNR: ${pnr})`,
        data: jsonData.data,
        htmlUrl: USER_ENDPOINTS.TICKET(pnr, 'html')
      });
    } catch (err) {
      alert('Unable to retrieve E-Ticket: ' + err.message);
    }
  };

  const handleOpenBoardingPass = async (pnr) => {
    try {
      const jsonRes = await fetch(USER_ENDPOINTS.BOARDING_PASS(pnr, 'json'));
      const jsonData = await jsonRes.json();
      if (!jsonRes.ok) {
        alert(jsonData.error || 'Boarding pass is not available for this flight.');
        return;
      }

      setPreviewDoc({
        type: 'BOARDING_PASS',
        pnr,
        title: `Official Boarding Pass (PNR: ${pnr})`,
        data: jsonData.data,
        htmlUrl: USER_ENDPOINTS.BOARDING_PASS(pnr, 'html')
      });
    } catch (err) {
      alert('Unable to retrieve Boarding Pass: ' + err.message);
    }
  };

  // Download PDF Document with Path Selection (Requirement 7)
  const handleDownloadPdf = async () => {
    if (!previewDoc || !previewDoc.data) return;
    setIsDownloadingPdf(true);
    try {
      const pnr = previewDoc.pnr || previewDoc.data.pnr;
      const filename = previewDoc.type === 'TICKET' ? `ETicket-${pnr}.pdf` : `BoardingPass-${pnr}.pdf`;
      const endpoint = previewDoc.type === 'TICKET' 
        ? USER_ENDPOINTS.TICKET(pnr, 'pdf', true)
        : USER_ENDPOINTS.BOARDING_PASS(pnr, 'pdf', true);

      let downloadedViaServer = false;
      try {
        const res = await fetch(endpoint);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/pdf')) {
          const blob = await res.blob();
          if (blob && blob.size > 0) {
            await savePdfBlobToDevice(blob, filename);
            downloadedViaServer = true;
          }
        }
      } catch (serverErr) {
        console.warn('Server-side PDF endpoint unavailable, falling back to client engine:', serverErr);
      }

      // Fallback to client generator if server endpoint didn't deliver
      if (!downloadedViaServer) {
        if (previewDoc.type === 'TICKET') {
          await downloadTicketPdf(previewDoc.data);
        } else {
          await downloadBoardingPassPdf(previewDoc.data);
        }
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not download PDF: ' + err.message);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCheckinSubmit = async (e) => {
    e.preventDefault();
    setCheckinLoading(true);
    setCheckinError('');
    setCheckinSuccess(null);

    try {
      const res = await fetch(USER_ENDPOINTS.WEB_CHECKIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkinForm)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setCheckinError(data.error || 'Web check-in failed. Please verify your PNR and Last Name.');
      } else {
        setCheckinSuccess(data.data);
        fetchBookings(); // Refresh bookings state
      }
    } catch (err) {
      setCheckinError('Connection error while contacting check-in desk: ' + err.message);
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleCancelCheckin = async (pnr, lastName) => {
    if (!window.confirm(`Are you sure you want to cancel web check-in for PNR ${pnr}? Your boarding pass will be revoked and you will be offloaded from the active manifest.`)) {
      return;
    }

    try {
      const res = await fetch(USER_ENDPOINTS.CANCEL_CHECKIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pnr, lastName: lastName || 'TRAVELER' })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to cancel check-in.');
      } else {
        alert(data.message || 'Web check-in successfully cancelled. Boarding pass revoked.');
        setSelectedBooking(null);
        fetchBookings();
      }
    } catch (err) {
      alert('Error contacting check-in control: ' + err.message);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'CURRENT' && b.classification !== 'CURRENT') return false;
    if (activeTab === 'FUTURE' && b.classification !== 'FUTURE') return false;
    if (activeTab === 'COMPLETED' && b.status !== 'COMPLETED' && b.classification !== 'COMPLETED' && b.classification !== 'PAST') return false;
    if (activeTab === 'CANCELLED' && b.classification !== 'CANCELLED') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const pnrMatch = b.pnr?.toLowerCase().includes(q);
    const originMatch = b.journey?.origin?.toLowerCase().includes(q);
    const destMatch = b.journey?.destination?.toLowerCase().includes(q);
    const paxMatch = b.passengers?.some(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
    );
    return pnrMatch || originMatch || destMatch || paxMatch;
  });

  return (
    <div className="bg-[#fbf9f8] text-[#1b1c1c] font-sans min-h-screen">
      
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 w-full z-40 bg-[#fbf9f8]/95 backdrop-blur-md border-b border-[#E6E6E6] h-16">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-2xl font-bold text-[#005cab] tracking-tight">
              Horizon-X
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-[15px]">
              <Link to="/" className="text-[#566476] hover:text-[#005cab] transition-colors">Flights</Link>
              <span className="text-[#005cab] font-bold border-b-2 border-[#005cab] pb-1">My Bookings</span>
              <button 
                onClick={() => { setIsCheckinOpen(true); setCheckinSuccess(null); setCheckinError(''); }}
                className="text-[#566476] hover:text-[#005cab] transition-colors cursor-pointer"
              >
                Web Check-in
              </button>
            </nav>
          </div>
          <button 
            onClick={() => { setIsCheckinOpen(true); setCheckinSuccess(null); setCheckinError(''); }}
            className="bg-[#005cab] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#004b8c] transition-all shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">airplane_ticket</span>
            Web Check-in
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-6 md:px-10 pt-28 pb-16">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight">My Flight Journeys</h1>
            <p className="text-sm text-[#566476] mt-1">Manage all your past, present, and upcoming flights in one place.</p>
          </div>
          
          {/* Quick Search */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search by PNR, passenger, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d1d5db] bg-white text-sm focus:outline-none focus:border-[#005cab] shadow-xs"
            />
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#9ca3af] text-[20px]">search</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E6E6E6] mb-8 overflow-x-auto pb-2">
          {[
            { id: 'ALL', label: 'All Journeys', count: bookings.length },
            { id: 'FUTURE', label: 'Upcoming', count: bookings.filter(b => b.classification === 'FUTURE' || b.classification === 'UPCOMING').length },
            { id: 'CURRENT', label: 'Today (Current)', count: bookings.filter(b => b.classification === 'CURRENT').length },
            { id: 'COMPLETED', label: 'Completed', count: bookings.filter(b => b.status === 'COMPLETED' || b.classification === 'COMPLETED' || b.classification === 'PAST').length },
            { id: 'CANCELLED', label: 'Cancelled', count: bookings.filter(b => b.classification === 'CANCELLED').length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-[#005cab] text-white shadow-sm' 
                  : 'text-[#4b5563] hover:bg-[#f3f4f6]'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Bookings Card List */}
        {loading ? (
          <div className="text-center py-24 text-[#566476]">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-[#005cab] border-t-transparent rounded-full mb-3"></div>
            <div>Retrieving flight manifests from ground control...</div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E6E6E6] p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-[#9ca3af] mb-3">flight_takeoff</span>
            <h3 className="text-lg font-bold text-[#1b1c1c] mb-1">No flight bookings found</h3>
            <p className="text-sm text-[#566476] mb-6">You don't have any reservations matching this filter.</p>
            <Link to="/" className="inline-block bg-[#005cab] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#004b8c] transition-colors">
              Search & Book Flights
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBookings.map(card => {
              const depDate = card.journey.departureTime ? new Date(card.journey.departureTime) : null;
              const dateStr = depDate ? depDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
              const timeStr = depDate ? depDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

              const getBadgeColor = (classification) => {
                switch(classification) {
                  case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
                  case 'CURRENT': return 'bg-amber-100 text-amber-800 border-amber-300';
                  case 'FUTURE': return 'bg-blue-100 text-blue-800 border-blue-300';
                  case 'PAST': return 'bg-gray-100 text-gray-700 border-gray-300';
                  case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-300';
                  default: return 'bg-gray-100 text-gray-700';
                }
              };

              return (
                <div 
                  key={card.id || card.pnr} 
                  className="bg-white rounded-2xl border border-[#E6E6E6] shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${getBadgeColor(card.classification)}`}>
                        {card.classification === 'FUTURE' ? 'UPCOMING' : card.classification}
                      </span>
                      <span className="text-xs font-mono font-bold bg-[#eef5fc] text-[#005cab] px-2.5 py-1 rounded-md">
                        PNR: {card.pnr}
                      </span>
                    </div>

                    {/* Flight Sector */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-2xl font-black text-[#111827]">{card.journey.origin}</div>
                        <div className="text-xs text-[#566476]">{timeStr}</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-[#566476]">{card.journey.flightNumber}</span>
                        <span className="text-[#005cab] font-bold text-lg">✈ ➔</span>
                        <span className="text-[10px] text-[#9ca3af]">{card.journey.durationMinutes ? `${card.journey.durationMinutes}m` : ''}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-[#111827]">{card.journey.destination}</div>
                        <div className="text-xs text-[#566476]">{card.journey.airline}</div>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-2 text-xs text-[#4b5563] mb-4">
                      <div>Date: <strong>{dateStr}</strong></div>
                      <div className="text-right">Class: <strong>{card.cabinClass}</strong></div>
                      <div>Passengers: <strong>{card.passengerCount} Pax</strong></div>
                      <div className="text-right font-bold text-[#111827]">₹{card.totalAmount.toLocaleString('en-IN')}</div>
                    </div>

                    {/* Check-in status badge if checked in */}
                    {card.isCheckedIn && (
                      <div className="bg-emerald-50 text-emerald-800 text-xs px-2.5 py-1 rounded mb-4 flex items-center gap-1 font-semibold">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Web Check-in Completed
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => setSelectedBooking(card)}
                      className="flex-1 bg-[#005cab] hover:bg-[#004b8c] text-white py-2 px-3 rounded-xl font-bold text-sm transition-colors text-center cursor-pointer"
                    >
                      View Details
                    </button>
                    {card.isCheckedIn && (
                      <button
                        onClick={() => handleOpenBoardingPass(card.pnr)}
                        title="Quick View Boarding Pass"
                        className="bg-[#eef5fc] hover:bg-[#d9ecfa] text-[#005cab] p-2 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">airplane_ticket</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* 1. BOOKING DETAILS MODAL */}
      {/* ============================================================== */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 border border-gray-200 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
              <div>
                <h2 className="text-xl font-black text-[#111827]">Flight Reservation Details</h2>
                <p className="text-xs text-[#566476] mt-0.5">Booking Reference: <strong className="text-[#005cab] font-mono text-sm">{selectedBooking.pnr}</strong></p>
              </div>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Journey Status Banner */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 mb-6">
              <div>
                <div className="text-xs text-[#6b7280] uppercase font-semibold">Journey Classification</div>
                <div className="font-extrabold text-[#111827]">{selectedBooking.classification === 'FUTURE' ? 'UPCOMING' : selectedBooking.classification}</div>
              </div>
              <div>
                <div className="text-xs text-[#6b7280] uppercase font-semibold">Status</div>
                <div className="font-extrabold text-emerald-600">{selectedBooking.status} ({selectedBooking.paymentStatus})</div>
              </div>
              <div>
                <div className="text-xs text-[#6b7280] uppercase font-semibold">Total Fare</div>
                <div className="font-extrabold text-[#111827]">₹{selectedBooking.totalAmount.toLocaleString('en-IN')} {selectedBooking.currency}</div>
              </div>
            </div>

            {/* Passenger Details */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Passenger Details</h4>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {selectedBooking.passengers?.map((p, idx) => (
                  <div key={idx} className="p-3 bg-white flex items-center justify-between text-sm">
                    <div>
                      <div className="font-bold text-gray-900">{p.firstName} {p.lastName}</div>
                      <div className="text-xs text-gray-500">Ticket: <code className="text-[#005cab]">{p.ticketNumber || '098-XXXXX'}</code></div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold">Seat: <span className="text-[#005cab] font-bold">{p.seatNumber || 'Pending'}</span></div>
                      <div className="text-xs text-gray-500">Meal: {p.foodOption || 'VEG'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTION BUTTONS: View E-Ticket & View Boarding Pass */}
            <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row gap-3">
              {/* E-Ticket: Allowed for Past, Current, and Future */}
              <button
                onClick={() => handleOpenTicket(selectedBooking.pnr)}
                className="flex-1 bg-white border-2 border-[#005cab] text-[#005cab] hover:bg-[#eef5fc] font-bold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                View E-Ticket Receipt
              </button>

              {/* Boarding Pass: ONLY available when web check-in is completed (Requirement 5) */}
              {selectedBooking.isCheckedIn ? (
                <button
                  type="button"
                  onClick={() => handleOpenBoardingPass(selectedBooking.pnr)}
                  className="flex-1 bg-[#005cab] hover:bg-[#004b8c] text-white font-bold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">airplane_ticket</span>
                  View Boarding Pass
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const paxLastName = selectedBooking.passengers?.[0]?.lastName || '';
                    setSelectedBooking(null);
                    setCheckinForm({
                      pnr: selectedBooking.pnr,
                      lastName: paxLastName,
                      email: selectedBooking.contactInfo?.email || '',
                      mobileLast4: ''
                    });
                    setIsCheckinOpen(true);
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  Complete Web Check-in for Boarding Pass
                </button>
              )}
            </div>

            {/* Check-in prompt if not yet checked in */}
            {!selectedBooking.isCheckedIn && selectedBooking.permissions.canViewBoardingPass && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                <span>Fasten your clearance: Web check-in is open for this reservation.</span>
                <button 
                  onClick={() => {
                    setSelectedBooking(null);
                    setCheckinForm({ pnr: selectedBooking.pnr, lastName: selectedBooking.passengers?.[0]?.lastName || '', email: selectedBooking.contactInfo.email, mobileLast4: '' });
                    setIsCheckinOpen(true);
                  }}
                  className="underline font-bold hover:text-amber-950"
                >
                  Check-in Now
                </button>
              </div>
            )}

            {/* Cancel Check-in prompt if currently checked in */}
            {selectedBooking.isCheckedIn && selectedBooking.status === 'CONFIRMED' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <span>You have completed web check-in. Need to change seats or cancel your flight?</span>
                <button 
                  onClick={() => handleCancelCheckin(selectedBooking.pnr, selectedBooking.passengers?.[0]?.lastName)}
                  className="underline font-bold text-red-600 hover:text-red-800 cursor-pointer ml-2"
                >
                  Cancel Check-in
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. DOCUMENT PREVIEW & DOWNLOAD MODAL */}
      {/* ============================================================== */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 md:p-8 border border-gray-200 shadow-2xl my-8">
            
            {/* Modal Header with Close Cross Icon (Requirements 6 & 7) */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
              <div>
                <h2 className="text-xl font-black text-[#111827]">{previewDoc.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded">
                    PNR: {previewDoc.pnr}
                  </span>
                  <span className="text-xs text-gray-500">IATA Verified Aviation Document</span>
                </div>
              </div>

              {/* Close Cross Icon Button (X) */}
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                aria-label="Close document modal"
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body Preview Content */}
            <div className="mb-6 max-h-[70vh] overflow-y-auto pr-1">
              {previewDoc.type === 'TICKET' ? (
                (() => {
                  const data = previewDoc.data || {};
                  const pnr = data.pnr || previewDoc.pnr || 'SK79WQ';
                  const primaryPax = data.passengers?.[0] || {};
                  const primarySector = data.sectors?.[0] || {};
                  const ticketNo = primaryPax.ticketNumber || data.eTicketNumber || '402-9823410921-01';
                  const agencyBookingId = data.agencyBookingId || `SKY-2026-${pnr}920`;
                  const rawIssueDate = data.issueDate || data.bookingDate || '12 Oct 2026';
                  const issueDateOnly = cleanIssueDate(rawIssueDate);

                  const legalName = primaryPax.legalName || primaryPax.name || `${primaryPax.lastName?.toUpperCase() || 'RIVERA'} / ${primaryPax.firstName?.toUpperCase() || 'ALEX'} ${primaryPax.gender === 'FEMALE' ? 'MS' : 'MR'}`;
                  const paxType = primaryPax.passengerType || (primaryPax.age && primaryPax.age < 12 ? 'CHD (Child)' : 'ADT (Adult / 18+)');
                  const contactEmail = data.contactInfo?.email || 'alex.rivera@example.com';
                  const contactPhone = data.contactInfo?.phone || '+91 9876543210';

                  const flightNo = primarySector.flightNumber || 'SK-402';
                  const carrier = primarySector.airline || 'Skybound Wings';
                  const carrierCode = (primarySector.airlineCode || flightNo.split('-')[0] || 'SK').toUpperCase();
                  const aircraft = primarySector.aircraft || 'Airbus A321neo';
                  const cabin = data.cabinClass || 'ECONOMY';
                  const fareBasis = data.fareBasis || 'YFLX26 / Standard Saver';

                  const originCode = (primarySector.origin || 'DEL').toUpperCase();
                  const destCode = (primarySector.destination || 'BLR').toUpperCase();
                  const originInfo = AIRPORT_DIRECTORY[originCode] || { city: primarySector.originCity || 'Delhi', name: 'Indira Gandhi Intl', terminal: 'Terminal 3', shortTerm: 'T3' };
                  const destInfo = AIRPORT_DIRECTORY[destCode] || { city: primarySector.destinationCity || 'Bengaluru', name: 'Kempegowda Intl', terminal: 'Terminal 2', shortTerm: 'T2' };
                  const depTime = cleanTimeDisplay(primarySector.departureTime || '06:15 IST');
                  const arrTime = cleanTimeDisplay(primarySector.arrivalTime || '09:00 IST');
                  const dur = primarySector.durationMinutes ? `${Math.floor(primarySector.durationMinutes / 60)}h ${primarySector.durationMinutes % 60}m` : '2h 45m';

                  const checkedBaggage = data.baggage?.checked || '1 Piece (15 kg)';
                  const carryOnBaggage = data.baggage?.carryOn || '7 kg + Personal Item';
                  const seatNumber = primaryPax.seatNumber || '14A (Window)';
                  const foodOption = primaryPax.foodOption || primaryPax.mealPreference || 'Gluten-Free Meal';
                  const fullMealName = formatCleanMealName(foodOption);
                  const ssrCode = getSsrMealCode(foodOption);

                  const totalAmount = Number(data.totalAmount || 8678);
                  const currency = data.currency || (totalAmount < 1000 ? 'USD' : 'INR');
                  const currSymbol = currency === 'USD' ? '$' : '₹';
                  const platformFee = Number(data.fareBreakdown?.platformFee || (totalAmount < 1000 ? 8.50 : 250));
                  const baseFare = Number(data.fareBreakdown?.baseFare || (totalAmount - platformFee));

                  const airlineLogo = getAirlineLogo(carrierCode, carrier);

                  return (
                    <div className="bg-white border border-[#E6E6E6] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs text-[#1b1c1c]">
                      {/* Header Branding (Responsive, No IATA Accredited Agent) */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b-2 border-[#005cab] gap-4">
                        <div className="flex items-center gap-3">
                          {airlineLogo ? (
                            <img src={airlineLogo} alt={carrier} className="h-10 w-auto max-w-[120px] object-contain rounded" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#005cab] flex items-center justify-center text-white shadow-sm font-bold">
                              <span className="material-symbols-outlined text-[24px]">flight_takeoff</span>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-black text-[#005cab] tracking-tight">Horizon-X</span>
                              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#F2F8FF] text-[#005cab] border border-[#d3e1f6]">{carrier} ({carrierCode})</span>
                            </div>
                            <p className="text-xs text-[#566476] font-medium mt-0.5">Official Electronic Ticket Receipt &amp; Tax Invoice</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                            <span className="material-symbols-outlined text-[16px]">verified</span>
                            CONFIRMED (PAID)
                          </span>
                        </div>
                      </div>

                      {/* 1. Booking & Identification Numbers Grid (No Coupon Active, Clean Issue Date) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#F2F8FF]/70 rounded-xl border border-[#d3e1f6]/60">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-[#566476]">Booking Ref (PNR)</p>
                          <p className="font-mono text-xl sm:text-2xl font-black text-[#005cab] tracking-wide">{pnr}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-[#566476]">E-Ticket Number</p>
                          <p className="font-mono text-xs sm:text-sm font-bold text-[#1b1c1c] mt-0.5">{ticketNo}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-[#566476]">Agency Booking ID</p>
                          <p className="font-mono text-xs sm:text-sm font-semibold text-[#1b1c1c] mt-0.5">{agencyBookingId}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-[#566476]">Issue Date</p>
                          <p className="text-xs font-semibold text-[#1b1c1c] mt-0.5">{issueDateOnly}</p>
                        </div>
                      </div>

                      {/* 2. Passenger Identification Details (3-Column Layout, No Frequent Flyer) */}
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="material-symbols-outlined text-[18px] text-[#005cab]">person</span>
                          <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#1b1c1c]">1. Passenger Details</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#fbf9f8] p-4 rounded-xl border border-[#E6E6E6]">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#566476] font-bold">Passenger Legal Name</p>
                            <p className="text-sm font-extrabold text-[#1b1c1c] mt-0.5">{legalName}</p>
                            <span className="text-[10px] text-[#005cab] font-semibold">Govt ID Verified</span>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#566476] font-bold">Passenger Type</p>
                            <p className="text-xs font-bold text-[#1b1c1c] mt-1">{paxType}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#566476] font-bold">Contact Registered</p>
                            <p className="text-xs font-mono font-semibold text-[#1b1c1c] mt-0.5">{contactEmail}</p>
                            <p className="text-xs font-mono text-[#566476]">{contactPhone}</p>
                          </div>
                        </div>
                      </div>

                      {/* 3. Flight Itinerary & Timetable */}
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-[#005cab]">alt_route</span>
                            <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#1b1c1c]">2. Flight Itinerary &amp; Timetable</h3>
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[#d3e1f6] text-[#005cab] shrink-0 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            CONFIRMED / OK
                          </span>
                        </div>
                        <div className="border border-[#E6E6E6] rounded-xl p-5 bg-white">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 mb-3 border-b border-[#E6E6E6] gap-2">
                            <div>
                              <span className="font-mono text-xs font-bold text-[#005cab] px-2 py-0.5 rounded bg-[#F2F8FF] mr-2">Flight {flightNo}</span>
                              <span className="text-sm font-bold text-[#1b1c1c]">{aircraft}</span>
                              <span className="text-xs text-[#566476] ml-2">• Operated by {carrier}</span>
                            </div>
                            <div className="text-xs text-[#566476]">
                              Cabin: <strong className="text-[#1b1c1c] font-semibold">{cabin} ({fareBasis})</strong>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                            {/* Origin */}
                            <div className="md:col-span-4">
                              <div className="text-3xl font-black text-[#1b1c1c] leading-none">{originCode}</div>
                              <p className="text-sm font-bold text-[#1b1c1c] mt-1">{originInfo.city}</p>
                              <p className="text-xs text-[#566476] mt-0.5 leading-snug">{originInfo.name}</p>
                              <p className="text-xs font-semibold text-[#005cab] mt-1.5">{depTime}</p>
                              <span className="inline-block text-[11px] font-bold text-[#005cab] bg-[#e0f2fe] border border-[#bae6fd] px-2 py-0.5 rounded mt-1.5">
                                {originInfo.terminal || 'Terminal 3'} (Departure)
                              </span>
                            </div>
                            {/* Route Line */}
                            <div className="md:col-span-4 flex flex-col items-center justify-center py-2">
                              <span className="text-xs font-bold text-[#566476]">{dur} • Non-Stop</span>
                              <div className="w-full flex items-center gap-1 my-2 px-2">
                                <div className="w-2 h-2 rounded-full border-2 border-[#005cab] bg-white"></div>
                                <div className="flex-grow border-t-2 border-dashed border-[#c0c7d6] relative">
                                  <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#005cab] text-[18px] bg-white px-1 rotate-90">flight</span>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-[#005cab]"></div>
                              </div>
                              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">eco</span>
                                Low Emission Aircraft
                              </span>
                            </div>
                            {/* Destination */}
                            <div className="md:col-span-4 md:text-right">
                              <div className="text-3xl font-black text-[#1b1c1c] leading-none">{destCode}</div>
                              <p className="text-sm font-bold text-[#1b1c1c] mt-1">{destInfo.city}</p>
                              <p className="text-xs text-[#566476] mt-0.5 leading-snug">{destInfo.name}</p>
                              <p className="text-xs font-semibold text-[#005cab] mt-1.5">{arrTime}</p>
                              <span className="inline-block text-[11px] font-bold text-[#005cab] bg-[#e0f2fe] border border-[#bae6fd] px-2 py-0.5 rounded mt-1.5">
                                {destInfo.terminal || 'Terminal 2'} (Arrival)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4. Baggage & Seating Assignment (Full Meal Name) */}
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="material-symbols-outlined text-[18px] text-[#005cab]">luggage</span>
                          <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#1b1c1c]">3. Baggage &amp; Seating Assignment</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="border border-[#E6E6E6] rounded-xl p-3 bg-[#fbf9f8]">
                            <span className="text-[10px] uppercase tracking-wider text-[#566476] font-bold">Checked Baggage</span>
                            <p className="text-sm font-extrabold text-[#1b1c1c] mt-0.5">{checkedBaggage}</p>
                            <p className="text-[10px] text-emerald-600 font-bold">Included with Fare</p>
                          </div>
                          <div className="border border-[#E6E6E6] rounded-xl p-3 bg-[#fbf9f8]">
                            <span className="text-[10px] uppercase tracking-wider text-[#566476] font-bold">Carry-On Baggage</span>
                            <p className="text-sm font-extrabold text-[#1b1c1c] mt-0.5">{carryOnBaggage}</p>
                            <p className="text-[10px] text-[#566476]">Standard Overhead Bin</p>
                          </div>
                          <div className="border border-[#E6E6E6] rounded-xl p-3 bg-[#fbf9f8]">
                            <span className="text-[10px] uppercase tracking-wider text-[#566476] font-bold">Seat Assigned</span>
                            <p className="text-sm font-black text-[#005cab] mt-0.5">{seatNumber}</p>
                            <p className="text-[10px] text-[#566476]">Standard Pitch / Forward</p>
                          </div>
                          <div className="border border-[#E6E6E6] rounded-xl p-3 bg-[#fbf9f8]">
                            <span className="text-[10px] uppercase tracking-wider text-[#566476] font-bold">Meal Preference</span>
                            <p className="text-xs font-bold text-[#1b1c1c] mt-0.5">{fullMealName}</p>
                            <p className="text-[10px] text-emerald-700 font-semibold">✓ Confirmed with Catering</p>
                          </div>
                        </div>
                      </div>

                      {/* 5. Fare & Payment Breakdown (Base Fare + Admin Capped Platform Fee ONLY, No Fake Fees, No Payment Method) */}
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="material-symbols-outlined text-[18px] text-[#005cab]">receipt_long</span>
                          <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#1b1c1c]">4. Fare &amp; Payment Breakdown</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#fbf9f8] p-5 rounded-xl border border-[#E6E6E6]">
                          <div className="md:col-span-7 space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-[#E6E6E6] text-[#1b1c1c]">
                              <span>Air Transportation Base Fare</span>
                              <span className="font-bold">{currSymbol}{baseFare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#E6E6E6] text-[#1b1c1c]">
                              <span>Convenience &amp; Platform Fee (Admin Capped)</span>
                              <span className="font-bold">{currSymbol}{platformFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#E6E6E6] text-[#566476]">
                              <span>Seat Selection</span>
                              <span className="font-bold text-emerald-600">Included ({currSymbol}0.00)</span>
                            </div>
                            <p className="text-[10px] text-[#566476] pt-1 italic">
                              Fare Basis: {fareBasis} | Non-endorsable. Re-issue and changes eligible up to 24 hours prior to departure subject to fare rules.
                            </p>
                          </div>
                          <div className="md:col-span-5 flex flex-col justify-center border-t md:border-t-0 md:border-l border-[#E6E6E6] pt-4 md:pt-0 md:pl-6">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider font-bold text-[#566476]">Total Amount Invoiced</p>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-3xl font-black text-[#005cab]">{currSymbol}{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className="text-xs font-bold text-[#1b1c1c]">{currency}</span>
                              </div>
                              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md mt-2">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                PAID IN FULL
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 6. Legal & Regulatory Notices & Scannable Barcode (No Encrypted Strings Below Barcode) */}
                      <div className="pt-4 border-t border-[#E6E6E6] space-y-3">
                        <div className="text-[11px] text-[#566476] space-y-1.5 leading-relaxed">
                          <p className="font-bold text-[#1b1c1c] uppercase tracking-wide text-[10px]">Notice of Carriage Conditions &amp; Montreal Convention:</p>
                          <p>
                            Air carriage is subject to the conditions of carriage and liability rules established by the Convention for the Unification of Certain Rules for International Carriage by Air (Montreal Convention 1999). Valid for travel for 1 year from date of issue.
                          </p>
                          <div className="flex flex-wrap items-center gap-4 pt-1 font-semibold text-[#1b1c1c] text-[11px]">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px] text-amber-600">schedule</span>
                              Check-in counters close 60 mins before departure
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px] text-amber-600">battery_alert</span>
                              Lithium spare batteries must be in carry-on
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px] text-[#005cab]">badge</span>
                              Government Photo ID mandatory at boarding
                            </span>
                          </div>
                        </div>

                        {/* Authentic SVG Barcode Strip (No encrypted strings below barcode) */}
                        <div className="pt-4 border-t border-dashed border-[#c0c7d6] flex flex-col items-center justify-center text-center">
                          <div 
                            className="py-1"
                            dangerouslySetInnerHTML={{ 
                              __html: generateSvgBarcode(`*HX-${pnr}-${ticketNo}*`, 380, 42) 
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                (() => {
                  const data = previewDoc.data || {};
                  const pnr = data.pnr || previewDoc.pnr || 'SK79WQ';
                  const rawPax = data.passengerName || 'RIVERA / ALEX MR';
                  const passengerName = String(rawPax).toUpperCase();
                  const flightNumber = data.flightNumber || 'SK-402';
                  const carrier = data.carrier || 'Skybound Wings';
                  const carrierCode = (data.carrierCode || flightNumber.split('-')[0] || 'SK').toUpperCase();
                  const flightTimes = calculateFlightTimes(data.departureTime || data.scheduledDeparture || '21:10');
                  const departureDate = cleanIssueDate(data.departureDate || '12 Oct 2026');
                  const departureTime = data.departureTime ? cleanTimeDisplay(data.departureTime) : flightTimes.departureTime;
                  const boardingTime = flightTimes.boardingTime;
                  const gateCloseTime = flightTimes.gateCloseTime;

                  const originCode = (data.origin || 'DEL').toUpperCase();
                  const destCode = (data.destination || 'BLR').toUpperCase();
                  const originInfo = AIRPORT_DIRECTORY[originCode] || { city: data.originCity || 'Delhi', terminal: 'Terminal 3', shortTerm: 'T3' };
                  const destInfo = AIRPORT_DIRECTORY[destCode] || { city: data.destinationCity || 'Bengaluru', terminal: 'Terminal 2', shortTerm: 'T2' };

                  const gate = data.gate || '18B';
                  const terminal = data.terminal || originInfo.terminal || 'Terminal 3';
                  const boardingGroup = data.boardingGroup || 'ZONE 2';
                  const seqNumber = data.seqNumber || '0042';
                  const seatNumber = data.seatNumber || '14A';
                  const cabinClass = (data.cabinClass || 'ECONOMY').toUpperCase();
                  const ticketNumber = data.ticketNumber || '402-9823410921';
                  const foodOption = data.foodOption || data.mealPreference || 'Gluten-Free Meal';
                  const cleanMeal = formatCleanMealName(foodOption);
                  const ssrMealCode = data.ssrCode || getSsrMealCode(foodOption);
                  const rawBagTag = data.baggageTag || `SK-${Math.floor(100000 + Math.random() * 900000)}`;
                  const bagTagRef = String(rawBagTag).replace(/\s*•\s*CABIN:\s*\d+KG/gi, '').trim();
                  const barcodeString = data.barcodeString || `M1${passengerName.padEnd(20, ' ')}E${pnr} ${originCode}${destCode}${carrierCode} ${flightNumber.replace(/[^0-9]/g, '').padStart(4, '0')} 285Y${seatNumber.padEnd(4, ' ')}${seqNumber} 147>2180`;
                  const airlineLogo = getAirlineLogo(carrierCode, carrier);

                  return (
                    <div className="space-y-6">
                      {/* Physical Boarding Pass Card with Perforation Stub */}
                      <div className="bg-white border border-[#E6E6E6] rounded-2xl shadow-md overflow-hidden flex flex-col lg:flex-row relative">
                        {/* Top Accent Banner */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-[#005cab]"></div>

                        {/* LEFT / MAIN BOARDING PASS PORTION (70%) */}
                        <div className="lg:w-8/12 p-6 sm:p-7 flex flex-col justify-between pt-7">
                          {/* Pass Header */}
                          <div className="flex justify-between items-start pb-4 border-b border-[#E6E6E6]">
                            <div className="flex items-center gap-3">
                              {airlineLogo ? (
                                <img src={airlineLogo} alt={carrier} className="h-10 w-auto max-w-[120px] object-contain rounded" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-[#005cab] text-white flex items-center justify-center font-bold">
                                  <span className="material-symbols-outlined text-[24px]">flight</span>
                                </div>
                              )}
                              <div>
                                <h4 className="text-sm font-black text-[#005cab] tracking-tight">{carrier.toUpperCase()}</h4>
                                <p className="text-xs text-[#1b1c1c] font-bold whitespace-nowrap">FLIGHT {flightNumber} • {departureDate}</p>
                              </div>
                            </div>
                            {/* Indicators Badge Row */}
                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <span className="px-2.5 py-1 bg-[#005cab] text-white font-sans text-[10px] font-bold rounded whitespace-nowrap shrink-0">DOCS OK</span>
                              <span className="px-2.5 py-1 bg-[#d3e1f6] text-[#005cab] font-sans text-[10px] font-bold rounded whitespace-nowrap shrink-0">SKY PRIORITY</span>
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-sans text-[10px] font-bold rounded whitespace-nowrap shrink-0">SSR: {ssrMealCode}</span>
                            </div>
                          </div>

                          {/* Passenger & Route Banner */}
                          <div className="py-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                              <div>
                                <p className="text-[10px] font-bold text-[#566476] tracking-wider uppercase">Passenger Name</p>
                                <p className="text-xl sm:text-2xl font-black text-[#1b1c1c] tracking-wide">{passengerName}</p>
                              </div>
                              <div className="sm:text-right text-xs">
                                <span className="text-[#566476]">E-Ticket:</span>
                                <span className="font-semibold text-[#1b1c1c]"> {ticketNumber}</span>
                                <br />
                                <span className="text-[#566476]">PNR:</span>
                                <strong className="text-[#005cab] font-bold"> {pnr}</strong>
                              </div>
                            </div>

                            {/* Route Large Code Display (Cleanly spaced, no duplicates) */}
                            <div className="flex items-center justify-between bg-[#F2F8FF]/80 rounded-xl p-4 border border-[#d3e1f6]/60">
                              <div>
                                <span className="text-[10px] font-bold text-[#566476]">ORIGIN</span>
                                <p className="text-3xl font-black text-[#1b1c1c] leading-tight my-0.5">{originCode}</p>
                                <p className="text-xs font-semibold text-[#1b1c1c]">{originInfo.city}</p>
                                <span className="inline-block text-[10px] font-bold text-[#005cab] bg-[#e0f2fe] border border-[#bae6fd] px-1.5 py-0.5 rounded mt-1">{originInfo.terminal}</span>
                              </div>
                              <div className="flex flex-col items-center px-4">
                                <span className="text-[10px] font-bold text-[#566476]">NON-STOP</span>
                                <div className="flex items-center gap-1 w-24 sm:w-36 my-1">
                                  <div className="h-0.5 flex-grow bg-[#005cab]"></div>
                                  <span className="material-symbols-outlined text-[#005cab] text-[20px]">flight</span>
                                  <div className="h-0.5 flex-grow bg-[#005cab]"></div>
                                </div>
                                <span className="text-[10px] text-[#566476]">2h 45m</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-[#566476]">DESTINATION</span>
                                <p className="text-3xl font-black text-[#1b1c1c] leading-tight my-0.5">{destCode}</p>
                                <p className="text-xs font-semibold text-[#1b1c1c]">{destInfo.city}</p>
                                <span className="inline-block text-[10px] font-bold text-[#005cab] bg-[#e0f2fe] border border-[#bae6fd] px-1.5 py-0.5 rounded mt-1">{destInfo.terminal}</span>
                              </div>
                            </div>
                          </div>

                          {/* 4 Logistics Cards */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-1">
                            <div className="bg-[#fbf9f8] border border-[#E6E6E6] rounded-xl p-2.5 text-center">
                              <span className="text-[10px] font-bold text-[#566476] uppercase tracking-wider block">Boarding Gate</span>
                              <span className="text-xl font-black text-[#1b1c1c] block mt-0.5">{gate}</span>
                              <span className="text-[10px] font-bold text-[#005cab] bg-[#d3e1f6] px-1.5 py-0.5 rounded inline-block mt-0.5">{terminal}</span>
                            </div>
                            <div className="bg-[#0075d7] text-white rounded-xl p-2.5 text-center shadow-sm">
                              <span className="text-[10px] font-bold tracking-wider uppercase opacity-90 block">Boarding Time</span>
                              <span className="text-xl font-black block mt-0.5">{boardingTime}</span>
                              <span className="text-[10px] font-bold opacity-90 block">Closes {gateCloseTime}</span>
                            </div>
                            <div className="bg-[#fbf9f8] border border-[#E6E6E6] rounded-xl p-2.5 text-center">
                              <span className="text-[10px] font-bold text-[#566476] uppercase tracking-wider block">Zone / Group</span>
                              <span className="text-xl font-black text-[#1b1c1c] block mt-0.5">{boardingGroup}</span>
                              <span className="text-[10px] text-[#566476]">SEQ {seqNumber}</span>
                            </div>
                            <div className="bg-[#fbf9f8] border-2 border-[#005cab] rounded-xl p-2.5 text-center">
                              <span className="text-[10px] font-bold text-[#005cab] uppercase tracking-wider block">Seat</span>
                              <span className="text-2xl font-black text-[#005cab] block mt-0.5">{seatNumber}</span>
                              <span className="text-[10px] font-semibold text-[#566476]">{cabinClass} / Win</span>
                            </div>
                          </div>

                          {/* Barcode & Operational Metadata (Clean - IATA BCBP Encoded Data Block Completely Hidden) */}
                          <div className="pt-4 mt-3 border-t border-[#E6E6E6] flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <div className="w-16 h-16 bg-[#1b1c1c] rounded p-1 flex items-center justify-center shrink-0">
                                <div dangerouslySetInnerHTML={{ __html: generate2DMatrixBarcodeSvg(barcodeString, 58, 58) }} />
                              </div>
                              <div className="text-[10px] text-[#566476] leading-tight">
                                <p className="font-bold text-[#005cab]">SECURE ELECTRONIC BOARDING PASS</p>
                                <p className="text-[#1b1c1c] font-bold mt-0.5">BAG TAG: {bagTagRef} • CABIN: 7KG</p>
                                <p className="text-emerald-700 font-semibold mt-0.5">✓ {cleanMeal} ({ssrMealCode})</p>
                              </div>
                            </div>
                            <div className="text-right text-[10px] text-[#566476] hidden sm:block">
                              <span>Gate closes 20 min prior</span><br />
                              <span className="font-bold text-amber-700">Valid Govt Photo ID Required</span>
                            </div>
                          </div>
                        </div>

                        {/* Perforation Divider Line */}
                        <div className="relative hidden lg:flex items-center justify-center w-3 bg-[#f5f3f3] border-l border-r border-[#E6E6E6]">
                          <div className="h-full w-px border-l-2 border-dashed border-[#94a3b8]"></div>
                        </div>

                        {/* RIGHT / PASSENGER TEAR-OFF STUB (30%) - Passenger Coupon Text Completely Removed */}
                        <div className="lg:w-4/12 p-6 bg-[#fbf9f8] flex flex-col justify-between pt-7 border-t lg:border-t-0 border-[#E6E6E6]">
                          <div>
                            <div className="flex items-center justify-between pb-3 border-b border-[#E6E6E6]">
                              <span className="text-base font-black text-[#005cab] tracking-tight whitespace-nowrap">{carrier.replace(/\s*\([A-Z0-9]+\)/gi, '').trim()}</span>
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#005cab] whitespace-nowrap">FLIGHT STUB</span>
                            </div>
                            <div className="mt-3.5 space-y-2.5">
                              <div>
                                <span className="text-[9px] uppercase tracking-wider font-bold text-[#566476]">Passenger</span>
                                <p className="text-xs font-bold text-[#1b1c1c] truncate">{passengerName}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-[9px] uppercase tracking-wider text-[#566476]">Flight</span>
                                  <p className="font-mono font-bold text-[#1b1c1c]">{flightNumber}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase tracking-wider text-[#566476]">Date</span>
                                  <p className="font-mono font-bold text-[#1b1c1c]">{departureDate}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-[9px] uppercase tracking-wider text-[#566476]">Route</span>
                                  <p className="font-mono font-bold text-[#1b1c1c]">{originCode} → {destCode}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase tracking-wider text-[#566476]">Gate</span>
                                  <p className="font-mono font-bold text-[#1b1c1c]">{gate}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-white border border-[#E6E6E6]">
                                <div>
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-[#005cab]">Seat</span>
                                  <p className="text-lg font-black text-[#005cab]">{seatNumber}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-[#566476]">Boarding</span>
                                  <p className="text-lg font-black text-[#1b1c1c]">{boardingTime}</p>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-mono text-[#566476] pt-1">
                                <span>PNR: <strong className="text-[#1b1c1c] font-bold">{pnr}</strong></span>
                                <span>SEQ: <strong className="text-[#1b1c1c] font-bold">{seqNumber}</strong></span>
                                <span className="font-bold">{boardingGroup}</span>
                              </div>
                            </div>
                          </div>

                          {/* 1D Linear Barcode on Stub (No Encrypted Strings Below Barcode) */}
                          <div className="pt-4 mt-3 border-t border-[#E6E6E6] flex flex-col items-center">
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: generateSvgBarcode(`${carrierCode}${flightNumber.replace(/[^0-9]/g, '')}-${pnr}-${seatNumber}`, 180, 36) 
                              }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Travel Tips for Departure */}
                      <div className="bg-white border border-[#E6E6E6] rounded-xl p-4 shadow-xs">
                        <h3 className="text-xs font-bold text-[#1b1c1c] mb-2.5 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#005cab] text-[18px]">info</span>
                          {carrier} Travel Tips for Departure
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#566476]">
                          <div className="p-3 bg-[#fbf9f8] rounded-lg border border-[#E6E6E6]">
                            <strong className="text-[#1b1c1c] block font-semibold mb-1">1. Terminal Entry</strong>
                            Show this boarding pass on your mobile device along with government photo ID at {originInfo.city} Airport ({originInfo.shortTerm || 'T3'}).
                          </div>
                          <div className="p-3 bg-[#fbf9f8] rounded-lg border border-[#E6E6E6]">
                            <strong className="text-[#1b1c1c] block font-semibold mb-1">2. Fast Track Bag Drop</strong>
                            Since you are checked-in to Seat {seatNumber}, proceed directly to {carrier} Express Counter for instantaneous baggage tag printing.
                          </div>
                          <div className="p-3 bg-[#fbf9f8] rounded-lg border border-[#E6E6E6]">
                            <strong className="text-[#1b1c1c] block font-semibold mb-1">3. In-flight Dining</strong>
                            Your complimentary {foodOption} ({ssrMealCode}) will be served approximately 35 minutes after takeoff.
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* DOWNLOAD BUTTONS (Requirement 7) */}
            <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500">
                Official aviation document • Instant PDF export saved directly to your device
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="w-full sm:w-auto bg-[#005cab] hover:bg-[#004b8c] text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isDownloadingPdf ? 'hourglass_top' : 'download'}
                  </span>
                  <span>
                    {isDownloadingPdf 
                      ? 'Generating PDF...' 
                      : (previewDoc.type === 'TICKET' ? 'Download E Ticket' : 'Download Boarding Pass')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. WEB CHECK-IN MODAL */}
      {/* ============================================================== */}
      {isCheckinOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 border border-gray-200 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
              <div>
                <h2 className="text-xl font-black text-[#111827]">Express Web Check-in</h2>
                <p className="text-xs text-[#566476] mt-0.5">Cleared for all booked tickets • No 48h limit in sandbox</p>
              </div>
              <button 
                onClick={() => setIsCheckinOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 font-bold"
              >
                ✕
              </button>
            </div>

            {checkinSuccess ? (
              // Check-in Success View
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-4xl">check_circle</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Boarding Pass Issued!</h3>
                <p className="text-xs text-gray-600 mb-6">
                  Web check-in cleared for <strong>{checkinSuccess.passengerName}</strong> on PNR <strong className="font-mono">{checkinSuccess.pnr}</strong>.
                </p>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left grid grid-cols-2 gap-3 text-xs mb-6">
                  <div><span className="text-gray-500">Seat</span><div className="font-black text-xl text-[#005cab]">{checkinSuccess.seatNumber}</div></div>
                  <div><span className="text-gray-500">Gate</span><div className="font-bold text-sm">{checkinSuccess.gate}</div></div>
                  <div><span className="text-gray-500">Terminal</span><div className="font-bold text-sm">{checkinSuccess.terminal}</div></div>
                  <div><span className="text-gray-500">Boarding Time</span><div className="font-bold text-sm">{checkinSuccess.boardingTime}</div></div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setIsCheckinOpen(false);
                      handleOpenBoardingPass(checkinSuccess.pnr);
                    }}
                    className="w-full bg-[#005cab] hover:bg-[#004b8c] text-white py-3 rounded-xl font-bold text-sm transition-colors shadow-sm"
                  >
                    View & Download Boarding Pass
                  </button>
                  <button
                    onClick={() => setIsCheckinOpen(false)}
                    className="w-full py-2.5 text-xs text-gray-600 hover:text-gray-900 font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              // Check-in Input Form
              <form onSubmit={handleCheckinSubmit} className="space-y-4">
                {checkinError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {checkinError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Booking Reference (PNR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 6N8R3E"
                    value={checkinForm.pnr}
                    onChange={(e) => setCheckinForm({ ...checkinForm, pnr: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-mono text-sm tracking-wider uppercase focus:outline-none focus:border-[#005cab]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Passenger Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sharma"
                    value={checkinForm.lastName}
                    onChange={(e) => setCheckinForm({ ...checkinForm, lastName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-[#005cab]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. user@domain.com"
                      value={checkinForm.email}
                      onChange={(e) => setCheckinForm({ ...checkinForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-[#005cab]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Last 4 Digits of Mobile (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 4321"
                      value={checkinForm.mobileLast4}
                      onChange={(e) => setCheckinForm({ ...checkinForm, mobileLast4: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-[#005cab]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCheckinOpen(false)}
                    className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={checkinLoading}
                    className="flex-1 bg-[#005cab] hover:bg-[#004b8c] text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    {checkinLoading ? (
                      <>
                        <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                        Clearing Manifest...
                      </>
                    ) : (
                      'Complete Check-in'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
