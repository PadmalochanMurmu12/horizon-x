// Master registry of active, scheduled regional and mainline fleet carriers in India
const ACTIVE_AIRLINES = [
  { iataCode: '6E', name: 'IndiGo', isInService: true },
  { iataCode: 'AI', name: 'Air India', isInService: true },        // Post-Vistara operational merger consolidation
  { iataCode: 'IX', name: 'Air India Express', isInService: true }, // Integrated low-cost carrier operation system
  { iataCode: 'QP', name: 'Akasa Air', isInService: true },
  { iataCode: 'SG', name: 'SpiceJet', isInService: true },
  { iataCode: '9I', name: 'Alliance Air', isInService: true },     // Operating regional networks under UDAN parameters
  { iataCode: 'S5', name: 'Star Air', isInService: true },         // Specialized regional connectivity carrier
  { iataCode: 'IC', name: 'Fly91', isInService: true },            // Goa-based regional leisure operator
  { iataCode: 'I7', name: 'IndiaOne Air', isInService: true },     // Small aircraft short regional routes asset
  { iataCode: 'G8', name: 'Go Air', isInService: false }           // Retained as out-of-service for testing failure validation rules
];

module.exports = ACTIVE_AIRLINES;