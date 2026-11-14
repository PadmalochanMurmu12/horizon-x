const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { AIRLINE_LOGOS_B64 } = require('../utils/airlineLogosBase64');

// Pre-load local Inter WOFF2 fonts (both Latin and Latin-Extended subsets) into Base64 so Headless Chrome
// renders true vector fonts without depending on external network or DNS resolution.
// Latin-Extended ensures currency glyphs like the Indian Rupee (₹ U+20B9) render in pure Inter without Segoe UI fallback.
let EMBEDDED_FONTS_CSS = '';
try {
  const fontDir = path.join(__dirname, '../node_modules/@fontsource/inter/files');
  if (fs.existsSync(fontDir)) {
    const weights = [400, 600, 700, 800, 900];
    let cssAcc = '';
    for (const w of weights) {
      const pLatin = path.join(fontDir, `inter-latin-${w}-normal.woff2`);
      const pExt = path.join(fontDir, `inter-latin-ext-${w}-normal.woff2`);
      if (fs.existsSync(pLatin)) {
        const bLatin = fs.readFileSync(pLatin).toString('base64');
        cssAcc += `
          @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: ${w};
            font-display: swap;
            src: url(data:font/woff2;base64,${bLatin}) format('woff2');
            unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
          }
        `;
      }
      if (fs.existsSync(pExt)) {
        const bExt = fs.readFileSync(pExt).toString('base64');
        cssAcc += `
          @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: ${w};
            font-display: swap;
            src: url(data:font/woff2;base64,${bExt}) format('woff2');
            unicode-range: U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;
          }
        `;
      }
    }
    EMBEDDED_FONTS_CSS = cssAcc;
  }
} catch (e) {
  console.warn('Could not pre-load base64 Inter font files:', e.message);
}

const AIRPORT_DIRECTORY = {
  DEL: { city: 'Delhi', name: 'Indira Gandhi International Airport', terminal: 'Terminal 3', shortTerm: 'T3' },
  BLR: { city: 'Bengaluru', name: 'Kempegowda International Airport', terminal: 'Terminal 2', shortTerm: 'T2' },
  BOM: { city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj Intl Airport', terminal: 'Terminal 2', shortTerm: 'T2' },
  MAA: { city: 'Chennai', name: 'Chennai International Airport', terminal: 'Terminal 1', shortTerm: 'T1' },
  CCU: { city: 'Kolkata', name: 'Netaji Subhash Chandra Bose Intl Airport', terminal: 'Terminal 2', shortTerm: 'T2' },
  HYD: { city: 'Hyderabad', name: 'Rajiv Gandhi International Airport', terminal: 'Terminal 1', shortTerm: 'T1' },
  AMD: { city: 'Ahmedabad', name: 'Sardar Vallabhbhai Patel Intl Airport', terminal: 'Terminal 1', shortTerm: 'T1' },
  GOI: { city: 'Goa (Dabolim)', name: 'Dabolim Airport', terminal: 'Terminal 1', shortTerm: 'T1' },
  GOX: { city: 'Goa (Mopa)', name: 'Manohar International Airport', terminal: 'Terminal 1', shortTerm: 'T1' },
  COK: { city: 'Kochi', name: 'Cochin International Airport', terminal: 'Terminal 3', shortTerm: 'T3' },
  PNQ: { city: 'Pune', name: 'Pune Airport', terminal: 'Terminal 1', shortTerm: 'T1' },
  JAI: { city: 'Jaipur', name: 'Jaipur International Airport', terminal: 'Terminal 2', shortTerm: 'T2' },
  LKO: { city: 'Lucknow', name: 'Chaudhary Charan Singh Intl Airport', terminal: 'Terminal 3', shortTerm: 'T3' },
  GAU: { city: 'Guwahati', name: 'Lokpriya Gopinath Bordoloi Intl Airport', terminal: 'Terminal 1', shortTerm: 'T1' }
};

const ICON_CHECK = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_PLANE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block; vertical-align:middle;"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
const ICON_DOT = `<svg width="6" height="6" viewBox="0 0 8 8" fill="currentColor" style="display:inline-block; vertical-align:middle; margin-right:4px;"><circle cx="4" cy="4" r="3"/></svg>`;

function getAirlineLogo(carrierCode, carrierName) {
  if (carrierCode && AIRLINE_LOGOS_B64[carrierCode.toUpperCase()]) {
    return AIRLINE_LOGOS_B64[carrierCode.toUpperCase()];
  }
  const name = String(carrierName || '').toLowerCase();
  const code = String(carrierCode || '').toUpperCase();
  if (name.includes('indiaone') || code === 'I7') return AIRLINE_LOGOS_B64['I7'];
  if (name.includes('indigo') || code === '6E') return AIRLINE_LOGOS_B64['6E'];
  if (name.includes('air india express') || code === 'IX') return AIRLINE_LOGOS_B64['IX'];
  if (name.includes('air india') || code === 'AI') return AIRLINE_LOGOS_B64['AI'];
  if (name.includes('akasa') || code === 'QP') return AIRLINE_LOGOS_B64['QP'];
  if (name.includes('spicejet') || name.includes('spice') || code === 'SG') return AIRLINE_LOGOS_B64['SG'];
  if (name.includes('star air') || code === 'S5') return AIRLINE_LOGOS_B64['S5'];
  return null;
}

function getSsrMealCode(mealStr) {
  if (!mealStr) return 'AVML';
  const m = mealStr.toLowerCase();
  if (m.includes('gluten')) return 'GFML';
  if (m.includes('non-veg')) return 'NVML';
  if (m.includes('asian')) return 'AVML';
  if (m.includes('vegan')) return 'VGML';
  if (m.includes('hindu')) return 'HNML';
  if (m.includes('veg')) return 'VGML';
  return 'AVML';
}

function formatCleanMealName(mealStr) {
  if (!mealStr) return 'Standard Meal';
  const m = String(mealStr).trim();
  if (m.toLowerCase().includes('gluten')) return 'Gluten-Free Meal';
  if (m.toLowerCase().includes('non-veg')) return 'Standard Non-Veg Meal';
  if (m.toLowerCase().includes('asian')) return 'Asian Vegetarian Meal';
  if (m.toLowerCase().includes('vegan')) return 'Vegan Meal';
  if (m.toLowerCase().includes('hindu')) return 'Hindu Meal';
  if (m.toLowerCase().includes('veg')) return 'Standard Vegetarian Meal';
  return m;
}

function cleanTimeDisplay(timeStr) {
  if (!timeStr) return '';
  return String(timeStr).replace(/\s*UTC/gi, '').trim();
}

function cleanIssueDate(dateStr) {
  if (!dateStr) return '12 Nov 2026';
  const clean = String(dateStr).replace(/\s*UTC/gi, '').trim();
  if (clean.includes(',')) return clean.split(',')[0].trim();
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return clean;
}

function calculateFlightTimes(timeStr) {
  let hours = 21;
  let mins = 10;
  if (timeStr) {
    const timeMatch = String(timeStr).match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      mins = parseInt(timeMatch[2], 10);
    }
  }
  const depTotal = hours * 60 + mins;
  const boardTotal = (depTotal - 45 + 1440) % 1440;
  const boardH = String(Math.floor(boardTotal / 60)).padStart(2, '0');
  const boardM = String(boardTotal % 60).padStart(2, '0');
  const boardingTime = `${boardH}:${boardM}`;

  const closeTotal = (depTotal - 20 + 1440) % 1440;
  const closeH = String(Math.floor(closeTotal / 60)).padStart(2, '0');
  const closeM = String(closeTotal % 60).padStart(2, '0');
  const gateCloseTime = `${closeH}:${closeM}`;

  const depH = String(hours).padStart(2, '0');
  const depM = String(mins).padStart(2, '0');
  const departureTime = `${depH}:${depM}`;

  return { departureTime, boardingTime, gateCloseTime };
}

