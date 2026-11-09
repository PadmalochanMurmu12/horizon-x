const { randomUUID } = require('crypto');
const { Op } = require('sequelize');
const { Flight, FlightFare, Location, Airline, sequelize } = require('../models');
const { CABIN_CLASSES, CABIN_MULTIPLIERS, CABIN_SEATS } = require('../constants/flight.constant');

// Regional grouping for all 102 airports to generate realistic durations and fares
const REGIONS = {
  NORTH: ['DEL', 'SXR', 'IXJ', 'IXL', 'IXC', 'ATQ', 'LUH', 'IXP', 'DED', 'PGH', 'SLN', 'KUU', 'DHM', 'JAI', 'JDH', 'UDR', 'BKB', 'KTU', 'JSA', 'LKO', 'VNS', 'AGR', 'IXD', 'GOP', 'AYO', 'HSR'],
  WEST: ['BOM', 'PNQ', 'NAG', 'AMD', 'STV', 'GOI', 'GOX', 'BDQ', 'RAJ', 'BHU', 'BHJ', 'IXY', 'JGA', 'PBD', 'SAG', 'IXU', 'NRE', 'SND', 'NWR', 'DIU'],
  SOUTH: ['BLR', 'MAA', 'HYD', 'COK', 'TRV', 'CCJ', 'CNN', 'IXE', 'CJB', 'TRZ', 'IXM', 'VGA', 'TIR', 'RJA', 'CDP', 'KJB', 'IXG', 'HBX', 'MYQ', 'VDY', 'AGX'],
  EAST: ['CCU', 'BBI', 'PAT', 'IXR', 'VTZ', 'JRG', 'IXW', 'DGR', 'IXB', 'RPR', 'GAY', 'DBR', 'PXN', 'GWL', 'JBP', 'HJR', 'BHO', 'IDR'],
  NORTHEAST: ['GAU', 'IMF', 'AJL', 'DMU', 'IXA', 'SHL', 'DIB', 'IXS', 'JRH', 'TEZ', 'IXI', 'RUP', 'HGI', 'IXT', 'TEI', 'PYG'],
  ISLANDS: ['IXZ']
};

const NATIONAL_HUBS = ['DEL', 'BOM', 'BLR', 'HYD', 'CCU', 'MAA'];

function getAirportRegion(code) {
  for (const [region, airports] of Object.entries(REGIONS)) {
    if (airports.includes(code)) return region;
  }
  return 'NORTH';
}

/**
 * Calculates a realistic flight duration (in minutes) based on route sectors.
 */
function estimateFlightDuration(origin, destination) {
  // Specialized route overrides matching actual airline flight manifests
  const pair = `${origin}-${destination}`;
  const reversePair = `${destination}-${origin}`;

  const explicitDurations = {
    'DEL-BBI': 135, // 2h 15m (matches Air India Express / Air India)
    'BBI-DEL': 135,
    'DEL-BOM': 130, // 2h 10m
    'BOM-DEL': 130,
    'DEL-BLR': 165, // 2h 45m
    'BLR-DEL': 165,
    'BOM-GOI': 75,  // 1h 15m
    'GOI-BOM': 75,
    'DEL-CCU': 130, // 2h 10m
    'CCU-DEL': 130,
    'BLR-HYD': 75,  // 1h 15m
    'HYD-BLR': 75,
    'BOM-MAA': 115, // 1h 55m
    'MAA-BOM': 115,
    'DEL-JAI': 60,  // 1h 00m
    'JAI-DEL': 60
  };

  if (explicitDurations[pair]) return explicitDurations[pair];
  if (explicitDurations[reversePair]) return explicitDurations[reversePair];

  const reg1 = getAirportRegion(origin);
  const reg2 = getAirportRegion(destination);

  // Far-flung island routes
  if (reg1 === 'ISLANDS' || reg2 === 'ISLANDS') return 180;

  // Intra-regional flights (same state/region)
  if (reg1 === reg2) return 75;

  // Cross-country long hauls (North to South, West to East, North to Northeast)
  const isOpposite = (
    (reg1 === 'NORTH' && reg2 === 'SOUTH') || (reg1 === 'SOUTH' && reg2 === 'NORTH') ||
    (reg1 === 'WEST' && reg2 === 'EAST') || (reg1 === 'EAST' && reg2 === 'WEST') ||
    (reg1 === 'NORTH' && reg2 === 'NORTHEAST') || (reg1 === 'NORTHEAST' && reg2 === 'NORTH')
  );
  if (isOpposite) return 160;

  // Adjacent regions (e.g. North to East, North to West, South to West)
  return 125;
}

/**
 * Calculates a realistic base fare for an ECONOMY seat.
 */
