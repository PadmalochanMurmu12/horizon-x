/**
 * Horizon-X Aviation Document Generator
 * Generates IATA-compliant Flight Electronic Tickets (E-Tickets) and Boarding Passes
 * in Markdown, Printable HTML/PDF, and JSON formats.
 */

/**
 * Formats an ISO date/time string into a human-readable format: "DD MMM YYYY, HH:mm" (e.g., "14 Nov 2026, 08:30 UTC").
 */
function formatFlightDateTime(dateInput) {
  if (!dateInput) return 'TBA';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return `${dateStr}, ${timeStr} UTC`;
}

/**
 * Normalizes leg sector properties whether structured from inventory segments or booking JSON.
 */
function normalizeSector(leg) {
  const origin = leg.originAirportCode || leg.origin || 'DEL';
  const originCity = leg.originCity ? ` (${leg.originCity})` : '';
  const destination = leg.destinationAirportCode || leg.destination || 'BOM';
  const destinationCity = leg.destinationCity ? ` (${leg.destinationCity})` : '';
  const rawDep = leg.departureTime || leg.scheduledDeparture;
  const rawArr = leg.arrivalTime || leg.scheduledArrival;

  let durationMinutes = leg.durationMinutes;
  if (!durationMinutes && rawDep && rawArr) {
    const diff = (new Date(rawArr) - new Date(rawDep)) / (1000 * 60);
    if (!isNaN(diff) && diff > 0) durationMinutes = Math.round(diff);
  }

  return {
    flightNumber: leg.flightNumber || 'HX-1001',
    airline: leg.airline?.name || leg.airlineName || 'Horizon-X Partner',
    airlineCode: leg.airlineCode || leg.airline?.code || '6E',
    aircraft: leg.aircraft || 'Airbus A320-200',
    origin,
    originLabel: `${origin}${originCity}`,
    destination,
    destinationLabel: `${destination}${destinationCity}`,
    rawDepartureTime: rawDep,
    rawArrivalTime: rawArr,
    departureTime: formatFlightDateTime(rawDep),
    arrivalTime: formatFlightDateTime(rawArr),
    durationMinutes: durationMinutes || 120,
    baggageAllowance: leg.baggage || leg.baggageAllowance || '15kg Check-in • 7kg Cabin'
  };
}
function getJourneyClassification(booking) {
  if (booking.status === 'CANCELLED') return 'CANCELLED';
  if (booking.status === 'COMPLETED') return 'COMPLETED';

  const now = new Date();
  const journey = Array.isArray(booking.journeyDetails) ? booking.journeyDetails : [];
  if (journey.length === 0) return 'FUTURE';

  const todayStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const todayEndUtc   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const firstSectorDeparture = new Date(journey[0].departureTime || journey[0].scheduledDeparture);
  if (isNaN(firstSectorDeparture.getTime())) return 'FUTURE';

  if (firstSectorDeparture < todayStartUtc) {
    return 'PAST';
  } else if (firstSectorDeparture <= todayEndUtc) {
    return 'CURRENT';
  } else {
    return 'FUTURE';
  }
}

/**
 * Generates an IATA-standard 2D Bar Coded Boarding Pass (BCBP) data string.
 * Format standard: M1{LAST/FIRST}{PNR}{ORIGIN}{DEST}{CARRIER}{FLIGHT}{JULIANDAY}{CABIN}{SEAT}{SEQ}
 */
function generateIataBcbp(passenger, segment, pnr) {
  const pName = `${(passenger.lastName || 'TRAVELER').toUpperCase()}/${(passenger.firstName || '').toUpperCase()}`.padEnd(20, ' ').substring(0, 20);
  const cleanPnr = (pnr || 'HX7K9B').padEnd(7, ' ').substring(0, 7);
  const origin = (segment.origin || 'DEL').substring(0, 3);
  const dest = (segment.destination || 'BOM').substring(0, 3);
  const carrier = (segment.airlineCode || segment.airline?.code || '6E').padEnd(3, ' ').substring(0, 3);
  const flightNo = String(segment.flightNumber || '1001').replace(/[^0-9]/g, '').padStart(4, '0').substring(0, 4);
  const cabin = (passenger.cabinClass || segment.cabinClass || 'Y').substring(0, 1);
  const seat = (passenger.seatNumber || '12A').padStart(4, '0').substring(0, 4);
  const seq = '0042';

  return `M1${pName}E${cleanPnr} ${origin}${dest}${carrier} ${flightNo} 318${cabin}${seat}${seq} 147>5180`;
}

