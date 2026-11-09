const { MAX_RESULTS_PER_LEG } = require('../constants/searchRules');

function calculateDurationMinutes(start, end) {
  if (!start || !end) return 0;
  return Math.round((new Date(end) - new Date(start)) / 60000);
}

function getAircraftByAirline(airlineCode) {
  switch (airlineCode) {
    case 'IX': return 'Boeing 737-800';
    case 'QP': return 'Boeing 737 MAX 8';
    case 'SG': return 'Boeing 737-800';
    case '6E': return 'Airbus A320neo';
    case 'AI': return 'Airbus A320-200';
    case '9I': return 'ATR 72-600';
    case 'S5': return 'Embraer E175';
    case 'IC': return 'ATR 72-600';
    default:   return 'Airbus A320-200';
  }
}

function calculateFare(flightFares = [], paxCounts = {}) {
  const { adults = 1, children = 0, infants = 0 } = paxCounts;

  const totalBase = flightFares.reduce((sum, fare) => {
    const baseFare = Number(fare?.baseFare || 0);
    const adultChildCost = (adults + children) * baseFare;
    const infantCost = infants * (baseFare * 0.2); // Aviation industry standard: infant lap fare is 20%
    return sum + adultChildCost + infantCost;
  }, 0);

  const taxRate = Number(flightFares[0]?.taxPercentage || 18);
  const totalTax = totalBase * (taxRate / 100);

  return {
    baseFare: Math.round(totalBase),
    tax: Math.round(totalTax),
    totalFare: Math.round(totalBase + totalTax),
    currency: 'INR'
  };
}

function formatItinerary(legs, paxCounts) {
  // Guard 1: Abort if legs is missing, empty, or legs[0] is undefined
  if (!Array.isArray(legs) || legs.length === 0 || !legs[0]) {
    return null;
  }

  const isDirect = legs.length === 1;
  const departure = legs[0]?.scheduledDeparture;
  const arrival = legs[legs.length - 1]?.scheduledArrival;

  // Guard 2: Abort if timestamps are missing
  if (!departure || !arrival) {
    return null;
  }

  const totalDuration = calculateDurationMinutes(departure, arrival);
  const fares = legs.map(leg => leg?.fares?.[0] || leg?.FlightFares?.[0] || {});

  return {
    id: legs.map(l => l.flightNumber).join('-'),
    isDirect,
    totalDuration,
    departureTime: departure,
    arrivalTime: arrival,
    layovers: isDirect ? [] : [{
      airport: legs[0].destinationAirportCode,
      duration: calculateDurationMinutes(legs[0].scheduledArrival, legs[1]?.scheduledDeparture)
    }],
    segments: legs.map(leg => {
      const fare = leg?.fares?.[0] || {};
      const airlineName = leg?.airlineData?.name || leg?.Airline?.name || leg?.airlineCode || 'Horizon-X Fleet';

      return {
        flightId: leg.id,
        flightNumber: leg.flightNumber,
        airline: {
          code: leg.airlineCode,
          name: airlineName
        },
        aircraft: leg.aircraftType || getAircraftByAirline(leg.airlineCode),
        origin: leg.originAirportCode,
        destination: leg.destinationAirportCode,
        departureTime: leg.scheduledDeparture,
        arrivalTime: leg.scheduledArrival,
        durationMinutes: calculateDurationMinutes(leg.scheduledDeparture, leg.scheduledArrival),
        cabinClass: fare.cabinClass || 'ECONOMY',
        baggage: fare.baggageAllowance || '15 KG'
      };
    }),
    pricing: calculateFare(fares, paxCounts)
  };
}

function buildClientResponse(direct = [], layovers = [], paxCounts = {}) {
  const safeDirect = Array.isArray(direct) ? direct : [];
  const safeLayovers = Array.isArray(layovers) ? layovers : [];

  // Filter out null/undefined direct flights before mapping
  const formattedDirect = safeDirect
    .filter(flight => Boolean(flight))
    .map(flight => formatItinerary([flight], paxCounts))
    .filter(Boolean);

  // Filter out empty or incomplete layover pairs before mapping
  const formattedLayovers = safeLayovers
    .filter(pair => Array.isArray(pair) && pair.length > 0 && pair.every(Boolean))
    .map(pair => formatItinerary(pair, paxCounts))
    .filter(Boolean);

  return [...formattedDirect, ...formattedLayovers]
    .sort((a, b) => a.pricing.totalFare - b.pricing.totalFare || a.totalDuration - b.totalDuration)
    .slice(0, MAX_RESULTS_PER_LEG);
}

module.exports = { buildClientResponse };