function estimateBaseFare(origin, destination) {
  const duration = estimateFlightDuration(origin, destination);
  if (duration <= 75) return 3800;
  if (duration <= 135) return 5500;
  if (duration <= 165) return 6800;
  return 8200;
}

/**
 * Creates a UTC Date anchored to a specific departure hour & minute on the given travelDate.
 */
function buildUtcTime(travelDateStr, hour, minute) {
  const [year, month, day] = travelDateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
}

/**
 * Generates an array of Flight & FlightFare records for direct flights.
 */
function buildDirectFlightPayloads(origin, destination, travelDateStr) {
  const duration = estimateFlightDuration(origin, destination);
  const baseFare = estimateBaseFare(origin, destination);

  // Specific high-frequency template for DEL <-> BBI matching real flight schedules
  let departureTemplates;
  if ((origin === 'DEL' && destination === 'BBI') || (origin === 'BBI' && destination === 'DEL')) {
    departureTemplates = [
      { airlineCode: 'QP', flightNumber: origin === 'DEL' ? 'QP-1102' : 'QP-1103', hour: 8,  minute: 30, fare: baseFare - 300 },
      { airlineCode: 'SG', flightNumber: origin === 'DEL' ? 'SG-8194' : 'SG-8195', hour: 11, minute: 15, fare: baseFare },
      { airlineCode: 'IX', flightNumber: origin === 'DEL' ? 'IX-1059' : 'IX-1060', hour: 15, minute: 40, fare: baseFare + 400 },
      { airlineCode: '6E', flightNumber: origin === 'DEL' ? '6E-2041' : '6E-2042', hour: 16, minute: 30, fare: baseFare + 200 },
      { airlineCode: 'AI', flightNumber: origin === 'DEL' ? 'AI-2661' : 'AI-2662', hour: 17, minute: 55, fare: baseFare + 500 },
      { airlineCode: '6E', flightNumber: origin === 'DEL' ? '6E-3105' : '6E-3106', hour: 20, minute: 30, fare: baseFare - 100 }
    ];
  } else {
    // Universal 5-flight schedule across the day for any route pair
    const codeHash = (origin + destination).split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const flightSeq = 1000 + (codeHash % 7000);

    departureTemplates = [
      { airlineCode: '6E', flightNumber: `6E-${flightSeq + 10}`, hour: 6,  minute: 30, fare: baseFare - 200 },
      { airlineCode: 'AI', flightNumber: `AI-${flightSeq + 20}`, hour: 9,  minute: 15, fare: baseFare + 300 },
      { airlineCode: 'IX', flightNumber: `IX-${flightSeq + 30}`, hour: 13, minute: 45, fare: baseFare },
      { airlineCode: 'QP', flightNumber: `QP-${flightSeq + 40}`, hour: 16, minute: 20, fare: baseFare - 100 },
      { airlineCode: '6E', flightNumber: `6E-${flightSeq + 50}`, hour: 18, minute: 50, fare: baseFare + 400 },
      { airlineCode: 'SG', flightNumber: `SG-${flightSeq + 60}`, hour: 21, minute: 10, fare: baseFare - 150 }
    ];
  }

  const flights = [];
  const fares = [];

  for (const t of departureTemplates) {
    const flightId = randomUUID();
    const scheduledDeparture = buildUtcTime(travelDateStr, t.hour, t.minute);
    const scheduledArrival = new Date(scheduledDeparture.getTime() + duration * 60 * 1000);

    flights.push({
      id: flightId,
      flightNumber: t.flightNumber,
      airlineCode: t.airlineCode,
      originAirportCode: origin,
      destinationAirportCode: destination,
      scheduledDeparture,
      scheduledArrival,
      status: 'SCHEDULED'
    });

    for (const cabin of CABIN_CLASSES) {
      fares.push({
        id: randomUUID(),
        flightId,
        cabinClass: cabin,
        baseFare: Math.round(t.fare * CABIN_MULTIPLIERS[cabin] * 100) / 100,
        taxPercentage: 18.0,
        seatsAvailable: CABIN_SEATS[cabin],
        baggageAllowance: cabin === 'ECONOMY' ? '15kg' : cabin === 'PREMIUM_ECONOMY' ? '20kg' : cabin === 'BUSINESS' ? '30kg' : '40kg'
      });
    }
  }

  return { flights, fares };
}

/**
 * Generates connecting flights via a strategic national transit hub (e.g. DEL, BOM, BLR).
 * Adheres strictly to Minimum Connecting Time (MCT 45-360m).
 */
