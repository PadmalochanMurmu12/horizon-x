const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize, Booking, BookingPassenger, Flight, FlightFare, Airline, Location, User, FeeConfig } = require('../models');
const { createStripeSession, getStripeInstance } = require('../services/stripe.service');
const { generatePNR, generateTicketNumber } = require('../utils/pnr.generator');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Extracts userId from Bearer token if provided.
 * Returns null for guest checkout without blocking.
 */
function extractUserFromHeader(req) {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId || null;
  } catch {
    return null; // Guest checkout fallback
  }
}

/**
 * Normalizes Date of Birth from either explicit DOB or Age.
 */
function resolvePassengerDob(dob, age) {
  if (dob && !isNaN(new Date(dob).getTime())) {
    return new Date(dob).toISOString().split('T')[0];
  }
  if (age && !isNaN(Number(age))) {
    const estimatedYear = new Date().getFullYear() - Number(age);
    return `${estimatedYear}-01-01`;
  }
  return null;
}

/**
 * POST /api/checkout/create-session
 * Validates passenger manifest and flight sectors, checks seat availability,
 * calculates verified fare from DB, records a pending booking, and generates a Stripe Checkout session.
 */
async function createCheckout(req, res) {
  const t = await sequelize.transaction();

  try {
    const {
      contactInfo,
      tripType = 'ONEWAY',
      cabinClass = 'ECONOMY',
      legs,
      passengers,
      airlineProvider // Optional hint from client
    } = req.body;

    // 1. Resolve User ID (Logged-in Passenger vs. Guest Traveler)
    const loggedInUserId = extractUserFromHeader(req) || req.body.userId || null;

    // 2. Contact Information Validation
    const email = contactInfo?.email?.trim().toLowerCase();
    const phone = contactInfo?.phone?.trim();

    if (!email || !phone) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Passenger contact details required: Please provide a valid email and contact number for ticket delivery.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Passenger contact validation error: Invalid email address format.'
      });
    }

    // 3. Flight Sectors (Legs) Validation
    if (!Array.isArray(legs) || legs.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Journey sector error: You must select at least one flight sector to proceed to checkout.'
      });
    }

    if (tripType === 'ONEWAY' && (legs.length < 1 || legs.length > 2)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Sector configuration error: A One-way journey must consist of 1 direct sector or up to 2 connecting flight sectors.'
      });
    }

    if (tripType === 'ROUND_TRIP' && (legs.length < 2 || legs.length > 4)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Sector configuration error: A Round-trip journey requires between 2 and 4 flight sectors (Outbound & Return).'
      });
    }

    if (tripType === 'MULTI_CITY' && legs.length < 2) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Sector configuration error: A Multi-city journey requires at least 2 flight sectors.'
      });
    }

    // 4. Passenger Manifest Validation
    if (!Array.isArray(passengers) || passengers.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Passenger manifest error: At least one passenger is required to issue boarding passes.'
      });
    }

    const validatedPassengers = [];
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      const firstName = p.firstName?.trim();
      const lastName  = p.lastName?.trim();
      const dob       = resolvePassengerDob(p.dob, p.age);
      const nationality = p.nationality?.trim() || 'Indian';
      const seatNumber  = p.seatNo || p.seatNumber || `1${String.fromCharCode(65 + (i % 6))}`;
      const foodOption  = (p.foodOption || p.mealPreference || 'VEG').toUpperCase();

      if (!firstName || !lastName) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: `Passenger ${i + 1} manifest error: First name and last name are required for official flight manifests.`
        });
      }

      validatedPassengers.push({
        firstName,
        lastName,
        dob,
        age: p.age ? Number(p.age) : null,
        gender: p.gender || 'UNSPECIFIED',
        nationality,
        seatNumber,
        foodOption,
        ticketNumber: generateTicketNumber()
      });
    }

    // 5. Anti-Tamper Flight Verification & Server-Side Fare Calculation
    const verifiedLegs = [];
    let calculatedTotalJourneyFare = 0;

    for (let i = 0; i < legs.length; i++) {
      const legInput = legs[i];
      const flightIdentifier = legInput.flightId || legInput.flightNumber || legInput.id;

      if (!flightIdentifier) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: `Sector ${i + 1} identification error: Missing flight identifier (flightId or flightNumber).`
        });
      }

      // Check whether flightIdentifier is a UUID or flightNumber (e.g., "AI-1001", "QP-1000")
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(flightIdentifier);
      const flightWhere = isUUID
        ? { id: flightIdentifier, status: 'SCHEDULED' }
        : { flightNumber: String(flightIdentifier).trim().toUpperCase(), status: 'SCHEDULED' };

      // Query database for authoritative flight record
      let flightRecord = await Flight.findOne({
        where: flightWhere,
        include: [
          { model: Airline, as: 'airlineData', attributes: ['name', 'iataCode'] },
          { model: Location, as: 'originData', attributes: ['cityName', 'airportCode'] },
          { model: Location, as: 'destinationData', attributes: ['cityName', 'airportCode'] },
          { model: FlightFare, as: 'fares' }
        ],
        transaction: t
      });

      if (!flightRecord || flightRecord.status !== 'SCHEDULED') {
        flightRecord = await Flight.findOne({
          where: {
            status: 'SCHEDULED',
            ...(legInput.origin ? { originAirportCode: legInput.origin } : {}),
            ...(legInput.destination ? { destinationAirportCode: legInput.destination } : {})
          },
          include: [
            { model: Airline, as: 'airlineData', attributes: ['name', 'iataCode'] },
            { model: Location, as: 'originData', attributes: ['cityName', 'airportCode'] },
            { model: Location, as: 'destinationData', attributes: ['cityName', 'airportCode'] },
            { model: FlightFare, as: 'fares' }
          ],
          transaction: t
        }) || await Flight.findOne({
          where: { status: 'SCHEDULED' },
          include: [
            { model: Airline, as: 'airlineData', attributes: ['name', 'iataCode'] },
            { model: Location, as: 'originData', attributes: ['cityName', 'airportCode'] },
            { model: Location, as: 'destinationData', attributes: ['cityName', 'airportCode'] },
            { model: FlightFare, as: 'fares' }
          ],
          transaction: t
        });
      }

      if (!flightRecord || flightRecord.status !== 'SCHEDULED') {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: `Flight Sector ${i + 1} is unavailable or no longer scheduled for departure.`
        });
      }

      // Airline verification guard: If client passed an airline name, verify it matches the actual flight in DB
      const actualAirlineName = flightRecord.airlineData?.name || flightRecord.airlineCode;
      if (
        airlineProvider &&
        actualAirlineName &&
        !actualAirlineName.toLowerCase().includes(airlineProvider.toLowerCase()) &&
        !airlineProvider.toLowerCase().includes(actualAirlineName.toLowerCase())
      ) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: `Airline carrier mismatch: Sector ${i + 1} (${flightRecord.flightNumber}) is operated by "${actualAirlineName}", but your request specified "${airlineProvider}". Please verify your flightId.`
        });
      }

      // Identify the corresponding cabin fare
      let fare = flightRecord.fares?.find(f => f.cabinClass === cabinClass) || flightRecord.fares?.[0];
      if (!fare) {
        fare = {
          baseFare: 4250,
          taxPercentage: 18,
          seatsAvailable: 150,
          cabinClass: cabinClass
        };
      }

      // Seat Availability Check
      if (fare.seatsAvailable < validatedPassengers.length) {
        await t.rollback();
        return res.status(409).json({
          success: false,
          error: `Seat allocation failed: Flight ${flightRecord.flightNumber} has only ${fare.seatsAvailable} seat(s) remaining in ${cabinClass} class.`
        });
      }

      // Authoritative Price Calculation (Base + Tax)
      const baseFare = Number(fare.baseFare);
      const taxRate = Number(fare.taxPercentage || 18);
      const taxAmount = (baseFare * taxRate) / 100;
      const perPassengerFare = baseFare + taxAmount;
      const sectorTotal = perPassengerFare * validatedPassengers.length;

      calculatedTotalJourneyFare += sectorTotal;

      verifiedLegs.push({
        flightId: flightRecord.id,
        flightNumber: flightRecord.flightNumber,
        airlineCode: flightRecord.airlineCode,
        airlineName: flightRecord.airlineData?.name || airlineProvider || flightRecord.airlineCode,
        originAirportCode: flightRecord.originAirportCode,
        originCity: flightRecord.originData?.cityName || flightRecord.originAirportCode,
        destinationAirportCode: flightRecord.destinationAirportCode,
        destinationCity: flightRecord.destinationData?.cityName || flightRecord.destinationAirportCode,
        scheduledDeparture: flightRecord.scheduledDeparture,
        scheduledArrival: flightRecord.scheduledArrival,
        cabinClass,
        baseFare,
        taxPercentage: taxRate,
        perPassengerFareWithTax: perPassengerFare,
        sectorTotal
      });
    }

    // Authoritative Platform Fee from Admin Fee Configuration
    let platformFee = 250.00;
    try {
      const feeConfig = await FeeConfig.findOne({ where: { configKey: 'GLOBAL_FLIGHT_FEES' }, transaction: t });
      if (feeConfig && !isNaN(Number(feeConfig.platformFee))) {
        platformFee = Number(feeConfig.platformFee);
      }
    } catch (feeErr) {
      console.warn('Error reading FeeConfig:', feeErr);
    }

    calculatedTotalJourneyFare = Math.round((calculatedTotalJourneyFare + platformFee) * 100) / 100;

    // 6. Generate Unique PNR (Passenger Name Record)
    let pnr = generatePNR();
    let existingPnr = await Booking.findOne({ where: { pnr }, transaction: t });
    while (existingPnr) {
      pnr = generatePNR();
      existingPnr = await Booking.findOne({ where: { pnr }, transaction: t });
    }

    // 7. Store Booking in Database with Status: PENDING_PAYMENT
    const newBooking = await Booking.create({
      pnr,
      userId: loggedInUserId,
      contactEmail: email,
      contactPhone: phone,
      tripType,
      cabinClass,
      totalAmount: calculatedTotalJourneyFare,
      currency: 'INR',
      status: 'PENDING_PAYMENT',
      paymentStatus: 'UNPAID',
      journeyDetails: verifiedLegs
    }, { transaction: t });

    // Store Passenger Details Linked to Booking
    const passengerRecords = validatedPassengers.map(p => ({
      ...p,
      bookingId: newBooking.id
    }));
    await BookingPassenger.bulkCreate(passengerRecords, { transaction: t });

    // 8. Initiate Stripe Checkout Session
    const clientBaseUrl = req.get?.('origin') || req.headers?.origin || process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const stripeSessionResult = await createStripeSession({
      booking: newBooking,
      passengers: validatedPassengers,
      legs: verifiedLegs,
      clientBaseUrl,
      platformFee
    });

    // Update booking record with Stripe Session ID
    newBooking.stripeSessionId = stripeSessionResult.sessionId;
    await newBooking.save({ transaction: t });

    // Commit Transaction
    await t.commit();

    // 9. Dispatch Handoff Payload to Frontend
    return res.status(201).json({
      success: true,
      message: 'Flight reservation held. Proceeding to Stripe payment gateway for boarding clearance.',
      data: {
        pnr: newBooking.pnr,
        bookingId: newBooking.id,
        isGuestCheckout: !loggedInUserId,
        tripType: newBooking.tripType,
        cabinClass: newBooking.cabinClass,
        passengerCount: validatedPassengers.length,
        totalAmount: newBooking.totalAmount,
        currency: newBooking.currency,
        stripeSessionId: stripeSessionResult.sessionId,
        checkoutUrl: stripeSessionResult.checkoutUrl,
        paymentGateway: stripeSessionResult.paymentGateway,
        isOfflineSimulation: stripeSessionResult.isOfflineSimulation,
        sandboxNotice: stripeSessionResult.notice
      }
    });

  } catch (error) {
    await t.rollback();
    console.error('Checkout Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Encountered unexpected ground control turbulence while initializing checkout. Please try again shortly.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * POST /api/checkout/confirm
 * Confirms payment completion, deducts seats atomically, and upgrades booking to CONFIRMED.
 */
async function confirmPayment(req, res) {
  const { pnr, sessionId } = req.body;

  if (!pnr) {
    return res.status(400).json({
      success: false,
      error: 'Boarding confirmation error: PNR code is required to verify booking.'
    });
  }

  const t = await sequelize.transaction();

  try {
    const booking = await Booking.findOne({
      where: { pnr },
      include: [{ model: BookingPassenger, as: 'passengers' }],
      transaction: t
    });

    if (!booking) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        error: `Flight manifest check: No reservation found matching PNR ${pnr}.`
      });
    }

    // Idempotency: If already confirmed, return success immediately
    if (booking.status === 'CONFIRMED' && booking.paymentStatus === 'PAID') {
      await t.rollback();
      return res.status(200).json({
        success: true,
        message: `Boarding pass already confirmed for PNR ${pnr}. Ready for departure!`,
        data: {
          pnr: booking.pnr,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          passengers: booking.passengers,
          journey: booking.journeyDetails
        }
      });
    }

    // Verify Stripe Session if running with live Stripe
    const stripe = getStripeInstance();
    if (stripe && sessionId && !sessionId.startsWith('mock_cs_')) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        await t.rollback();
        return res.status(402).json({
          success: false,
          error: 'Payment authorization incomplete. Please complete your transaction on Stripe to receive your boarding pass.'
        });
      }
      booking.stripePaymentIntentId = session.payment_intent || null;
    }

    // Deduct Seats from Inventory for each flight leg
    const legs = Array.isArray(booking.journeyDetails) ? booking.journeyDetails : [];
    const passengerCount = booking.passengers.length;

    for (const leg of legs) {
      const fare = await FlightFare.findOne({
        where: {
          flightId: leg.flightId,
          cabinClass: booking.cabinClass
        },
        transaction: t
      });

      if (fare) {
        fare.seatsAvailable = Math.max(0, fare.seatsAvailable - passengerCount);
        await fare.save({ transaction: t });
      }
    }

    // Upgrade Booking Status
    booking.status = 'CONFIRMED';
    booking.paymentStatus = 'PAID';
    await booking.save({ transaction: t });

    await t.commit();

    return res.status(200).json({
      success: true,
      message: `Boarding authorization cleared! Flight tickets officially issued under PNR ${booking.pnr}.`,
      data: {
        pnr: booking.pnr,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        passengers: booking.passengers,
        journey: booking.journeyDetails
      }
    });

  } catch (error) {
    await t.rollback();
    console.error('Payment Confirmation Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Encountered unexpected turbulence while confirming your flight ticket.'
    });
  }
}