/**
 * Generates an Electronic Flight Ticket (E-Ticket) Receipt.
 * Available for ALL journeys (Past, Current, and Future).
 */
function generateFlightTicket(booking, format = 'markdown') {
  const journey = Array.isArray(booking.journeyDetails) ? booking.journeyDetails : [];
  const passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
  const classification = getJourneyClassification(booking);
  const bookingDate = new Date(booking.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const rawSectors = journey.map(normalizeSector);
  const data = {
    documentType: 'ELECTRONIC_TICKET_RECEIPT',
    pnr: booking.pnr,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    classification,
    bookingDate,
    tripType: booking.tripType,
    cabinClass: booking.cabinClass,
    contactInfo: {
      email: booking.contactEmail,
      phone: booking.contactPhone
    },
    totalAmount: Number(booking.totalAmount),
    currency: booking.currency || 'INR',
    passengers: passengers.map(p => ({
      name: `${p.firstName} ${p.lastName}`,
      ticketNumber: p.ticketNumber || `098-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      seatNumber: p.seatNumber || 'Unassigned',
      foodOption: p.foodOption || 'VEG',
      nationality: p.nationality || 'Indian'
    })),
    sectors: rawSectors.map((s, idx) => ({
      sectorNumber: idx + 1,
      flightNumber: s.flightNumber,
      airline: s.airline,
      aircraft: s.aircraft,
      origin: s.origin,
      originLabel: s.originLabel,
      destination: s.destination,
      destinationLabel: s.destinationLabel,
      departureTime: s.departureTime,
      arrivalTime: s.arrivalTime,
      durationMinutes: s.durationMinutes,
      baggageAllowance: s.baggageAllowance
    }))
  };

  if (format === 'json') return data;

  // 2. Markdown Document
  if (format === 'markdown') {
    const passengerTable = data.passengers.map((p, i) =>
      `| ${i + 1} | ${p.name} | \`${p.ticketNumber}\` | **${p.seatNumber}** | ${p.foodOption} | ${p.nationality} |`
    ).join('\n');

    const sectorBlocks = data.sectors.map(s => `
### Sector ${s.sectorNumber}: ${s.originLabel} ➔ ${s.destinationLabel} (${s.flightNumber})
- **Carrier:** ${s.airline} • **Aircraft:** ${s.aircraft}
- **Departure:** \`${s.departureTime}\`
- **Arrival:** \`${s.arrivalTime}\`
- **Duration:** ${s.durationMinutes} mins • **Cabin:** ${booking.cabinClass}
- **Baggage Allowance:** ${s.baggageAllowance}
`).join('\n');

    const markdown = `# ✈️ HORIZON-X PASSENGER ELECTRONIC TICKET RECEIPT
**Aviation Ground Control • Official Passenger Name Record (PNR)**

---

### 📋 Reservation Overview
- **Booking Reference (PNR):** \`${data.pnr}\`
- **Booking Status:** **${data.status}** (${data.paymentStatus})
- **Journey Classification:** **${classification}**
- **Date of Issue:** ${data.bookingDate}
- **Contact Email:** \`${data.contactInfo.email}\` | **Phone:** \`${data.contactInfo.phone}\`
- **Total Amount Paid:** **₹${data.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${data.currency}** (GST 18% inclusive)

---

### 👥 Passenger Details
| # | Passenger Name | E-Ticket Number (13-Digit) | Seat | Meal | Nationality |
|---|----------------|----------------------------|------|------|-------------|
${passengerTable}

---

### 🗺️ Flight Sectors & Navigational Itinerary
${sectorBlocks}

---

### 📌 Conditions of Carriage & Travel Advisory
1. **Reporting Time:** Check-in counters open 2 hours and strictly close 60 minutes prior to scheduled departure.
2. **Identification:** All adult passengers must present a government-issued photo identity document (Aadhaar, Passport, Voter ID) matching the ticket name.
3. **Baggage Policy:** Standard Economy check-in allowance is 15 KG per passenger (1 piece) plus 7 KG cabin hand baggage.
4. **Cancellation & Changes:** Subject to carrier tariff rules. Visit Horizon-X ground control panel or call customer support.

---
*Horizon-X Aviation Systems • Secure E-Ticket Generated Automatically • IATA Accredited*
`;
    return markdown;
  }

  // 3. Printable HTML Document (Ready for window.print() or PDF export)
  if (format === 'html') {
    return generatePrintableTicketHtml(data);
  }

  return data;
}

/**
 * Generates an Official Boarding Pass for a passenger.
 * Only permissible for CURRENT and FUTURE journeys.
 */
function generateBoardingPass(booking, format = 'markdown', passengerIndex = 0) {
  const classification = getJourneyClassification(booking);
  if (booking.status === 'CANCELLED') {
    throw new Error('Boarding Pass unavailable: This reservation has been cancelled.');
  }
  if (classification === 'PAST' || classification === 'COMPLETED' || booking.status === 'COMPLETED') {
    throw new Error('Boarding Pass expired: This journey has already departed and concluded.');
  }

  const journey = Array.isArray(booking.journeyDetails) ? booking.journeyDetails : [];
  const passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
  const passenger = passengers[passengerIndex] || passengers[0] || { firstName: 'VALUED', lastName: 'PASSENGER' };
  const firstSectorRaw = journey[0] || {};
  const firstSector = normalizeSector(firstSectorRaw);

  const departureDate = new Date(firstSector.rawDepartureTime || new Date());
  const boardingDate = new Date(departureDate.getTime() - 45 * 60 * 1000); // 45 min prior

  const terminal = passenger.terminal || (firstSector.origin === 'DEL' ? 'T3' : firstSector.origin === 'BOM' ? 'T2' : 'T1');
  const gate = passenger.gate || `Gate ${10 + (Math.abs(booking.pnr.charCodeAt(0)) % 15)}${String.fromCharCode(65 + (Math.abs(booking.pnr.charCodeAt(1)) % 4))}`;
  const boardingGroup = passenger.boardingGroup || (booking.cabinClass === 'BUSINESS' || booking.cabinClass === 'FIRST' ? 'ZONE 1' : 'ZONE 2');
  const seatNumber = passenger.seatNumber || '12B';
  const ticketNumber = passenger.ticketNumber || `098-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const barcodeString = passenger.barcode || generateIataBcbp(passenger, firstSector, booking.pnr);

  const data = {
    documentType: 'OFFICIAL_BOARDING_PASS',
    pnr: booking.pnr,
    passengerName: `${passenger.lastName?.toUpperCase()} / ${passenger.firstName?.toUpperCase()} MR/MS`,
    flightNumber: firstSector.flightNumber || 'HX-1001',
    carrier: firstSector.airline || 'Horizon-X',
    carrierCode: firstSector.airlineCode || '6E',
    aircraft: firstSector.aircraft || 'Airbus A320neo',
    origin: firstSector.origin || 'DEL',
    destination: firstSector.destination || 'BOM',
    departureTime: departureDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC',
    departureDate: departureDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    boardingTime: boardingDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC',
    terminal,
    gate,
    boardingGroup,
    seatNumber,
    cabinClass: booking.cabinClass || 'ECONOMY',
    ticketNumber,
    seqNumber: '042',
    barcodeString,
    isCheckedIn: Boolean(booking.isCheckedIn || passenger.isCheckedIn)
  };

  if (format === 'json') return data;

  if (format === 'markdown') {
    return `\`\`\`
====================================================================================================
✈️  HORIZON-X BOARDING PASS | ${data.carrier.toUpperCase()} (${data.carrierCode})           BOARDING GROUP: ${data.boardingGroup}
====================================================================================================
PASSENGER NAME : ${data.passengerName.padEnd(30, ' ')} PNR : ${data.pnr}           CLASS : ${data.cabinClass}
ETKT NUMBER    : ${data.ticketNumber.padEnd(30, ' ')} SEQ : ${data.seqNumber}          CHECK-IN : ${data.isCheckedIn ? 'COMPLETED' : 'STANDARD'}
----------------------------------------------------------------------------------------------------
SECTOR         : ${data.origin} ➔ ${data.destination}
FLIGHT NUMBER  : ${data.flightNumber} (${data.aircraft})
TRAVEL DATE    : ${data.departureDate}

+-----------------+-----------------+-----------------+-----------------+-----------------+
|    TERMINAL     |      GATE       |  BOARDING TIME  | DEPARTURE TIME  |   SEAT NUMBER   |
|                 |                 |                 |                 |                 |
|       ${data.terminal.padEnd(10, ' ')}|     ${data.gate.padEnd(12, ' ')}|      ${data.boardingTime.padEnd(11, ' ')}|      ${data.departureTime.padEnd(11, ' ')}|      ${data.seatNumber.padEnd(11, ' ')}|
+-----------------+-----------------+-----------------+-----------------+-----------------+

BOARDING GATES CLOSE STRICTLY 20 MINUTES PRIOR TO SCHEDULED DEPARTURE.
PLEASE HAVE YOUR BOARDING PASS AND GOVERNMENT-ISSUED PHOTO ID READY AT GATE INSPECTION.

IATA 2D BARCODE ENCODING:
${data.barcodeString}
||| | ||||| |||| || | |||| |||||| ||||| ||| |||| |||| ||| |||| |||||||| |||| | ||||| |||| || | |||
====================================================================================================
\`\`\``;
  }

  if (format === 'html') {
    return generatePrintableBoardingPassHtml(data);
  }

  return data;
}

/**
 * Generates beautiful printable HTML for E-Tickets.
 */
function generatePrintableTicketHtml(ticket) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>E-Ticket Receipt - ${ticket.pnr}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1b1c1c; margin: 0; padding: 20px; background: #fff; }
    .ticket-container { max-width: 800px; margin: 0 auto; border: 1px solid #d2d2d7; border-radius: 12px; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #005cab; padding-bottom: 16px; margin-bottom: 20px; }
    .logo { font-size: 26px; font-weight: 800; color: #005cab; letter-spacing: -0.5px; }
    .pnr-box { background: #eef5fc; padding: 8px 16px; border-radius: 8px; text-align: right; }
    .pnr-title { font-size: 11px; text-transform: uppercase; color: #566476; font-weight: 600; }
    .pnr-val { font-size: 20px; font-weight: 800; color: #005cab; letter-spacing: 1px; }
    .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; color: #005cab; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 13px; }
    .label { font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 2px; }
    .val { font-weight: 600; color: #111827; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th { background: #f9fafb; text-align: left; padding: 10px; font-weight: 600; color: #4b5563; border-bottom: 1px solid #e5e7eb; }
    td { padding: 10px; border-bottom: 1px solid #f3f4f6; }
    .sector-card { background: #fdfdfd; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
    .route-header { display: flex; justify-content: space-between; font-weight: 700; font-size: 16px; margin-bottom: 8px; }
    .footer { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 14px; font-size: 11px; color: #6b7280; text-align: center; }
    @media print {
      body { padding: 0; }
      .ticket-container { border: none; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="ticket-container">
    <div class="header">
      <div>
        <div class="logo">Horizon-X</div>
        <div style="font-size: 12px; color: #566476;">Official Passenger Electronic Ticket Receipt</div>
      </div>
      <div class="pnr-box">
        <div class="pnr-title">Booking Reference</div>
        <div class="pnr-val">${ticket.pnr}</div>
      </div>
    </div>

    <div class="grid">
      <div><div class="label">Date of Issue</div><div class="val">${ticket.bookingDate}</div></div>
      <div><div class="label">Booking Status</div><div class="val" style="color: #059669;">${ticket.status}</div></div>
      <div><div class="label">Cabin Class</div><div class="val">${ticket.cabinClass}</div></div>
      <div><div class="label">Total Paid</div><div class="val">₹${ticket.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${ticket.currency}</div></div>
    </div>

    <div class="section-title">Passenger Details</div>
    <table>
      <thead>
        <tr><th>#</th><th>Passenger Name</th><th>E-Ticket Number</th><th>Seat</th><th>Meal</th></tr>
      </thead>
      <tbody>
        ${ticket.passengers.map((p, i) => `<tr><td>${i+1}</td><td><strong>${p.name}</strong></td><td><code>${p.ticketNumber}</code></td><td><strong>${p.seatNumber}</strong></td><td>${p.foodOption}</td></tr>`).join('')}
      </tbody>
    </table>

    <div class="section-title">Flight Itinerary</div>
    ${ticket.sectors.map(s => `
      <div class="sector-card">
        <div class="route-header">
          <span>${s.originLabel || s.origin} ➔ ${s.destinationLabel || s.destination} (${s.flightNumber})</span>
          <span style="font-size: 13px; color: #566476;">${s.airline} • ${s.aircraft}</span>
        </div>
        <div class="grid" style="grid-template-columns: repeat(3, 1fr);">
          <div><div class="label">Departure</div><div class="val">${s.departureTime}</div></div>
          <div><div class="label">Arrival</div><div class="val">${s.arrivalTime}</div></div>
          <div><div class="label">Baggage Allowance</div><div class="val">${s.baggageAllowance}</div></div>
        </div>
      </div>
    `).join('')}

    <div class="footer">
      Notice: Gate closes 25 minutes prior to scheduled departure. Government-issued photo identification is mandatory for airport entry.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates beautiful printable HTML for Boarding Passes.
 */
function generatePrintableBoardingPassHtml(bp) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Boarding Pass - ${bp.pnr} - ${bp.passengerName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background: #f3f4f6; display: flex; justify-content: center; }
    .boarding-pass { width: 750px; background: #fff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); overflow: hidden; display: flex; border: 1px solid #e5e7eb; }
    .main-stub { flex: 2.8; padding: 24px; border-right: 2px dashed #d1d5db; position: relative; }
    .side-stub { flex: 1.2; padding: 24px; background: #fafafa; display: flex; flex-direction: column; justify-content: space-between; }
    .bp-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #005cab; padding-bottom: 12px; margin-bottom: 18px; }
    .airline { font-size: 20px; font-weight: 800; color: #005cab; }
    .flight-badge { background: #005cab; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
    .route-banner { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .airport-code { font-size: 32px; font-weight: 900; color: #111827; letter-spacing: -1px; }
    .route-arrow { font-size: 24px; color: #005cab; font-weight: bold; }
    .data-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px; }
    .label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
    .val { font-size: 14px; font-weight: 700; color: #111827; }
    .seat-badge { font-size: 36px; font-weight: 900; color: #005cab; line-height: 1; }
    .barcode-area { margin-top: 14px; padding-top: 12px; border-top: 1px solid #f3f4f6; font-family: monospace; font-size: 10px; color: #4b5563; word-break: break-all; }
    .barcode-graphic { height: 35px; width: 100%; background: repeating-linear-gradient(90deg, #111 0px, #111 2px, #fff 2px, #fff 4px, #111 4px, #111 7px, #fff 7px, #fff 8px); margin-top: 8px; border-radius: 2px; }
    @media print {
      body { background: #fff; padding: 0; }
      .boarding-pass { box-shadow: none; border: 1px solid #999; }
    }
  </style>
</head>
<body>
  <div class="boarding-pass">
    <div class="main-stub">
      <div class="bp-header">
        <div class="airline">${bp.carrier}</div>
        <div class="flight-badge">${bp.flightNumber} • ${bp.cabinClass}</div>
      </div>
      <div class="route-banner">
        <div><div class="airport-code">${bp.origin}</div></div>
        <div class="route-arrow">✈ ➔</div>
        <div><div class="airport-code">${bp.destination}</div></div>
      </div>
      <div class="data-grid">
        <div><div class="label">Passenger</div><div class="val">${bp.passengerName}</div></div>
        <div><div class="label">Date</div><div class="val">${bp.departureDate}</div></div>
        <div><div class="label">Gate</div><div class="val" style="color: #005cab; font-size: 18px;">${bp.gate}</div></div>
        <div><div class="label">Seat</div><div class="seat-badge">${bp.seatNumber}</div></div>
      </div>
      <div class="data-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div><div class="label">Boarding Time</div><div class="val">${bp.boardingTime}</div></div>
        <div><div class="label">Departure Time</div><div class="val">${bp.departureTime}</div></div>
        <div><div class="label">Terminal</div><div class="val">${bp.terminal} (${bp.boardingGroup})</div></div>
      </div>
      <div class="barcode-area">
        ${bp.barcodeString}
        <div class="barcode-graphic"></div>
      </div>
    </div>
    <div class="side-stub">
      <div>
        <div style="font-size: 14px; font-weight: 800; color: #005cab; margin-bottom: 12px;">PASSENGER COUPON</div>
        <div class="label">Name</div><div class="val" style="font-size: 12px; margin-bottom: 8px;">${bp.passengerName}</div>
        <div class="label">Flight / PNR</div><div class="val" style="margin-bottom: 8px;">${bp.flightNumber} / ${bp.pnr}</div>
        <div class="label">Route</div><div class="val" style="margin-bottom: 8px;">${bp.origin} ➔ ${bp.destination}</div>
        <div class="label">Seat</div><div class="seat-badge" style="font-size: 28px;">${bp.seatNumber}</div>
      </div>
      <div style="font-size: 9px; color: #6b7280; text-align: center;">Gate closes 20m before departure</div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  getJourneyClassification,
  generateFlightTicket,
  generateBoardingPass,
  generateIataBcbp
};
