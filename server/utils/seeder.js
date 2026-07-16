const Location = require('../models/Location');
const Airline = require('../models/Airline');
const Flight = require('../models/Flight');

const ACTIVE_AIRPORTS = require('../constants/ActiveAirports');
const ACTIVE_AIRLINES = require('../constants/ActiveAirlines');

/**
 * Automator function to check database state and inject baseline configurations safely
 */
async function seedDatabase() {
  try {
    console.log('🔄 Checking system database infrastructure configurations...');

    // 1. Geography Check - Only populates if the table is completely brand new
    const locationCount = await Location.count();
    if (locationCount === 0) {
      await Location.bulkCreate(ACTIVE_AIRPORTS);
      console.log(`✅ Automated Seed: Mapped ${ACTIVE_AIRPORTS.length} operational Indian airport sectors.`);
    }

    // 2. Fleet Inventory Check - Only populates if the table is completely brand new
    const airlineCount = await Airline.count();
    if (airlineCount === 0) {
      await Airline.bulkCreate(ACTIVE_AIRLINES);
      console.log(`✅ Automated Seed: Certified ${ACTIVE_AIRLINES.length} flight carrier registries.`);
    }

    // 3. Flight Segments Check - Baseline schedules for search validation
    const flightCount = await Flight.count();
    if (flightCount === 0) {
      await Flight.bulkCreate([
        { flightNumber: 'AI-805', airline: 'Air India', origin: 'DEL', destination: 'BOM', price: 5800.00 },
        { flightNumber: '6E-2134', airline: 'IndiGo', origin: 'DEL', destination: 'BOM', price: 4200.00 },
        { flightNumber: '6E-501', airline: 'IndiGo', origin: 'BLR', destination: 'DEL', price: 6100.00 },
        { flightNumber: 'AI-411', airline: 'Air India', origin: 'CCU', destination: 'BLR', price: 7200.00 }
      ]);
      console.log('✅ Automated Seed: Active baseline flight lines populated.');
    }

    console.log('🚀 Database baseline states synchronized successfully.');
  } catch (error) {
    console.error('❌ Automated Seeder Error encountered:', error.message);
  }
}

module.exports = seedDatabase;