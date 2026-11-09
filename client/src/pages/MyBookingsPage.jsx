import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { USER_ENDPOINTS } from '../services/api';

export default function MyBookingsPage({ defaultTab = 'ALL' }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [selectedBooking, setSelectedBooking] = useState(null); // for Details modal
  const [previewDoc, setPreviewDoc] = useState(null); // { type: 'TICKET'|'BOARDING_PASS', pnr, data, markdown, html }
  const [previewTab, setPreviewTab] = useState('card'); // 'card' | 'markdown' | 'printable'
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
        setBookings(json.data);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicket = async (pnr) => {
    try {
      const [jsonRes, mdRes] = await Promise.all([
        fetch(USER_ENDPOINTS.TICKET(pnr, 'json')),
        fetch(USER_ENDPOINTS.TICKET(pnr, 'markdown'))
      ]);
      const jsonData = await jsonRes.json();
      const mdData = await mdRes.json();

      setPreviewDoc({
        type: 'TICKET',
        pnr,
        title: `E-Ticket Receipt (PNR: ${pnr})`,
        data: jsonData.data,
        markdown: mdData.content,
        htmlUrl: USER_ENDPOINTS.TICKET(pnr, 'html')
      });
      setPreviewTab('card');
    } catch (err) {
      alert('Unable to retrieve E-Ticket: ' + err.message);
    }
  };

  const handleOpenBoardingPass = async (pnr) => {
    try {
      const [jsonRes, mdRes] = await Promise.all([
        fetch(USER_ENDPOINTS.BOARDING_PASS(pnr, 'json')),
        fetch(USER_ENDPOINTS.BOARDING_PASS(pnr, 'markdown'))
      ]);
      const jsonData = await jsonRes.json();
      if (!jsonRes.ok) {
        alert(jsonData.error || 'Boarding pass is not available for this flight.');
        return;
      }
      const mdData = await mdRes.json();

      setPreviewDoc({
        type: 'BOARDING_PASS',
        pnr,
        title: `Official Boarding Pass (PNR: ${pnr})`,
        data: jsonData.data,
        markdown: mdData.content,
        htmlUrl: USER_ENDPOINTS.BOARDING_PASS(pnr, 'html')
      });
      setPreviewTab('card');
    } catch (err) {
      alert('Unable to retrieve Boarding Pass: ' + err.message);
    }
  };

  const handleDownloadMarkdown = (filename, content) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintDocument = (htmlUrl) => {
    const printWindow = window.open(htmlUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
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
            { id: 'FUTURE', label: 'Upcoming (Future)', count: bookings.filter(b => b.classification === 'FUTURE').length },
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
                        {card.classification}
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
                      className="flex-1 bg-[#005cab] hover:bg-[#004b8c] text-white py-2 px-3 rounded-xl font-bold text-sm transition-colors text-center"
                    >
                      View Details
                    </button>
                    {card.permissions.canViewBoardingPass && (
                      <button
                        onClick={() => handleOpenBoardingPass(card.pnr)}
                        title="Quick View Boarding Pass"
                        className="bg-[#eef5fc] hover:bg-[#d9ecfa] text-[#005cab] p-2 rounded-xl transition-colors flex items-center justify-center"
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
                <div className="font-extrabold text-[#111827]">{selectedBooking.classification}</div>
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

              {/* Boarding Pass: ONLY for Current and Future */}
              {selectedBooking.permissions.canViewBoardingPass ? (
                <button
                  onClick={() => handleOpenBoardingPass(selectedBooking.pnr)}
                  className="flex-1 bg-[#005cab] hover:bg-[#004b8c] text-white font-bold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">airplane_ticket</span>
                  View Boarding Pass
                </button>
              ) : (
                <button
                  disabled
                  title="Boarding Pass is only accessible for current and upcoming journeys."
                  className="flex-1 bg-gray-100 text-gray-400 font-bold py-3 px-4 rounded-xl text-sm cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">block</span>
                  Boarding Pass (Unavailable for {selectedBooking.classification})
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
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 border border-gray-200 shadow-2xl my-8">
            
            {/* Modal Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 mb-6">
              <div>
                <h2 className="text-xl font-black text-[#111827]">{previewDoc.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded">
                    PNR: {previewDoc.pnr}
                  </span>
                  <span className="text-xs text-gray-500">IATA Verified Aviation Document</span>
                </div>
              </div>

              {/* Format Toggles */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setPreviewTab('card')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewTab === 'card' ? 'bg-white text-[#005cab] shadow-xs' : 'text-gray-600 hover:text-black'
                  }`}
                >
                  Visual Preview
                </button>
                <button
                  onClick={() => setPreviewTab('markdown')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewTab === 'markdown' ? 'bg-white text-[#005cab] shadow-xs' : 'text-gray-600 hover:text-black'
                  }`}
                >
                  Markdown
                </button>
              </div>
            </div>

            {/* Modal Body Preview Content */}
            <div className="mb-6 max-h-[60vh] overflow-y-auto pr-1">
              {previewTab === 'card' ? (
                previewDoc.type === 'TICKET' ? (
                  // Visual E-Ticket Receipt
                  <div className="border border-gray-200 rounded-2xl p-6 bg-white space-y-6">
                    <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                      <div>
                        <div className="text-2xl font-black text-[#005cab]">Horizon-X</div>
                        <div className="text-xs text-gray-500">Official Electronic Ticket Receipt</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">PNR Reference</div>
                        <div className="text-xl font-mono font-black text-[#005cab]">{previewDoc.data?.pnr}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div><div className="text-gray-500">Issued On</div><div className="font-bold">{previewDoc.data?.bookingDate}</div></div>
                      <div><div className="text-gray-500">Status</div><div className="font-bold text-emerald-600">{previewDoc.data?.status}</div></div>
                      <div><div className="text-gray-500">Cabin</div><div className="font-bold">{previewDoc.data?.cabinClass}</div></div>
                      <div><div className="text-gray-500">Total Paid</div><div className="font-bold">₹{previewDoc.data?.totalAmount?.toLocaleString('en-IN')}</div></div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Flight Sectors</h4>
                      {previewDoc.data?.sectors?.map((s, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-2 flex justify-between items-center text-sm">
                          <div>
                            <div className="font-extrabold text-gray-900">{s.origin} ➔ {s.destination} ({s.flightNumber})</div>
                            <div className="text-xs text-gray-500">{s.airline} • {s.aircraft}</div>
                          </div>
                          <div className="text-right text-xs">
                            <div>Depart: <strong>{s.departureTime}</strong></div>
                            <div>Baggage: <strong>{s.baggageAllowance}</strong></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Visual Boarding Pass
                  <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-6 md:p-8 shadow-xl">
                    <div className="flex justify-between items-center border-b border-white/20 pb-4 mb-6">
                      <div className="text-xl font-black tracking-tight">{previewDoc.data?.carrier}</div>
                      <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                        BOARDING PASS • {previewDoc.data?.cabinClass}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <div className="text-4xl font-black tracking-tight">{previewDoc.data?.origin}</div>
                        <div className="text-xs text-blue-200">Depart: {previewDoc.data?.departureTime}</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-blue-200">{previewDoc.data?.flightNumber}</span>
                        <span className="text-2xl font-bold">✈ ➔</span>
                        <span className="text-xs text-blue-300">{previewDoc.data?.departureDate}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-black tracking-tight">{previewDoc.data?.destination}</div>
                        <div className="text-xs text-blue-200">Boarding: {previewDoc.data?.boardingTime}</div>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-6">
                      <div><div className="text-blue-300">Passenger</div><div className="font-bold text-sm">{previewDoc.data?.passengerName}</div></div>
                      <div><div className="text-blue-300">Terminal & Gate</div><div className="font-bold text-sm">{previewDoc.data?.terminal} • {previewDoc.data?.gate}</div></div>
                      <div><div className="text-blue-300">Boarding Zone</div><div className="font-bold text-sm">{previewDoc.data?.boardingGroup}</div></div>
                      <div><div className="text-blue-300">Assigned Seat</div><div className="font-black text-2xl text-amber-300">{previewDoc.data?.seatNumber}</div></div>
                    </div>

                    <div className="pt-4 border-t border-white/10 text-center font-mono text-[10px] text-blue-200 tracking-widest break-all">
                      {previewDoc.data?.barcodeString}
                    </div>
                  </div>
                )
              ) : (
                // Markdown Code Preview
                <div className="bg-gray-900 text-gray-100 p-6 rounded-2xl font-mono text-xs overflow-x-auto whitespace-pre">
                  {previewDoc.markdown}
                </div>
              )}
            </div>

            {/* DOWNLOAD BUTTONS */}
            <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500">
                Official flight documentation • Print or download for offline access
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                {/* Download Markdown */}
                <button
                  onClick={() => handleDownloadMarkdown(`${previewDoc.type}-${previewDoc.pnr}.md`, previewDoc.markdown)}
                  className="flex-1 sm:flex-none border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">description</span>
                  Download Markdown (.md)
                </button>

                {/* Print or Save as PDF */}
                <button
                  onClick={() => handlePrintDocument(previewDoc.htmlUrl)}
                  className="flex-1 sm:flex-none bg-[#005cab] hover:bg-[#004b8c] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  Print / Save as PDF
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
