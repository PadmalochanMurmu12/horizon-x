const itineraryService = require('../services/itinerary.service');
const { buildClientResponse } = require('../utils/itinerary.mapper');

async function searchItineraries(req, res) {
  try {
    const { tripType = 'ONEWAY', legs, cabinClass = 'ECONOMY', paxCounts } = req.body;

    // 1. Validate 'legs' array presence
    if (!Array.isArray(legs) || legs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Flight itinerary search requires at least one flight sector.'
      });
    }

    // 2. Validate Trip Type constraints
    if (tripType === 'ONEWAY' && legs.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'One-way journeys require exactly 1 flight sector.'
      });
    }
    if (tripType === 'ROUND_TRIP' && legs.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Round-trip journeys require exactly 2 flight sectors (outbound and return).'
      });
    }
    if (tripType === 'MULTI_CITY' && legs.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Multi-city journeys require at least 2 flight sectors.'
      });
    }

    // 3. Normalize & Validate Each Leg
    const sanitizedLegs = [];
    let previousDate = null;

    const now = new Date();
    // Calculate current day boundary (00:00:00 UTC) taking local/UTC timezones into account
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const todayLocal = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    const currentDayBoundary = new Date(Math.min(todayUtc.getTime(), todayLocal.getTime()));
    const MAX_ADVANCE_DAYS = 90;
    const maxAllowedDate = new Date(currentDayBoundary.getTime() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000 + 86399999);

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const origin = leg.origin?.trim().toUpperCase();
      const destination = leg.destination?.trim().toUpperCase();

      if (!origin || !destination) {
        return res.status(400).json({
          success: false,
          message: `Sector ${i + 1} contains an invalid origin or destination airport.`
        });
      }

      if (origin === destination) {
        return res.status(400).json({
          success: false,
          message: `Departure airport and arrival airport cannot be identical for Sector ${i + 1}.`
        });
      }

      // Format & Validity Check for Travel Date (YYYY-MM-DD)
      const rawDateStr = String(leg.travelDate || '').trim();
      const dateParts = rawDateStr.split('-').map(Number);
      if (dateParts.length !== 3 || dateParts.some(isNaN)) {
        return res.status(400).json({
          success: false,
          message: `Sector ${i + 1} contains an unrecognised departure date format: "${leg.travelDate}". Expected YYYY-MM-DD.`
        });
      }

      const [year, month, day] = dateParts;
      const legDateUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      if (isNaN(legDateUtc.getTime())) {
        return res.status(400).json({
          success: false,
          message: `Sector ${i + 1} contains an invalid departure date.`
        });
      }

      // Date Boundary Enforcement: Current day and future days only (up to 90 days from current day)
      if (legDateUtc < currentDayBoundary) {
        return res.status(400).json({
          success: false,
          message: `Sector ${i + 1} departure date cannot be in the past. Flight bookings are only permitted for the current day and future dates up to 90 days.`
        });
      }

      if (legDateUtc > maxAllowedDate) {
        return res.status(400).json({
          success: false,
          message: `Sector ${i + 1} departure date exceeds the 90-day booking limit. Flight schedules can only be reserved up to 90 days from the current day.`
        });
      }

      // Chronological Validation (Leg N+1 cannot occur before Leg N)
      if (previousDate && legDateUtc < previousDate) {
        return res.status(400).json({
          success: false,
          message: `Chronological flight sequence error: Sector ${i + 1} cannot depart earlier than Sector ${i}.`
        });
      }
      previousDate = legDateUtc;

      sanitizedLegs.push({
        origin,
        destination,
        travelDate: rawDateStr // Keep original formatted string YYYY-MM-DD
      });
    }

    // 4. Validate Passenger Counts
    const adults = Number(paxCounts?.adults ?? 1);
    const children = Number(paxCounts?.children ?? 0);
    const infants = Number(paxCounts?.infants ?? 0);

    if (adults < 1 || children < 0 || infants < 0) {
      return res.status(400).json({
        success: false,
        message: 'Passenger manifest error: Every booking requires at least one adult passenger (age 12+).'
      });
    }

    if (infants > adults) {
      return res.status(400).json({
        success: false,
        message: 'Aviation safety regulation: Each infant must be accompanied by an adult passenger.'
      });
    }

    const validPax = { adults, children, infants };

    // 5. Ensure flight schedules exist sequentially to prevent SQLite write-lock contention
    for (const leg of sanitizedLegs) {
      await itineraryService.ensureFlightSchedules({
        origin: leg.origin,
        destination: leg.destination,
        travelDate: leg.travelDate
      });
    }

    // 6. Parallel Engine Execution for ALL Legs
    // We execute direct + layover searches concurrently for each leg in parallel
    const legResults = await Promise.all(
      sanitizedLegs.map(async (leg) => {
        const searchPayload = {
          origin: leg.origin,
          destination: leg.destination,
          travelDate: leg.travelDate,
          cabinClass: cabinClass,
          paxCounts: validPax
        };

        const [direct, layover] = await Promise.all([
          itineraryService.getDirectFlights(searchPayload),
          itineraryService.getLayoverFlights(searchPayload)
        ]);

        return {
          legInfo: leg,
          itineraries: buildClientResponse(direct, layover, validPax)
        };
      })
    );

    // 7. Return Payload grouped by Leg
    return res.status(200).json({
      success: true,
      meta: {
        tripType,
        totalLegs: legResults.length,
        cabinClass
      },
      data: legResults
    });

  } catch (error) {
    console.error('Search API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Encountered unexpected turbulence while retrieving flight schedules. Please try again shortly.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = { searchItineraries };
