const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { Booking, BookingPassenger, User } = require('../models');
const {
  getJourneyClassification,
  generateFlightTicket,
  generateBoardingPass
} = require('../utils/document.generator');

const JWT_SECRET = process.env.JWT_SECRET || 'horizon_x_secret_key';

/**
 * Extracts userId from Bearer token if provided.
 */
function extractUser(req) {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/bookings
 * Retrieves all bookings categorized into Current, Future, and Past journey cards.
 * Supports logged-in passengers (via JWT) and guest lookups (via ?pnr=... or ?email=...).
 */
async function getMyBookings(req, res) {
  try {
    const userId = extractUser(req);
    const { pnr, email, phone, tab } = req.query;

    const whereConditions = [];

    if (userId) {
      whereConditions.push({ userId });
    } else if (pnr) {
      whereConditions.push({ pnr: pnr.trim().toUpperCase() });
    } else if (email) {
      whereConditions.push({ contactEmail: email.trim().toLowerCase() });
    } else if (phone) {
      whereConditions.push({ contactPhone: { [Op.like]: `%${phone.trim()}%` } });
    } else {
      // For development / sandbox convenience without query params, return all recent bookings
      // so the user can easily view the cards immediately in My Bookings!
    }

    const whereClause = whereConditions.length > 0 ? { [Op.or]: whereConditions } : {};

    const bookings = await Booking.findAll({
      where: whereClause,
      include: [{ model: BookingPassenger, as: 'passengers' }],
      order: [['createdAt', 'DESC']]
    });

    const formattedCards = bookings.map(b => {
      const journey = Array.isArray(b.journeyDetails) ? b.journeyDetails : [];
      const firstSector = journey[0] || {};
      const lastSector = journey[journey.length - 1] || firstSector;

      const classification = getJourneyClassification(b);

      const canViewTicket = true; // Permitted for Past, Current, Future, and Completed journeys
      const canViewBoardingPass = (classification === 'CURRENT' || classification === 'FUTURE') && b.status === 'CONFIRMED';

      const origin = firstSector.originAirportCode || firstSector.origin || 'DEL';
      const destination = lastSector.destinationAirportCode || lastSector.destination || 'BOM';
      const departureTime = firstSector.departureTime || firstSector.scheduledDeparture;
      const arrivalTime = lastSector.arrivalTime || lastSector.scheduledArrival;

      let durationMinutes = firstSector.durationMinutes;
      if (!durationMinutes && departureTime && arrivalTime) {
        const diff = (new Date(arrivalTime) - new Date(departureTime)) / (1000 * 60);
        if (!isNaN(diff) && diff > 0) durationMinutes = Math.round(diff);
      }

      return {
        id: b.id,
        pnr: b.pnr,
        status: b.status,
        paymentStatus: b.paymentStatus,
        classification, // 'CURRENT', 'FUTURE', 'PAST', 'COMPLETED', 'CANCELLED'
        tripType: b.tripType,
        cabinClass: b.cabinClass,
        totalAmount: Number(b.totalAmount),
        currency: b.currency || 'INR',
        bookingDate: b.createdAt,
        contactInfo: {
          email: b.contactEmail,
          phone: b.contactPhone
        },
        passengerCount: (b.passengers || []).length,
        passengers: b.passengers,
        isCheckedIn: Boolean(b.isCheckedIn),
        journey: {
          origin,
          originCity: firstSector.originCity || origin,
          destination,
          destinationCity: lastSector.destinationCity || destination,
          departureTime,
          arrivalTime,
          durationMinutes: durationMinutes || 120,
          airline: firstSector.airline?.name || firstSector.airlineName || 'Horizon-X Fleet',
          flightNumber: firstSector.flightNumber || 'HX-1001',
          aircraft: firstSector.aircraft || 'Airbus A320neo',
          sectors: journey
        },
        permissions: {
          canViewTicket,
          canViewBoardingPass,
          canCancel: b.status === 'CONFIRMED' && !b.isCheckedIn && (classification === 'CURRENT' || classification === 'FUTURE')
        }
      };
    });

    // Optional filtering by tab (CURRENT, FUTURE, PAST, or ALL)
    let filtered = formattedCards;
    if (tab && tab.toUpperCase() !== 'ALL') {
      filtered = formattedCards.filter(c => c.classification === tab.toUpperCase());
    }

    return res.status(200).json({
      success: true,
      meta: {
        total: formattedCards.length,
        currentCount: formattedCards.filter(c => c.classification === 'CURRENT').length,
        futureCount: formattedCards.filter(c => c.classification === 'FUTURE').length,
        pastCount: formattedCards.filter(c => c.classification === 'PAST').length,
        cancelledCount: formattedCards.filter(c => c.classification === 'CANCELLED').length
      },
      data: filtered
    });

  } catch (error) {
    console.error('My Bookings Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve booking manifests at this time.'
    });
  }
}

/**
 * GET /api/bookings/:pnr/ticket
 * Generates an Electronic Flight Ticket (E-Ticket) Receipt.
 * Available for Past, Current, and Future journeys.
 * Formats: json, markdown, html. Supports ?download=true
 */
