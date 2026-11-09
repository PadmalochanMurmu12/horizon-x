const { Op } = require('sequelize');
const { Flight, Airline, Location, FlightFare } = require('../models');

/**
 * Formats date/time for public flight board.
 */
function formatDateTime(dateInput) {
  if (!dateInput) return 'TBA';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return `${dateStr}, ${timeStr} UTC`;
}

/**
 * GET /api/flight-status
 * Public Flight Status Radar & Departures Board.
 * Open to public travelers — requires NO authentication token.
 * Supports filtering by flightNumber, origin, destination, and date.
 */
async function getPublicFlightStatus(req, res) {
  try {
    const { flightNumber, origin, destination, date } = req.query;

    const whereConditions = {};

    if (flightNumber) {
      whereConditions.flightNumber = {
        [Op.like]: `%${flightNumber.trim().toUpperCase()}%`
      };
    }

    if (origin) {
      whereConditions.originAirportCode = origin.trim().toUpperCase();
    }

    if (destination) {
      whereConditions.destinationAirportCode = destination.trim().toUpperCase();
    }

    if (date) {
      const parsedDate = new Date(date.trim());
      if (!isNaN(parsedDate.getTime())) {
        const startOfDay = new Date(parsedDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(parsedDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        whereConditions.scheduledDeparture = {
          [Op.between]: [startOfDay, endOfDay]
        };
      }
    }

    const flights = await Flight.findAll({
      where: whereConditions,
      include: [
        { model: Airline, as: 'airlineData', attributes: ['name', 'iataCode'] },
        { model: Location, as: 'originData', attributes: ['cityName', 'airportCode'] },
        { model: Location, as: 'destinationData', attributes: ['cityName', 'airportCode'] },
        { model: FlightFare, as: 'fares' }
      ],
      order: [['scheduledDeparture', 'ASC']],
      limit: flightNumber ? 10 : 25
    });

    const flightManifest = flights.map(f => {
      const depDate = new Date(f.scheduledDeparture);
      const arrDate = new Date(f.scheduledArrival);
      let durationMinutes = 120;
      if (!isNaN(depDate.getTime()) && !isNaN(arrDate.getTime())) {
        durationMinutes = Math.round((arrDate - depDate) / (1000 * 60));
      }

      // Generate deterministic terminal and gate for live radar display
      const terminal = f.originAirportCode === 'DEL' ? 'T3' : f.originAirportCode === 'BOM' ? 'T2' : 'T1';
      const gateNum = 10 + (Math.abs(f.flightNumber.charCodeAt(f.flightNumber.length - 1)) % 15);
      const gateLetter = String.fromCharCode(65 + (Math.abs(f.flightNumber.charCodeAt(0)) % 4));

      return {
        flightNumber: f.flightNumber,
        airline: {
          name: f.airlineData?.name || f.airlineCode,
          code: f.airlineCode,
          iataCode: f.airlineData?.iataCode || f.airlineCode
        },
        origin: {
          airportCode: f.originAirportCode,
          city: f.originData?.cityName || f.originAirportCode
        },
        destination: {
          airportCode: f.destinationAirportCode,
          city: f.destinationData?.cityName || f.destinationAirportCode
        },
        scheduledDeparture: f.scheduledDeparture,
        scheduledArrival: f.scheduledArrival,
        departureTimeFormatted: formatDateTime(f.scheduledDeparture),
        arrivalTimeFormatted: formatDateTime(f.scheduledArrival),
        durationMinutes,
        flightStatus: f.status || 'SCHEDULED',
        operationalRemarks: f.status === 'COMPLETED'
          ? 'Arrived at Destination'
          : f.status === 'CANCELLED'
          ? 'Flight Cancelled by Carrier'
          : 'On Time • Gates close 25m prior',
        terminal,
        gate: `Gate ${gateNum}${gateLetter}`
      };
    });

    return res.status(200).json({
      success: true,
      count: flightManifest.length,
      message: flightManifest.length > 0
        ? 'Public flight status manifest retrieved successfully.'
        : 'No operational flights found matching query criteria.',
      data: flightManifest
    });

  } catch (error) {
    console.error('Public Flight Status Lookup Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Encountered unexpected radar interference while loading flight status.'
    });
  }
}

module.exports = {
  getPublicFlightStatus
};
