const crypto = require('crypto');

// Aviation charset excluding ambiguous characters (0, O, 1, I)
const PNR_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generates an aviation-compliant 6-character PNR code.
 * Example: "HX7K9B"
 */
function generatePNR() {
  const bytes = crypto.randomBytes(6);
  let pnr = '';
  for (let i = 0; i < 6; i++) {
    pnr += PNR_CHARSET[bytes[i] % PNR_CHARSET.length];
  }
  return pnr;
}

/**
 * Generates an IATA-style 13-digit E-Ticket Number.
 * Format: "098-XXXXXXXXXX" (098 = Horizon-X Airline Accounting Code)
 */
function generateTicketNumber() {
  const digits = Math.floor(1000000000 + Math.random() * 9000000000);
  return `098-${digits}`;
}

module.exports = { generatePNR, generateTicketNumber };