function generateSvgBarcode(code, width = 380, height = 42) {
  const str = String(code || 'HX-1001-ETKT');
  const sequence = [2, 1, 1, 2, 1];

  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    sequence.push((charCode % 3) + 1);
    sequence.push(((charCode >> 1) % 2) + 1);
    sequence.push(((charCode >> 2) % 3) + 1);
    sequence.push(((charCode >> 3) % 2) + 1);
  }
  sequence.push(2, 3, 2, 1, 2);

  const totalUnits = sequence.reduce((acc, val) => acc + val, 0);
  const unitWidth = width / totalUnits;

  let currentX = 0;
  let isBar = true;
  let rects = '';

  for (let i = 0; i < sequence.length; i++) {
    const barW = sequence[i] * unitWidth;
    if (isBar) {
      rects += `<rect x="${currentX.toFixed(2)}" y="0" width="${barW.toFixed(2)}" height="${height}" fill="#0f172a" />`;
    }
    currentX += barW;
    isBar = !isBar;
  }

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">${rects}</svg>`;
}

function generate2DMatrixBarcodeSvg(dataString, width = 64, height = 64) {
  const str = String(dataString || 'M1TRAVELER/NAME');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  
  const gridSize = 27;
  const moduleSize = width / gridSize;
  const center = Math.floor(gridSize / 2);
  
  let rects = '';
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const dist = Math.max(Math.abs(r - center), Math.abs(c - center));
      let isDark = false;
      if (dist === 0 || dist === 2 || dist === 4) {
        isDark = true;
      } else if (dist === 1 || dist === 3) {
        isDark = false;
      } else {
        const pseudoBit = Math.sin(r * 12.9898 + c * 78.233 + (hash % 1000)) * 43758.5453;
        isDark = (pseudoBit - Math.floor(pseudoBit)) > 0.46;
      }
      if (isDark) {
        rects += `<rect x="${(c * moduleSize).toFixed(2)}" y="${(r * moduleSize).toFixed(2)}" width="${moduleSize.toFixed(2)}" height="${moduleSize.toFixed(2)}" fill="#0f172a" />`;
      }
    }
  }
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="display: block; background: #ffffff; border-radius: 4px; padding: 2px;">${rects}</svg>`;
}

// Singleton Playwright Browser
let browserInstance = null;

async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    const candidatePaths = [
      process.env.CHROME_BIN,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser'
    ];
    let execPath = candidatePaths.find(p => p && fs.existsSync(p));

    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    };
    if (execPath) {
      launchOptions.executablePath = execPath;
    }

    browserInstance = await chromium.launch(launchOptions);
  }
  return browserInstance;
}

function buildTicketHtml(ticket) {
  const pnr = ticket.pnr || 'SK79WQ';
  const passengers = ticket.passengers || [];
  const primaryPax = passengers[0] || {};
  const sectors = ticket.sectors || [];
  const primarySector = sectors[0] || {};

  const originCode = (primarySector.origin || primarySector.originAirportCode || 'DEL').toUpperCase();
  const destCode = (primarySector.destination || primarySector.destinationAirportCode || 'BLR').toUpperCase();

  const originInfo = AIRPORT_DIRECTORY[originCode] || { city: primarySector.originCity || 'Delhi', name: 'Indira Gandhi Intl Airport', terminal: 'Terminal 3', shortTerm: 'T3' };
  const destInfo = AIRPORT_DIRECTORY[destCode] || { city: primarySector.destinationCity || 'Bengaluru', name: 'Kempegowda Intl Airport', terminal: 'Terminal 2', shortTerm: 'T2' };

  const flightNo = primarySector.flightNumber || 'SK-402';
  const airline = primarySector.airline || 'Skybound Wings';
  const airlineCode = primarySector.airlineCode || flightNo.split('-')[0] || 'SK';
  const aircraft = primarySector.aircraft || 'Airbus A321neo';
  const cabin = ticket.cabinClass || 'ECONOMY';
  const fareBasis = ticket.fareBasis || primarySector.fareBasis || 'YFLX26 / Standard Saver';
  const ticketNo = primaryPax.ticketNumber || ticket.eTicketNumber || '402-9823410921-01';
  const agencyBookingId = ticket.agencyBookingId || `SKY-2026-${pnr}920`;
  const issueDateOnly = cleanIssueDate(ticket.issueDate || ticket.bookingDate || '12 Nov 2026');

  const rawDep = primarySector.departureTime || '15 Nov 2026, 06:30';
  const rawArr = primarySector.arrivalTime || '15 Nov 2026, 09:15';
  const depTime = cleanTimeDisplay(rawDep);
  const arrTime = cleanTimeDisplay(rawArr);
  const duration = primarySector.durationMinutes ? `${Math.floor(primarySector.durationMinutes / 60)}h ${primarySector.durationMinutes % 60}m` : '2h 45m';

  const paxLegalName = primaryPax.legalName || `${primaryPax.lastName?.toUpperCase() || 'RIVERA'} / ${primaryPax.firstName?.toUpperCase() || 'ALEX'} ${primaryPax.gender === 'FEMALE' ? 'MS' : 'MR'}`;
  const paxType = primaryPax.passengerType || (primaryPax.age && primaryPax.age < 12 ? 'CHD (Child)' : 'ADT (Adult / 18+)');
  const contactEmail = ticket.contactInfo?.email || 'alex.rivera@example.com';
  const contactPhone = ticket.contactInfo?.phone || '+91 9876543210';
  const seatAssigned = primaryPax.seatNumber || primaryPax.seatNo || '14A (Window)';
  const fullMealName = formatCleanMealName(primaryPax.foodOption || primaryPax.mealPreference || 'Gluten-Free Meal');

  const totalAmountNum = Number(ticket.totalAmount || 8088.00);
  const isUsd = totalAmountNum < 1000;
  const currencySymbol = isUsd ? '$' : '₹';
  const currencyCode = isUsd ? 'USD' : 'INR';

  const platformFeeNum = Number(ticket.fareBreakdown?.platformFee || ticket.platformFee || (isUsd ? 8.50 : 250.00));
  const baseFareNum = Number(ticket.fareBreakdown?.baseFare || (totalAmountNum - platformFeeNum));

  const baseFareFormatted = baseFareNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const platformFeeFormatted = platformFeeNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalAmountFormatted = totalAmountNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const airlineLogoB64 = getAirlineLogo(airlineCode, airline);
  const barcodeSvg = generateSvgBarcode(`*HX-${pnr}-${ticketNo}*`, 380, 42);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>E-Ticket Receipt - ${pnr}</title>
  <style>
    ${EMBEDDED_FONTS_CSS}
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      background: #ffffff;
      color: #1b1c1c;
      padding: 30px 38px 24px 38px;
      font-size: 11px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <!-- Header Branding -->
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #005cab; padding-bottom: 14px; margin-bottom: 16px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      ${airlineLogoB64 
        ? `<img src="${airlineLogoB64}" style="height: 38px; width: auto; max-width: 120px; object-fit: contain; border-radius: 6px; flex-shrink: 0;" alt="${airline}" />`
        : `<div style="width: 38px; height: 38px; border-radius: 8px; background: #005cab; color: #ffffff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
             <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
           </div>`
      }
      <div>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
          <span style="font-size: 22px; font-weight: 900; color: #005cab; letter-spacing: 0; white-space: nowrap;">Horizon-X</span>
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 3px 10px; border-radius: 6px; background: #F2F8FF; color: #005cab; border: 1px solid #d3e1f6; white-space: nowrap; flex-shrink: 0;">${airline} (${airlineCode})</span>
        </div>
        <div style="font-size: 11px; font-weight: 600; color: #566476; margin-top: 2px;">
          Official Electronic Ticket Receipt &amp; Tax Invoice
        </div>
      </div>
    </div>
    <div style="text-align: right; flex-shrink: 0;">
      <span style="display: inline-flex; align-items: center; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 5px 12px; border-radius: 6px; white-space: nowrap; flex-shrink: 0; line-height: 1;">
        ${ICON_CHECK} CONFIRMED (PAID)
      </span>
    </div>
  </div>

  <!-- 1. Booking & Identification Numbers Grid -->
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #F2F8FF; border: 1px solid #d3e1f6; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px;">
    <div>
      <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #566476; letter-spacing: 0.5px;">Booking Ref (PNR)</div>
      <div style="font-size: 18px; font-weight: 900; color: #005cab; font-variant-numeric: tabular-nums; letter-spacing: 1px; margin-top: 2px;">${pnr}</div>
    </div>
    <div>
      <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #566476; letter-spacing: 0.5px;">E-Ticket Number</div>
      <div style="font-size: 12px; font-weight: 800; color: #1b1c1c; font-variant-numeric: tabular-nums; margin-top: 4px;">${ticketNo}</div>
    </div>
    <div>
      <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #566476; letter-spacing: 0.5px;">Agency Booking ID</div>
      <div style="font-size: 12px; font-weight: 700; color: #1b1c1c; font-variant-numeric: tabular-nums; margin-top: 4px;">${agencyBookingId}</div>
    </div>
    <div>
      <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #566476; letter-spacing: 0.5px;">Issue Date</div>
      <div style="font-size: 12px; font-weight: 700; color: #1b1c1c; margin-top: 4px;">${issueDateOnly}</div>
    </div>
  </div>

  <!-- 2. Passenger Identification Details -->
  <div style="margin-bottom: 16px;">
    <div style="font-size: 11px; font-weight: 800; color: #005cab; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
      1. Passenger Details
    </div>
    <div style="display: grid; grid-template-columns: 1.2fr 1fr 1.2fr; gap: 14px; background: #fbf9f8; border: 1px solid #E6E6E6; border-radius: 8px; padding: 10px 16px;">
      <div>
        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #566476;">Full Legal Name</div>
        <div style="font-size: 13px; font-weight: 800; color: #1b1c1c; margin-top: 2px;">${paxLegalName}</div>
        <div style="font-size: 9px; color: #005cab; font-weight: 600; margin-top: 1px;">Govt ID Verified</div>
      </div>
      <div>
        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #566476;">Passenger Type</div>
        <div style="font-size: 13px; font-weight: 700; color: #1b1c1c; margin-top: 2px;">${paxType}</div>
      </div>
      <div>
        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #566476;">Contact Information</div>
        <div style="font-size: 11px; font-weight: 600; color: #1b1c1c; margin-top: 2px;">${contactEmail}</div>
        <div style="font-size: 11px; font-variant-numeric: tabular-nums; color: #566476; margin-top: 1px;">${contactPhone}</div>
      </div>
    </div>
  </div>

  <!-- 3. Flight Itinerary -->
  <div style="margin-bottom: 16px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <div style="font-size: 11px; font-weight: 800; color: #005cab; text-transform: uppercase; letter-spacing: 0.5px;">
        2. Flight Itinerary &amp; Timetable
      </div>
      <span style="display: inline-flex; align-items: center; font-size: 10px; font-weight: 800; background: #d3e1f6; color: #005cab; padding: 4px 10px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; line-height: 1;">
        ${ICON_DOT} CONFIRMED / OK
      </span>
    </div>

    <div style="border: 1px solid #E6E6E6; border-radius: 10px; padding: 14px 18px; background: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E6E6E6; padding-bottom: 8px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${airlineLogoB64 ? `<img src="${airlineLogoB64}" style="height: 20px; width: auto; object-fit: contain; border-radius: 4px; flex-shrink: 0;" alt="${airline}" />` : ''}
          <span style="font-size: 12px; font-weight: 800; color: #005cab; white-space: nowrap;">Flight ${flightNo}</span>
          <span style="font-size: 11px; font-weight: 700; color: #1b1c1c; white-space: nowrap;">${aircraft}</span>
          <span style="font-size: 10px; color: #566476; white-space: nowrap;">• Operated by ${airline}</span>
        </div>
        <div style="font-size: 10px; color: #566476; white-space: nowrap; flex-shrink: 0;">
          Cabin: <strong style="color: #1b1c1c;">${cabin} (${fareBasis})</strong>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
        <!-- Origin -->
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 32px; font-weight: 900; color: #1b1c1c; line-height: 1;">${originCode}</div>
          <div style="font-size: 13px; font-weight: 800; color: #1b1c1c; margin-top: 4px; padding: 2px 0;">${originInfo.city}</div>
          <div style="font-size: 11px; color: #566476; margin-top: 1px; line-height: 1.3;">${originInfo.name}</div>
          <div style="font-size: 13px; font-weight: 800; color: #005cab; margin-top: 6px;">${depTime}</div>
          <div style="display: inline-block; font-size: 10px; font-weight: 800; color: #005cab; background: #e0f2fe; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 4px; margin-top: 5px; white-space: nowrap;">
            ${originInfo.terminal || 'Terminal 3'} (Departure)
          </div>
        </div>

        <!-- Journey Indicator -->
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 10px; flex-shrink: 0;">
          <div style="font-size: 10px; font-weight: 700; color: #525f71; white-space: nowrap;">${duration} • Non-Stop</div>
          <div style="display: flex; align-items: center; width: 100%; max-width: 140px; margin: 6px 0;">
            <div style="height: 2px; flex: 1; background: #c0c7d6;"></div>
            <div style="color: #005cab; margin: 0 4px; display: flex; align-items: center;">${ICON_PLANE}</div>
            <div style="height: 2px; flex: 1; background: #c0c7d6;"></div>
          </div>
          <div style="font-size: 9px; color: #047857; font-weight: 700; white-space: nowrap;">Direct Flight</div>
        </div>

        <!-- Destination -->
        <div style="flex: 1; min-width: 0; text-align: right;">
          <div style="font-size: 32px; font-weight: 900; color: #1b1c1c; line-height: 1;">${destCode}</div>
          <div style="font-size: 13px; font-weight: 800; color: #1b1c1c; margin-top: 4px; padding: 2px 0;">${destInfo.city}</div>
          <div style="font-size: 11px; color: #566476; margin-top: 1px; line-height: 1.3;">${destInfo.name}</div>
          <div style="font-size: 13px; font-weight: 800; color: #005cab; margin-top: 6px;">${arrTime}</div>
          <div style="display: inline-block; font-size: 10px; font-weight: 800; color: #005cab; background: #e0f2fe; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 4px; margin-top: 5px; white-space: nowrap;">
            ${destInfo.terminal || 'Terminal 2'} (Arrival)
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 4. Baggage & Seating Assignment -->
  <div style="margin-bottom: 16px;">
    <div style="font-size: 11px; font-weight: 800; color: #005cab; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
      3. Baggage &amp; Seating Assignment
    </div>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
      <div style="border: 1px solid #E6E6E6; border-radius: 8px; padding: 8px 12px; background: #fbf9f8;">
        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #566476;">Checked Baggage</div>
        <div style="font-size: 12px; font-weight: 800; color: #1b1c1c; margin-top: 2px;">1 Piece (15 kg)</div>
        <div style="font-size: 9px; color: #047857; font-weight: 700;">Included with Fare</div>
      </div>
      <div style="border: 1px solid #E6E6E6; border-radius: 8px; padding: 8px 12px; background: #fbf9f8;">
        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #566476;">Carry-On Baggage</div>
        <div style="font-size: 12px; font-weight: 800; color: #1b1c1c; margin-top: 2px;">7 kg + Personal Item</div>
        <div style="font-size: 9px; color: #566476;">Standard Overhead Bin</div>
      </div>
      <div style="border: 1px solid #E6E6E6; border-radius: 8px; padding: 8px 12px; background: #fbf9f8;">
        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #566476;">Seat Assigned</div>
        <div style="font-size: 13px; font-weight: 900; color: #005cab; margin-top: 2px;">${seatAssigned}</div>
        <div style="font-size: 9px; color: #566476;">Standard Pitch / Forward</div>
      </div>
      <div style="border: 1px solid #E6E6E6; border-radius: 8px; padding: 8px 12px; background: #fbf9f8;">
        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #566476;">Meal Preference</div>
        <div style="font-size: 12px; font-weight: 800; color: #1b1c1c; margin-top: 2px;">${fullMealName}</div>
        <div style="font-size: 9px; color: #047857; font-weight: 700; display: flex; align-items: center;">${ICON_CHECK} Confirmed with Catering</div>
      </div>
    </div>
  </div>

  <!-- 5. Fare & Payment Breakdown -->
  <div style="margin-bottom: 16px;">
    <div style="font-size: 11px; font-weight: 800; color: #005cab; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
      4. Fare &amp; Payment Breakdown
    </div>
    <div style="display: grid; grid-template-columns: 7fr 5fr; gap: 16px; background: #fbf9f8; border: 1px solid #E6E6E6; border-radius: 10px; padding: 14px 18px;">
      <div style="font-size: 11px; color: #1b1c1c;">
        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #E6E6E6;">
          <span>Air Transportation Base Fare</span>
          <span style="font-weight: 800;">${currencySymbol}${baseFareFormatted}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #E6E6E6;">
          <span>Convenience &amp; Platform Fee (Admin Capped)</span>
          <span style="font-weight: 800;">${currencySymbol}${platformFeeFormatted}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #E6E6E6; color: #566476;">
          <span>Seat Selection</span>
          <span style="font-weight: 700; color: #047857;">Included (${currencySymbol}0.00)</span>
        </div>
        <div style="font-size: 9px; color: #566476; margin-top: 6px; font-style: italic;">
          Fare Basis: ${fareBasis} | Non-endorsable. Re-issue and changes eligible up to 24h prior to departure.
        </div>
      </div>

      <div style="border-left: 1px solid #E6E6E6; padding-left: 20px; display: flex; flex-direction: column; justify-content: center;">
        <div>
          <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #566476;">Total Amount Invoiced</div>
          <div style="font-size: 26px; font-weight: 900; color: #005cab; margin: 4px 0;">
            ${currencySymbol}${totalAmountFormatted} <span style="font-size: 12px; font-weight: 800; color: #1b1c1c;">${currencyCode}</span>
          </div>
          <div style="display: inline-flex; align-items: center; font-size: 10px; font-weight: 800; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 4px; margin-top: 4px; white-space: nowrap;">
            ${ICON_CHECK} PAID IN FULL
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 6. Legal & Regulatory Notices -->
  <div style="border-top: 1px solid #E6E6E6; padding-top: 10px; font-size: 9px; color: #566476; line-height: 1.4;">
    <div style="font-weight: 800; color: #1b1c1c; text-transform: uppercase; font-size: 8.5px; margin-bottom: 2px;">
      Notice of Carriage Conditions &amp; Montreal Convention 1999:
    </div>
    <div>
      Air carriage is subject to the conditions of carriage and liability rules established by the Montreal Convention 1999. Valid for travel for 1 year from date of issue. Baggage claims must be reported within codified limits.
    </div>
    <div style="display: flex; gap: 14px; margin-top: 4px; font-weight: 700; color: #1b1c1c; white-space: nowrap;">
      <span>• Check-in counters close 60 mins before departure</span>
      <span>• Lithium batteries in carry-on only</span>
      <span>• Government Photo ID mandatory</span>
    </div>
  </div>

  <!-- Scannable 1D Barcode Strip -->
  <div style="margin-top: 14px; border-top: 1px dashed #c0c7d6; padding-top: 10px; text-align: center;">
    <div style="margin: 0 auto; display: flex; justify-content: center;">
      ${barcodeSvg}
    </div>
  </div>
</body>
</html>`;
}

