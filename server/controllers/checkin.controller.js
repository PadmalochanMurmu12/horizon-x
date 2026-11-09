const { Booking, BookingPassenger } = require('../models');
const { generateBoardingPass, generateIataBcbp, getJourneyClassification } = require('../utils/document.generator');

/**
 * POST /api/checkin/web-checkin
 * Aviation Web Check-in Endpoint.
 * In this sandbox environment, web check-in is permitted immediately after ticket issuance
 * without enforcing the 48-hour restrictive window.
 *
 * Payload:
 * - Mandatory: pnr, lastName
 * - Optional: email, mobileLast4
 */
async function completeWebCheckin(req, res) {
  try {
    const { pnr, lastName, email, mobileLast4 } = req.body;

    // 1. Mandatory Validations
    if (!pnr || typeof pnr !== 'string' || !pnr.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Web Check-in error: Mandatory 6-character PNR code is required.'
      });
    }

    if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Web Check-in error: Passenger last name is mandatory for manifest clearance.'
      });
    }

    const formattedPnr = pnr.trim().toUpperCase();
    const formattedLastName = lastName.trim().toLowerCase();

    // 2. Fetch Authoritative Booking Record
    const booking = await Booking.findOne({
      where: { pnr: formattedPnr },
      include: [{ model: BookingPassenger, as: 'passengers' }]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: `Flight manifest check: No reservation found matching PNR ${formattedPnr}.`
      });
    }

    // 3. Status Guards
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: `Web check-in denied: Flight reservation PNR ${formattedPnr} has been cancelled.`
      });
    }

    if (booking.status === 'EXPIRED') {
      return res.status(400).json({
        success: false,
        error: `Web check-in denied: Flight reservation PNR ${formattedPnr} has expired.`
      });
    }

    if (booking.paymentStatus !== 'PAID' && booking.status !== 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        error: `Web check-in denied: Payment status is ${booking.paymentStatus}. Ticket confirmation and settlement are required before web check-in.`
      });
    }

    const classification = getJourneyClassification(booking);
    if (classification === 'PAST' || classification === 'COMPLETED' || booking.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: `Web check-in closed: Flight for PNR ${formattedPnr} has already departed and concluded.`
      });
    }

    // 4. Passenger Manifest Verification (Last Name Match)
    const passengers = booking.passengers || [];
    const matchingPassenger = passengers.find(p => p.lastName && p.lastName.trim().toLowerCase() === formattedLastName);

    if (!matchingPassenger) {
      return res.status(400).json({
        success: false,
        error: `Passenger manifest mismatch: Last name "${lastName.trim()}" does not match any traveler on PNR ${formattedPnr}.`
      });
    }

    // 5. Optional Parameter Verifications
    if (email && typeof email === 'string') {
      if (email.trim().toLowerCase() !== booking.contactEmail.toLowerCase()) {
        return res.status(400).json({
          success: false,
          error: 'Verification error: Provided email address does not match the contact details on file for this booking.'
        });
      }
    }

    if (mobileLast4 !== undefined && mobileLast4 !== null && String(mobileLast4).trim() !== '') {
      const cleanInputDigits = String(mobileLast4).replace(/[^0-9]/g, '');
      const cleanPhoneDigits = String(booking.contactPhone).replace(/[^0-9]/g, '');
      const phoneLast4 = cleanPhoneDigits.slice(-4);

      if (cleanInputDigits !== phoneLast4) {
        return res.status(400).json({
          success: false,
          error: `Verification error: Provided digits "${cleanInputDigits}" do not match the last 4 digits of the contact mobile number on file.`
        });
      }
    }

    // 6. Complete Check-in & Assign Flight Departure Attributes
    const journey = Array.isArray(booking.journeyDetails) ? booking.journeyDetails : [];
    const firstLeg = journey[0] || {};
    const checkInTimestamp = new Date();

    const terminal = firstLeg.origin === 'DEL' ? 'T3' : firstLeg.origin === 'BOM' ? 'T2' : 'T1';
    const gateCode = `Gate ${10 + (Math.abs(booking.pnr.charCodeAt(0)) % 15)}${String.fromCharCode(65 + (Math.abs(booking.pnr.charCodeAt(1)) % 4))}`;
    const boardingGroup = booking.cabinClass === 'BUSINESS' || booking.cabinClass === 'FIRST' ? 'Zone 1' : 'Zone 2';

    // Update matching passenger(s)
    for (const p of passengers) {
      if (p.lastName && p.lastName.trim().toLowerCase() === formattedLastName) {
        p.isCheckedIn = true;
        p.checkInTime = checkInTimestamp;
        p.terminal = terminal;
        p.gate = gateCode;
        p.boardingGroup = boardingGroup;
        p.barcode = generateIataBcbp(p, firstLeg, booking.pnr);
        await p.save();
      }
    }

    booking.isCheckedIn = true;
    booking.checkInTime = checkInTimestamp;
    await booking.save();

    // 7. Generate Boarding Pass Payload
    const boardingPass = generateBoardingPass(booking, 'json');

    return res.status(200).json({
      success: true,
      message: 'Web check-in completed successfully! Boarding pass issued and cleared for departure.',
      data: {
        pnr: booking.pnr,
        passengerName: `${matchingPassenger.firstName} ${matchingPassenger.lastName}`,
        isCheckedIn: true,
        checkInTime: checkInTimestamp,
        flightNumber: firstLeg.flightNumber || 'HX-1001',
        origin: firstLeg.origin,
        destination: firstLeg.destination,
        seatNumber: matchingPassenger.seatNumber || '12A',
        terminal,
        gate: gateCode,
        boardingGroup,
        boardingTime: boardingPass.boardingTime,
        departureTime: boardingPass.departureTime,
        ticketNumber: matchingPassenger.ticketNumber,
        barcodeString: matchingPassenger.barcode,
        actions: {
          viewBoardingPassUrl: `/api/bookings/${booking.pnr}/boarding-pass`,
          viewTicketUrl: `/api/bookings/${booking.pnr}/ticket`
        }
      }
    });

  } catch (error) {
    console.error('Web Check-in Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Encountered unexpected turbulence while completing web check-in. Please try again shortly.'
    });
  }
}

