const { randomUUID } = require('crypto'); // Built-in Node.js — no extra dependency needed
const ACTIVE_AIRLINES = require('../constants/ActiveAirlines');
const ACTIVE_AIRPORTS = require('../constants/ActiveAirPorts');
const { CABIN_CLASSES, CABIN_MULTIPLIERS, CABIN_SEATS } = require('../constants/flight.constant');
const { Flight, FlightFare, Airline, Location, sequelize } = require('../models');

/**
 * Creates a UTC ISO timestamp offset by `daysFromToday` days at a specific hour:minute.
 * All times are anchored to UTC to avoid daylight-saving drift across environments.
 */
const createUTCDate = (daysFromToday, hour, minute) => {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysFromToday,
    hour,
    minute,
    0,
    0
  )).toISOString();
};

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seedDatabase() {
  try {
    console.log('🌱 Initializing Horizon-X flight database seeder...');

    const activeAirlines = ACTIVE_AIRLINES.filter(a => a.isInService);
    const availablePrefixes = activeAirlines.map(a => a.iataCode);

    // Limit seed graph to top 12 airports to keep the SQLite file manageable
    // (12 airports → 132 routes → ~3,960 flights over 15 days)
    const availableAirports = ACTIVE_AIRPORTS
      .filter(a => a.isAccessible)
      .slice(0, 12)
      .map(a => a.airportCode);

    if (availablePrefixes.length === 0 || availableAirports.length < 2) {
      throw new Error('Seeder requires at least 1 active airline and 2 accessible airports.');
    }

    // Build every origin → destination permutation (excluding self-routes)
    const dynamicRoutes = [];
    for (const origin of availableAirports) {
      for (const destination of availableAirports) {
        if (origin !== destination) dynamicRoutes.push({ origin, destination });
      }
    }

    console.log(`📡 Mapped ${dynamicRoutes.length} route pairs across ${availableAirports.length} airports.`);

    const dbInstance = sequelize || Flight.sequelize;

    await dbInstance.transaction(async (t) => {
      // Seed reference data first
      await Airline.bulkCreate(ACTIVE_AIRLINES, { ignoreDuplicates: true, transaction: t });
      await Location.bulkCreate(ACTIVE_AIRPORTS, { ignoreDuplicates: true, transaction: t });

      const DAYS_TO_SEED = 15;
      const FLIGHTS_PER_ROUTE_PER_DAY = 2;
      let sequenceCounter = 1000;

      const flightPayloads = [];
      const farePayloads   = [];

      for (let dayOffset = 0; dayOffset < DAYS_TO_SEED; dayOffset++) {
        for (const route of dynamicRoutes) {
          for (let f = 0; f < FLIGHTS_PER_ROUTE_PER_DAY; f++) {
            // FIX (C5): Generate a proper UUID v4 for each flight so the primary key
            // matches the DataTypes.UUID column declaration, and FK joins work correctly.
            const flightId = randomUUID();

            const prefix       = availablePrefixes[getRandomInt(0, availablePrefixes.length - 1)];
            const flightNumber = `${prefix}-${sequenceCounter++}`;

            const deptHour    = getRandomInt(5, 20);
            const deptMinute  = getRandomInt(0, 3) * 15; // 0, 15, 30 or 45
            const durationHrs = getRandomInt(1, 4);

            const scheduledDeparture = createUTCDate(dayOffset, deptHour, deptMinute);
            const scheduledArrival   = createUTCDate(dayOffset, deptHour + durationHrs, deptMinute);

            flightPayloads.push({
              id: flightId,            // ← proper UUID string, not an integer
              flightNumber,
              airlineCode: prefix,
              originAirportCode: route.origin,
              destinationAirportCode: route.destination,
              scheduledDeparture,
              scheduledArrival,
              status: 'SCHEDULED'
            });

            const baseFarePrice = getRandomInt(3000, 7000);

            for (const cabin of CABIN_CLASSES) {
              farePayloads.push({
                flightId,             // ← UUID string FK — matches Flight.id correctly
                cabinClass: cabin,
                baseFare: Math.round(baseFarePrice * CABIN_MULTIPLIERS[cabin] * 100) / 100,
                seatsAvailable: CABIN_SEATS[cabin]
              });
            }
          }
        }
      }

      // Two bulk writes instead of hundreds of thousands of individual ORM calls
      console.log(`⚡ Bulk inserting ${flightPayloads.length} flights and ${farePayloads.length} fares...`);
      await Flight.bulkCreate(flightPayloads, { transaction: t });
      await FlightFare.bulkCreate(farePayloads, { transaction: t });
    });

    console.log('✅ Flight database loaded and ready for departure.');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

module.exports = { seedDatabase };