function buildHubConnectingPayloads(origin, destination, travelDateStr, hub) {
  const durationLeg1 = estimateFlightDuration(origin, hub);
  const durationLeg2 = estimateFlightDuration(hub, destination);
  const fareLeg1 = estimateBaseFare(origin, hub);
  const fareLeg2 = estimateBaseFare(hub, destination);

  const codeHash = (origin + hub + destination).split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const seq = 3000 + (codeHash % 5000);

  // Connecting Option: Morning departure from origin -> Hub -> Destination (Layover: 90 mins)
  const leg1Departure = buildUtcTime(travelDateStr, 7, 45);
  const leg1Arrival   = new Date(leg1Departure.getTime() + durationLeg1 * 60 * 1000);

  const layoverMinutes = 90; // Strictly within 45m and 360m
  const leg2Departure = new Date(leg1Arrival.getTime() + layoverMinutes * 60 * 1000);
  const leg2Arrival   = new Date(leg2Departure.getTime() + durationLeg2 * 60 * 1000);

  const leg1Id = randomUUID();
  const leg2Id = randomUUID();

  const flights = [
    {
      id: leg1Id,
      flightNumber: `6E-${seq}`,
      airlineCode: '6E',
      originAirportCode: origin,
      destinationAirportCode: hub,
      scheduledDeparture: leg1Departure,
      scheduledArrival: leg1Arrival,
      status: 'SCHEDULED'
    },
    {
      id: leg2Id,
      flightNumber: `6E-${seq + 1}`,
      airlineCode: '6E',
      originAirportCode: hub,
      destinationAirportCode: destination,
      scheduledDeparture: leg2Departure,
      scheduledArrival: leg2Arrival,
      status: 'SCHEDULED'
    }
  ];

  const fares = [];
  for (const cabin of CABIN_CLASSES) {
    fares.push({
      id: randomUUID(),
      flightId: leg1Id,
      cabinClass: cabin,
      baseFare: Math.round(fareLeg1 * CABIN_MULTIPLIERS[cabin] * 100) / 100,
      taxPercentage: 18.0,
      seatsAvailable: CABIN_SEATS[cabin],
      baggageAllowance: '15kg'
    });
    fares.push({
      id: randomUUID(),
      flightId: leg2Id,
      cabinClass: cabin,
      baseFare: Math.round(fareLeg2 * CABIN_MULTIPLIERS[cabin] * 100) / 100,
      taxPercentage: 18.0,
      seatsAvailable: CABIN_SEATS[cabin],
      baggageAllowance: '15kg'
    });
  }

  return { flights, fares };
}

/**
 * Ensures that authentic flight schedules and fares exist in SQLite for the requested route and date.
 * If schedules already exist, it immediately returns with zero overhead.
 */
async function ensureFlightSchedules({ origin, destination, travelDate }) {
  if (!origin || !destination || !travelDate) return;
  if (origin === destination) return;

  const dateParts = String(travelDate).trim().split('-').map(Number);
  if (dateParts.length !== 3 || dateParts.some(isNaN)) return;

  const [year, month, day] = dateParts;
  const departureWindowStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const departureWindowEnd   = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  // Boundary guard: do not synthesize schedules for past dates or dates beyond 90 days
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const todayLocal = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  const minTodayStart = new Date(Math.min(todayUtc.getTime(), todayLocal.getTime()));
  const maxAllowedDate = new Date(minTodayStart.getTime() + 90 * 24 * 60 * 60 * 1000 + 86399999);

  if (departureWindowEnd < minTodayStart || departureWindowStart > maxAllowedDate) {
    return;
  }

  // 1. Check if direct flights already exist for this date
  const existingCount = await Flight.count({
    where: {
      originAirportCode: origin,
      destinationAirportCode: destination,
      status: 'SCHEDULED',
      scheduledDeparture: {
        [Op.gte]: departureWindowStart,
        [Op.lte]: departureWindowEnd
      }
    }
  });

  if (existingCount >= 3) {
    // Route already well-serviced for this travel date
    return;
  }

  // 2. Synthesize direct flight schedules
  const { flights: directFlights, fares: directFares } = buildDirectFlightPayloads(origin, destination, travelDate);

  // 3. Synthesize connecting flights via a national transit hub
  const hubCandidates = NATIONAL_HUBS.filter(h => h !== origin && h !== destination);
  const transitHub = hubCandidates[0] || 'DEL';
  const { flights: hubFlights, fares: hubFares } = buildHubConnectingPayloads(origin, destination, travelDate, transitHub);

  const allFlights = [...directFlights, ...hubFlights];
  const allFares   = [...directFares, ...hubFares];

  // 4. Atomic bulk persistence into SQLite
  const dbInstance = sequelize || Flight.sequelize;
  await dbInstance.transaction(async (t) => {
    await Flight.bulkCreate(allFlights, { ignoreDuplicates: true, transaction: t });
    await FlightFare.bulkCreate(allFares, { ignoreDuplicates: true, transaction: t });
  });
}

module.exports = {
  ensureFlightSchedules,
  estimateFlightDuration,
  estimateBaseFare
};