async function getETicket(req, res) {
  try {
    const { pnr } = req.params;
    const { format = 'json', download } = req.query;
    const formattedPnr = pnr?.trim().toUpperCase();

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

    if (format === 'markdown') {
      const markdownContent = generateFlightTicket(booking, 'markdown');
      if (download === 'true') {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="E-Ticket-${formattedPnr}.md"`);
        return res.send(markdownContent);
      }
      return res.status(200).json({
        success: true,
        pnr: formattedPnr,
        format: 'markdown',
        content: markdownContent
      });
    }

    if (format === 'html') {
      const htmlContent = generateFlightTicket(booking, 'html');
      if (download === 'true') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="E-Ticket-${formattedPnr}.html"`);
      }
      return res.send(htmlContent);
    }

    // Default JSON
    const ticketData = generateFlightTicket(booking, 'json');
    return res.status(200).json({
      success: true,
      data: ticketData
    });

  } catch (error) {
    console.error('E-Ticket Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to generate e-ticket receipt at this time.'
    });
  }
}

/**
 * GET /api/bookings/:pnr/boarding-pass
 * Generates an Official Boarding Pass.
 * Enforces rule: ONLY available for Current and Future journeys!
 * Formats: json, markdown, html. Supports ?download=true
 */
async function getBoardingPass(req, res) {
  try {
    const { pnr } = req.params;
    const { format = 'json', download, passengerIndex = 0 } = req.query;
    const formattedPnr = pnr?.trim().toUpperCase();

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

    // Strict Aviation Rules Check
    const classification = getJourneyClassification(booking);
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: 'Boarding pass unavailable: Flight reservation has been cancelled.'
      });
    }

    if (booking.status === 'EXPIRED') {
      return res.status(400).json({
        success: false,
        error: 'Boarding pass unavailable: Flight reservation has expired.'
      });
    }

    if (classification === 'PAST' || classification === 'COMPLETED' || booking.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Boarding pass expired: This flight has already departed and concluded.'
      });
    }

    if (format === 'markdown') {
      const markdownContent = generateBoardingPass(booking, 'markdown', Number(passengerIndex));
      if (download === 'true') {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="BoardingPass-${formattedPnr}.md"`);
        return res.send(markdownContent);
      }
      return res.status(200).json({
        success: true,
        pnr: formattedPnr,
        format: 'markdown',
        content: markdownContent
      });
    }

    if (format === 'html') {
      const htmlContent = generateBoardingPass(booking, 'html', Number(passengerIndex));
      if (download === 'true') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="BoardingPass-${formattedPnr}.html"`);
      }
      return res.send(htmlContent);
    }

    // Default JSON
    const bpData = generateBoardingPass(booking, 'json', Number(passengerIndex));
    return res.status(200).json({
      success: true,
      data: bpData
    });

  } catch (error) {
    console.error('Boarding Pass Error:', error);
    return res.status(400).json({
      success: false,
      error: error.message || 'Unable to generate boarding pass at this time.'
    });
  }
}

async function markBookingCompleted(req, res) {
  try {
    const { pnr } = req.params;
    const formattedPnr = pnr?.trim().toUpperCase();

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

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: `Action denied: Reservation PNR ${formattedPnr} has been cancelled and cannot be marked as completed.`
      });
    }

    if (!booking.isCheckedIn) {
      return res.status(400).json({
        success: false,
        error: `Action denied: Flight reservation PNR ${formattedPnr} cannot be marked as COMPLETED because the passenger has not completed web check-in.`
      });
    }

    if (booking.status === 'COMPLETED') {
      return res.status(200).json({
        success: true,
        message: `Booking PNR ${formattedPnr} is already marked as COMPLETED.`,
        data: {
          pnr: booking.pnr,
          status: booking.status,
          paymentStatus: booking.paymentStatus
        }
      });
    }

    booking.status = 'COMPLETED';
    await booking.save();

    return res.status(200).json({
      success: true,
      message: `Flight reservation PNR ${formattedPnr} has been successfully marked as COMPLETED.`,
      data: {
        pnr: booking.pnr,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        completedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Mark Booking Completed Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to update booking status at this time.'
    });
  }
}

/**
 * Permanently deletes a completed booking record from the database to keep the DB size lightweight.
 * Blocked for scheduled/confirmed journeys.
 */
async function deleteBooking(req, res) {
  try {
    const { pnr } = req.params;
    const formattedPnr = pnr?.trim().toUpperCase();

    const booking = await Booking.findOne({
      where: { pnr: formattedPnr }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: `Flight manifest check: No reservation found matching PNR ${formattedPnr}.`
      });
    }

    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: `Action denied: Only COMPLETED journeys can be purged from the records. Current status: ${booking.status}.`
      });
    }

    await BookingPassenger.destroy({ where: { bookingId: booking.id } });
    await booking.destroy();

    return res.status(200).json({
      success: true,
      message: `Completed journey for PNR ${formattedPnr} has been permanently deleted from records.`
    });
  } catch (error) {
    console.error('Delete Booking Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to delete booking record at this time.'
    });
  }
}

module.exports = {
  getMyBookings,
  getETicket,
  getBoardingPass,
  markBookingCompleted,
  deleteBooking
};
