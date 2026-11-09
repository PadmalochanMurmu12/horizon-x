const { Op } = require('sequelize');
const { Flight, FlightFare, Airline } = require('../models');
const { MIN_CONNECTION_MINUTES, MAX_CONNECTION_MINUTES } = require('../constants/searchRules');
const { ensureFlightSchedules } = require('./schedule.generator');

// Convert config minutes to milliseconds once at module load
const MIN_CONNECTING_TIME_MS = MIN_CONNECTION_MINUTES * 60 * 1000;
const MAX_CONNECTING_TIME_MS = MAX_CONNECTION_MINUTES * 60 * 1000;

/**
 * Builds a UTC date range for the full travel day (00:00:00 → 23:59:59).
 * Avoids timezone drift by parsing the date string directly instead of relying
 * on the local system clock.
 */
const buildUtcDepartureWindow = (travelDateString) => {
  if (!travelDateString || typeof travelDateString !== 'string') {
    throw new Error('Invalid travel date: a date string in YYYY-MM-DD format is required.');
  }

  const dateParts = travelDateString.split('-').map(Number);
  if (dateParts.length !== 3 || dateParts.some(isNaN)) {
    throw new Error(`Unrecognised date format: "${travelDateString}". Expected YYYY-MM-DD.`);
  }

  const [year, month, day] = dateParts;
  const departureWindowStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const departureWindowEnd   = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  return { departureWindowStart, departureWindowEnd };
};

// ─────────────────────────────────────────────────────────────────
// Shared Sequelize include blocks (DRY)
// ─────────────────────────────────────────────────────────────────
const airlineInclude = {
  model: Airline,
  as: 'airlineData',
  attributes: ['name', 'iataCode']
};

const fareInclude = (cabinClass, requiredSeats) => ({
  model: FlightFare,
  as: 'fares',
  where: {
    cabinClass,
    seatsAvailable: { [Op.gte]: requiredSeats > 0 ? requiredSeats : 1 }
  }
});

// ─────────────────────────────────────────────────────────────────
// DIRECT FLIGHTS
// ─────────────────────────────────────────────────────────────────
/**
 * Fetches non-stop flights matching the leg parameters and seat availability.
 * Synthesizes authentic flight schedules on-demand if no flights exist for this route.
 */
const getDirectFlights = async ({ origin, destination, travelDate, cabinClass, paxCounts }) => {
  await ensureFlightSchedules({ origin, destination, travelDate });

  const { departureWindowStart, departureWindowEnd } = buildUtcDepartureWindow(travelDate);
  const requiredSeats = (paxCounts?.adults || 0) + (paxCounts?.children || 0);

  return Flight.findAll({
    where: {
      originAirportCode: origin,
      destinationAirportCode: destination,
      status: 'SCHEDULED',
      scheduledDeparture: {
        [Op.gte]: departureWindowStart,
        [Op.lte]: departureWindowEnd
      }
    },
    include: [airlineInclude, fareInclude(cabinClass, requiredSeats)],
    order: [['scheduledDeparture', 'ASC']]
  });
};

// ─────────────────────────────────────────────────────────────────
// CONNECTING FLIGHTS (1-stop)
// ─────────────────────────────────────────────────────────────────
/**
 * Fetches 1-stop itineraries that honour Minimum Connecting Time (MCT) rules.
 * Synthesizes connecting flights via transit hubs on-demand if needed.
 */
const getLayoverFlights = async ({ origin, destination, travelDate, cabinClass, paxCounts }) => {
  await ensureFlightSchedules({ origin, destination, travelDate });

  const { departureWindowStart, departureWindowEnd } = buildUtcDepartureWindow(travelDate);
  const requiredSeats = (paxCounts?.adults || 0) + (paxCounts?.children || 0);

  // ── Step 1: All outbound legs from origin (excluding the direct destination) ──
  const outboundLegs = await Flight.findAll({
    where: {
      originAirportCode: origin,
      destinationAirportCode: { [Op.ne]: destination },
      status: 'SCHEDULED',
      scheduledDeparture: {
        [Op.gte]: departureWindowStart,
        [Op.lte]: departureWindowEnd
      }
    },
    include: [airlineInclude, fareInclude(cabinClass, requiredSeats)]
  });

  if (outboundLegs.length === 0) return [];

  // ── Step 2: Collect unique layover airports from all outbound legs ──
  const layoverAirports = [...new Set(outboundLegs.map(l => l.destinationAirportCode))];

  // Cast the second-leg search window wide enough to cover the largest possible layover
  // (day start → day end + MAX layover duration)
  const batchWindowEnd = new Date(departureWindowEnd.getTime() + MAX_CONNECTING_TIME_MS);

  const allCandidateSecondLegs = await Flight.findAll({
    where: {
      originAirportCode: { [Op.in]: layoverAirports },
      destinationAirportCode: destination,
      status: 'SCHEDULED',
      scheduledDeparture: {
        [Op.gte]: departureWindowStart,
        [Op.lte]: batchWindowEnd
      }
    },
    include: [airlineInclude, fareInclude(cabinClass, requiredSeats)]
  });

  // ── Step 3: In-memory pairing with MCT constraints ──
  const connectingItineraries = [];

  for (const leg1 of outboundLegs) {
    const leg1Arrival    = new Date(leg1.scheduledArrival).getTime();
    const minDeparture   = leg1Arrival + MIN_CONNECTING_TIME_MS;
    const maxDeparture   = leg1Arrival + MAX_CONNECTING_TIME_MS;

    const matchingLegs = allCandidateSecondLegs.filter(leg2 =>
      leg2.originAirportCode === leg1.destinationAirportCode &&
      new Date(leg2.scheduledDeparture).getTime() >= minDeparture &&
      new Date(leg2.scheduledDeparture).getTime() <= maxDeparture
    );

    for (const leg2 of matchingLegs) {
      connectingItineraries.push([leg1, leg2]);
    }
  }

  return connectingItineraries;
};

module.exports = {
  getDirectFlights,
  getLayoverFlights,
  ensureFlightSchedules
};