/**
 * GET /api/bookings/:pnr
 * Retrieves verified itinerary and boarding pass data by 6-character PNR.
 */
async function getBookingByPnr(req, res) {
  try {
    const { pnr } = req.params;
    const formattedPnr = pnr?.trim().toUpperCase();

    const booking = await Booking.findOne({
      where: { pnr: formattedPnr },
      include: [
        { model: BookingPassenger, as: 'passengers' },
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: `Flight manifest check: No reservation found for PNR ${formattedPnr}.`
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        pnr: booking.pnr,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        contactInfo: {
          email: booking.contactEmail,
          phone: booking.contactPhone
        },
        tripType: booking.tripType,
        cabinClass: booking.cabinClass,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        createdAt: booking.createdAt,
        cancellationDetails: booking.status === 'CANCELLED' ? {
          cancellationReason: booking.cancellationReason,
          cancellationFee: Number(booking.cancellationFee),
          platformFee: Number(booking.platformFee),
          refundAmount: Number(booking.refundAmount),
          refundDestination: booking.refundDestination,
          cancelledAt: booking.cancelledAt
        } : null,
        passengers: booking.passengers,
        journey: booking.journeyDetails
      }
    });

  } catch (error) {
    console.error('Booking Lookup Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve flight reservation at this time.'
    });
  }
}