function buildBoardingPassHtml(bp) {
  const pnr = bp.pnr || 'SK79WQ';
  const rawPaxName = bp.passengerName || 'RIVERA / ALEX MR';
  const passengerName = String(rawPaxName).toUpperCase();
  const carrier = bp.carrier || 'Skybound Wings';
  const flightNumber = bp.flightNumber || 'SK-402';
  const carrierCode = (bp.carrierCode || flightNumber.split('-')[0] || 'SK').toUpperCase();
  const carrierBrand = carrier.replace(/\s*\([A-Z0-9]+\)/gi, '').trim();

  const originCode = (bp.origin || 'DEL').toUpperCase();
  const destCode = (bp.destination || 'BLR').toUpperCase();

  const originInfo = AIRPORT_DIRECTORY[originCode] || { city: bp.originCity || 'Delhi', name: 'Delhi / T3', terminal: 'Terminal 3', shortTerm: 'T3' };
  const destInfo = AIRPORT_DIRECTORY[destCode] || { city: bp.destinationCity || 'Bengaluru', name: 'Bengaluru / T2', terminal: 'Terminal 2', shortTerm: 'T2' };

  const seatNumber = bp.seatNumber || '14A';
  const cabinClass = (bp.cabinClass || 'ECONOMY').toUpperCase();
  const flightTimes = calculateFlightTimes(bp.departureTime || bp.scheduledDeparture || '21:10');
  const departureDate = cleanIssueDate(bp.departureDate || '12 Oct 2026');
  const boardingTime = flightTimes.boardingTime;
  const gateCloseTime = flightTimes.gateCloseTime;
  const terminal = bp.terminal || originInfo.terminal || 'Terminal 3';
  const gate = bp.gate || '18B';
  const boardingGroup = bp.boardingGroup || 'ZONE 2';
  const seqNumber = bp.seqNumber || '0042';
  const ticketNumber = bp.ticketNumber || '402-9823410921';
  const foodOption = bp.foodOption || bp.mealPreference || 'Gluten-Free Meal';
  const cleanMeal = formatCleanMealName(foodOption);
  const ssrMealCode = bp.ssrCode || getSsrMealCode(foodOption);
  
  // Clean single bag tag reference (prevent duplicate CABIN: 7KG)
  const rawBagTag = bp.baggageTag || `SK-${Math.floor(100000 + Math.random() * 900000)}`;
  const bagTagRef = String(rawBagTag).replace(/\s*•\s*CABIN:\s*\d+KG/gi, '').trim();

  const airlineLogoB64 = getAirlineLogo(carrierCode, carrier);

  const cleanPnr = pnr.padEnd(7, ' ').substring(0, 7);
  const cleanFlight = String(flightNumber).replace(/[^0-9]/g, '').padStart(4, '0').substring(0, 4);
  const bcbpCode = bp.barcodeString || `M1${passengerName.padEnd(20, ' ').substring(0, 20)}E${cleanPnr} ${originCode}${destCode}${carrierCode.padEnd(3, ' ')} ${cleanFlight} 285Y0${seatNumber}0042 147>2180`;

  const barcode2DSvg = generate2DMatrixBarcodeSvg(bcbpCode, 64, 64);
  const stubBarcode1DSvg = generateSvgBarcode(`${carrierCode} ${ticketNumber.replace(/[^0-9]/g, '').substring(0, 10)} ${seatNumber}`, 180, 32);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Boarding Pass - ${pnr} - ${passengerName}</title>
  <style>
    ${EMBEDDED_FONTS_CSS}
    @page {
      size: 840px 395px;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      background: #ffffff;
      margin: 0;
      padding: 0;
      width: 840px;
      height: 395px;
      font-size: 11px;
      line-height: 1.4;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div style="width: 840px; height: 395px; display: flex; background: #ffffff; border-radius: 12px; border: 1.5px solid #d1d5db; overflow: hidden; position: relative;">
    
    <!-- Top Accent Stripe -->
    <div style="position: absolute; top: 0; left: 0; right: 0; height: 5px; background: #005cab;"></div>

    <!-- 1. MAIN CARRIER BOARDING PASS PORTION (LEFT - 68%) -->
    <div style="flex: 2.4; padding: 20px 24px 16px 24px; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #E6E6E6; padding-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          ${airlineLogoB64 
            ? `<img src="${airlineLogoB64}" style="height: 32px; width: auto; max-width: 110px; object-fit: contain; border-radius: 4px; flex-shrink: 0;" alt="${carrier}" />`
            : `<div style="width: 36px; height: 36px; border-radius: 8px; background: #005cab; color: #ffffff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
               </div>`
          }
          <div>
            <div style="font-size: 14px; font-weight: 900; color: #005cab; letter-spacing: 0.2px; white-space: nowrap;">${carrier.toUpperCase()}</div>
            <div style="font-size: 9.5px; font-weight: 700; color: #1b1c1c; white-space: nowrap; margin-top: 2px;">FLIGHT ${flightNumber} • ${departureDate}</div>
          </div>
        </div>

        <!-- Security & Priority Badges -->
        <div style="display: flex; gap: 6px; align-items: center; flex-shrink: 0;">
          <span style="display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; background: #005cab; color: #ffffff; padding: 4px 10px; border-radius: 4px; line-height: 1; white-space: nowrap; flex-shrink: 0;">DOCS OK</span>
          <span style="display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; background: #d3e1f6; color: #005cab; padding: 4px 10px; border-radius: 4px; line-height: 1; white-space: nowrap; flex-shrink: 0;">SKY PRIORITY</span>
          <span style="display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; background: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 4px; line-height: 1; white-space: nowrap; flex-shrink: 0;">SSR: ${ssrMealCode}</span>
        </div>
      </div>

      <!-- Passenger Identifiers & Route Banner -->
      <div style="margin: 10px 0;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
          <div>
            <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #566476; letter-spacing: 0.5px;">Passenger Name</div>
            <div style="font-size: 18px; font-weight: 900; color: #1b1c1c; line-height: 1.2; padding-top: 2px;">${passengerName}</div>
          </div>
          <div style="text-align: right; font-size: 10.5px; flex-shrink: 0;">
            <span style="color: #566476;">E-Ticket:</span> <strong style="color: #1b1c1c; font-variant-numeric: tabular-nums;">${ticketNumber}</strong>
            <span style="margin-left: 8px; color: #566476;">PNR:</span> <strong style="color: #005cab; font-size: 13px; font-variant-numeric: tabular-nums; letter-spacing: 0.5px;">${pnr}</strong>
          </div>
        </div>

        <!-- Clean Route Box -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: #F2F8FF; border: 1px solid #d3e1f6; border-radius: 10px; padding: 12px 20px;">
          <div>
            <div style="font-size: 9px; font-weight: 800; color: #566476; text-transform: uppercase; letter-spacing: 0.5px;">ORIGIN</div>
            <div style="font-size: 32px; font-weight: 900; color: #1b1c1c; line-height: 1.1; margin: 2px 0;">${originCode}</div>
            <div style="font-size: 12px; font-weight: 800; color: #1b1c1c; margin-top: 2px;">${originInfo.city}</div>
            <div style="display: inline-block; font-size: 9px; font-weight: 800; color: #005cab; background: #e0f2fe; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 4px; margin-top: 4px; white-space: nowrap;">${originInfo.terminal}</div>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; padding: 0 10px; flex-shrink: 0;">
            <div style="font-size: 10px; font-weight: 800; color: #525f71; letter-spacing: 0.5px; white-space: nowrap;">NON-STOP</div>
            <div style="display: flex; align-items: center; gap: 6px; width: 120px; margin: 6px 0;">
              <div style="height: 2px; flex: 1; background: #005cab;"></div>
              <div style="color: #005cab; display: flex; align-items: center;">${ICON_PLANE}</div>
              <div style="height: 2px; flex: 1; background: #005cab;"></div>
            </div>
            <div style="font-size: 9.5px; font-weight: 700; color: #566476; white-space: nowrap;">2h 45m</div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 9px; font-weight: 800; color: #566476; text-transform: uppercase; letter-spacing: 0.5px;">DESTINATION</div>
            <div style="font-size: 32px; font-weight: 900; color: #1b1c1c; line-height: 1.1; margin: 2px 0;">${destCode}</div>
            <div style="font-size: 12px; font-weight: 800; color: #1b1c1c; margin-top: 2px;">${destInfo.city}</div>
            <div style="display: inline-block; font-size: 9px; font-weight: 800; color: #005cab; background: #e0f2fe; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 4px; margin-top: 4px; white-space: nowrap;">${destInfo.terminal}</div>
          </div>
        </div>
      </div>

      <!-- 4 High-Visibility Logistics Cards -->
      <div style="display: grid; grid-template-columns: 1fr 1.2fr 1fr 1fr; gap: 8px; margin-bottom: 8px;">
        <div style="background: #fbf9f8; border: 1px solid #E6E6E6; border-radius: 8px; padding: 6px 8px; text-align: center; min-height: 62px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <div style="font-size: 8px; font-weight: 800; color: #566476; text-transform: uppercase;">Boarding Gate</div>
          <div style="font-size: 20px; font-weight: 900; color: #1b1c1c; line-height: 1.1;">${gate}</div>
          <div style="font-size: 8.5px; font-weight: 700; color: #005cab; white-space: nowrap;">${terminal}</div>
        </div>

        <div style="background: #0075d7; color: #ffffff; border-radius: 8px; padding: 6px 8px; text-align: center; min-height: 62px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; opacity: 0.9;">Boarding Time</div>
          <div style="font-size: 20px; font-weight: 900; line-height: 1.1;">${boardingTime}</div>
          <div style="font-size: 8.5px; font-weight: 800; opacity: 0.95; white-space: nowrap;">Closes ${gateCloseTime}</div>
        </div>

        <div style="background: #fbf9f8; border: 1px solid #E6E6E6; border-radius: 8px; padding: 6px 8px; text-align: center; min-height: 62px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <div style="font-size: 8px; font-weight: 800; color: #566476; text-transform: uppercase;">Zone / Group</div>
          <div style="font-size: 18px; font-weight: 900; color: #525f71; line-height: 1.1;">${boardingGroup}</div>
          <div style="font-size: 8.5px; font-weight: 700; color: #566476;">SEQ ${seqNumber}</div>
        </div>

        <div style="background: #fbf9f8; border: 2px solid #005cab; border-radius: 8px; padding: 6px 8px; text-align: center; min-height: 62px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <div style="font-size: 8px; font-weight: 900; color: #005cab; text-transform: uppercase;">Seat</div>
          <div style="font-size: 20px; font-weight: 900; color: #005cab; line-height: 1.1;">${seatNumber}</div>
          <div style="font-size: 8px; font-weight: 700; color: #1b1c1c; white-space: nowrap; margin-top: 2px;">${cabinClass} / Win</div>
        </div>
      </div>

      <!-- Scannable 2D Aztec Barcode -->
      <div style="border-top: 1px solid #E6E6E6; padding-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="flex-shrink: 0; background: #1b1c1c; border-radius: 4px; padding: 2px;">
            ${barcode2DSvg}
          </div>
          <div style="font-size: 9px; color: #404754; line-height: 1.4;">
            <div style="font-weight: 800; color: #005cab;">SECURE ELECTRONIC BOARDING PASS</div>
            <div style="color: #1b1c1c; font-weight: 700; margin-top: 2px;">BAG TAG: ${bagTagRef} • CABIN: 7KG</div>
            <div style="color: #047857; font-weight: 700; margin-top: 1px; display: flex; align-items: center;">${ICON_CHECK} ${cleanMeal} (${ssrMealCode})</div>
          </div>
        </div>

        <div style="text-align: right; font-size: 9px; color: #566476; line-height: 1.3; flex-shrink: 0;">
          <div style="font-weight: 700; color: #1b1c1c;">Gate closes 20 min prior</div>
          <div style="color: #b45309; font-weight: 700;">Valid Govt Photo ID Required</div>
        </div>
      </div>

    </div>

    <!-- Perforation Line -->
    <div style="width: 1px; border-left: 2px dashed #cbd5e1; margin: 0; position: relative;"></div>

    <!-- 2. PASSENGER TEAR-OFF COUPON (RIGHT - 32%) -->
    <div style="flex: 1.1; background: #fbf9f8; padding: 20px 18px 16px 18px; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E6E6E6; padding-bottom: 8px; margin-bottom: 8px;">
          <span style="font-size: 14px; font-weight: 900; color: #005cab; white-space: nowrap;">${carrierBrand}</span>
          <span style="font-size: 9px; font-weight: 800; color: #005cab; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">FLIGHT STUB</span>
        </div>

        <div style="margin-bottom: 6px;">
          <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #566476;">Passenger</div>
          <div style="font-size: 12px; font-weight: 900; color: #1b1c1c; line-height: 1.3; padding: 1px 0;">${passengerName}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10px; margin-bottom: 6px;">
          <div>
            <span style="font-size: 8px; color: #566476; text-transform: uppercase; display: block;">Flight</span>
            <strong style="color: #1b1c1c;">${flightNumber}</strong>
          </div>
          <div>
            <span style="font-size: 8px; color: #566476; text-transform: uppercase; display: block;">Date</span>
            <strong style="color: #1b1c1c;">${departureDate}</strong>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10px; margin-bottom: 6px;">
          <div>
            <span style="font-size: 8px; color: #566476; text-transform: uppercase; display: block;">Route</span>
            <strong style="color: #1b1c1c; display: flex; align-items: center; gap: 2px;">
              ${originCode}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              ${destCode}
            </strong>
          </div>
          <div>
            <span style="font-size: 8px; color: #566476; text-transform: uppercase; display: block;">Gate</span>
            <strong style="color: #1b1c1c;">${gate}</strong>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #ffffff; border: 1px solid #E6E6E6; border-radius: 8px; padding: 6px 8px; min-height: 48px; margin-bottom: 6px;">
          <div>
            <div style="font-size: 8px; font-weight: 800; color: #005cab; text-transform: uppercase;">Seat</div>
            <div style="font-size: 18px; font-weight: 900; color: #005cab; line-height: 1.1;">${seatNumber}</div>
          </div>
          <div>
            <div style="font-size: 8px; font-weight: 800; color: #566476; text-transform: uppercase;">Boarding</div>
            <div style="font-size: 18px; font-weight: 900; color: #1b1c1c; line-height: 1.1;">${boardingTime}</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 9px; color: #566476;">
          <span>PNR: <strong style="color: #1b1c1c; font-variant-numeric: tabular-nums;">${pnr}</strong></span>
          <span>SEQ: <strong style="color: #1b1c1c; font-variant-numeric: tabular-nums;">${seqNumber}</strong></span>
          <span><strong>${boardingGroup}</strong></span>
        </div>
      </div>

      <div style="border-top: 1px solid #E6E6E6; padding-top: 8px; text-align: center;">
        <div style="margin: 0 auto; display: flex; justify-content: center;">
          ${stubBarcode1DSvg}
        </div>
      </div>

    </div>

  </div>
</body>
</html>`;
}

/**
 * Generates an authentic Vector PDF for E-Ticket via Headless Chromium.
 */
async function generateTicketPdfBuffer(ticket) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const html = buildTicketHtml(ticket);
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true
    });
    return pdfBuffer;
  } finally {
    await page.close();
  }
}

/**
 * Generates an authentic Vector PDF for Boarding Pass via Headless Chromium.
 */
async function generateBoardingPassPdfBuffer(bp) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const html = buildBoardingPassHtml(bp);
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const pdfBuffer = await page.pdf({
      width: '840px',
      height: '395px',
      printBackground: true,
      preferCSSPageSize: true
    });
    return pdfBuffer;
  } finally {
    await page.close();
  }
}

module.exports = {
  buildTicketHtml,
  buildBoardingPassHtml,
  generateTicketPdfBuffer,
  generateBoardingPassPdfBuffer
};