/**
 * POST /api/checkin/cancel
 * Cancels/reverses web check-in for a booking (passenger offload).
 * Invalidates boarding pass barcodes and resets isCheckedIn to false,
 * allowing seat re-selection or proceeding to ticket cancellation.
 */
async function cancelWebCheckin(req, res) {
  try {
    const { pnr, lastName } = req.body;

    // 1. Mandatory Validations
    if (!pnr || typeof pnr !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Cancel check-in error: Mandatory 6-character PNR code is required.'
      });
    }

    if (!lastName || typeof lastName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Cancel check-in error: Mandatory passenger last name is required.'
      });
    }

    const formattedPnr = pnr.trim().toUpperCase();
    const formattedLastName = lastName.trim().toLowerCase();

    // 2. Fetch Booking
    const booking = await Booking.findOne({
      where: { pnr: formattedPnr },
      include: [{ model: BookingPassenger, as: 'passengers' }]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: `Flight manifest check: No reservation found matching PNR ${formattedPnr}.`
      });
    }

    // 3. Status Guards
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: 'Action unavailable: This reservation has already been cancelled.'
      });
    }

    if (booking.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Action denied: Cannot cancel check-in on a journey that has already concluded.'
      });
    }

    // 4. Verify that the booking is currently checked in
    const isCurrentlyCheckedIn = Boolean(booking.isCheckedIn || (booking.passengers && booking.passengers.some(p => p.isCheckedIn)));
    if (!isCurrentlyCheckedIn) {
      return res.status(400).json({
        success: false,
        error: `Check-in status: PNR ${formattedPnr} is not currently checked in.`
      });
    }

    // 5. Verify Passenger Match
    const passengers = booking.passengers || [];
    const matchingPassenger = passengers.find(p => p.lastName && p.lastName.trim().toLowerCase() === formattedLastName);

    if (!matchingPassenger) {
      return res.status(400).json({
        success: false,
        error: `Passenger manifest mismatch: Last name "${lastName.trim()}" does not match any traveler on PNR ${formattedPnr}.`
      });
    }

    // 6. Reset Check-in & Invalidate Boarding Clearance
    for (const p of passengers) {
      p.isCheckedIn = false;
      p.checkInTime = null;
      p.terminal = null;
      p.gate = null;
      p.boardingGroup = null;
      p.barcode = null;
      await p.save();
    }

    booking.isCheckedIn = false;
    booking.checkInTime = null;
    await booking.save();

    return res.status(200).json({
      success: true,
      message: `Web check-in for PNR ${booking.pnr} has been successfully cancelled. Boarding clearance and gate barcodes revoked. You may now modify your check-in or cancel your booking.`,
      data: {
        pnr: booking.pnr,
        status: booking.status,
        isCheckedIn: false,
        actions: {
          canCheckinAgain: true,
          canCancelBooking: true,
          cancellationUrl: '/api/cancellation/cancel'
        }
      }
    });

  } catch (error) {
    console.error('Cancel Check-in Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Encountered unexpected turbulence while cancelling web check-in. Please try again shortly.'
    });
  }
}

module.exports = {
  completeWebCheckin,
  cancelWebCheckin
};