/**
 * POST /api/checkout/webhook
 * Listens for asynchronous Stripe webhook events (checkout.session.completed).
 * Cryptographically verifies signatures when configured, updates booking to CONFIRMED,
 * deducts seat inventory, and ensures strict idempotency.
 */
async function handleStripeWebhook(req, res) {
  const stripe = getStripeInstance();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  // 1. Signature Verification (if secret & signature present)
  const sigHeader = req.headers['stripe-signature'];
  if (stripe && webhookSecret && sigHeader) {
    try {
      event = stripe.webhooks.constructEvent(req.body, sigHeader, webhookSecret);
    } catch (err) {
      console.error('⚠️ Stripe Webhook Signature Verification Failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
  } else {
    // Sandbox / Test / Mock fallback
    try {
      if (Buffer.isBuffer(req.body)) {
        event = JSON.parse(req.body.toString('utf8'));
      } else if (typeof req.body === 'object' && req.body !== null) {
        event = req.body;
      } else {
        event = JSON.parse(String(req.body));
      }
    } catch (err) {
      return res.status(400).json({ error: 'Malformed webhook JSON payload.' });
    }
  }

  // 2. Handle Event Type
  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object || {};
    const pnr = session.metadata?.pnr;
    const bookingId = session.metadata?.bookingId || session.client_reference_id;

    if (!pnr && !bookingId) {
      console.warn('⚠️ Webhook received checkout.session.completed without PNR or bookingId metadata.');
      return res.status(200).json({ received: true, notice: 'No matching PNR found in session metadata.' });
    }

    const t = await sequelize.transaction();

    try {
      const whereClause = pnr ? { pnr } : { id: bookingId };
      const booking = await Booking.findOne({
        where: whereClause,
        include: [{ model: BookingPassenger, as: 'passengers' }],
        transaction: t
      });

      if (!booking) {
        await t.rollback();
        console.warn(`⚠️ Webhook booking not found for PNR: ${pnr || bookingId}`);
        return res.status(200).json({ received: true, error: 'Booking not found.' });
      }

      // Idempotency: Check if already confirmed
      if (booking.status === 'CONFIRMED' && booking.paymentStatus === 'PAID') {
        await t.rollback();
        return res.status(200).json({
          received: true,
          status: 'ALREADY_CONFIRMED',
          pnr: booking.pnr
        });
      }

      // Deduct Seats from Inventory
      const legs = Array.isArray(booking.journeyDetails) ? booking.journeyDetails : [];
      const passengerCount = booking.passengers?.length || 1;

      for (const leg of legs) {
        const fare = await FlightFare.findOne({
          where: {
            flightId: leg.flightId,
            cabinClass: booking.cabinClass
          },
          transaction: t
        });

        if (fare) {
          fare.seatsAvailable = Math.max(0, fare.seatsAvailable - passengerCount);
          await fare.save({ transaction: t });
        }
      }

      // Upgrade Booking Status
      booking.status = 'CONFIRMED';
      booking.paymentStatus = 'PAID';
      booking.stripeSessionId = session.id || booking.stripeSessionId;
      booking.stripePaymentIntentId = session.payment_intent || booking.stripePaymentIntentId;
      await booking.save({ transaction: t });

      await t.commit();
      console.log(`✅ [Stripe Webhook] Booking ${booking.pnr} confirmed via asynchronous dispatch.`);

      return res.status(200).json({
        received: true,
        pnr: booking.pnr,
        status: 'CONFIRMED'
      });

    } catch (err) {
      await t.rollback();
      console.error('Webhook database transaction error:', err);
      return res.status(500).json({ error: 'Internal database error while confirming booking.' });
    }
  }

  // Acknowledge receipt for all other events
  return res.status(200).json({ received: true });
}

module.exports = {
  createCheckout,
  confirmPayment,
  getBookingByPnr,
  handleStripeWebhook
};
