// Map registry of operational civilian airport systems across Indian States & UTs
const ACTIVE_AIRPORTS = [
  // Major Metro State Hubs
  { airportCode: 'DEL', cityName: 'Delhi', stateOrUt: 'Delhi', isAccessible: true },
  { airportCode: 'BOM', cityName: 'Mumbai', stateOrUt: 'Maharashtra', isAccessible: true },
  { airportCode: 'BLR', cityName: 'Bengaluru', stateOrUt: 'Karnataka', isAccessible: true },
  { airportCode: 'CCU', cityName: 'Kolkata', stateOrUt: 'West Bengal', isAccessible: true },
  { airportCode: 'MAA', cityName: 'Chennai', stateOrUt: 'Tamil Nadu', isAccessible: true },
  { airportCode: 'HYD', cityName: 'Hyderabad', stateOrUt: 'Telangana', isAccessible: true },

  // Key Tier-2 & Regional State Airports
  { airportCode: 'PNQ', cityName: 'Pune', stateOrUt: 'Maharashtra', isAccessible: true },
  { airportCode: 'NAG', cityName: 'Nagpur', stateOrUt: 'Maharashtra', isAccessible: true },
  { airportCode: 'AMD', cityName: 'Ahmedabad', stateOrUt: 'Gujarat', isAccessible: true },
  { airportCode: 'STV', cityName: 'Surat', stateOrUt: 'Gujarat', isAccessible: true },
  { airportCode: 'COK', cityName: 'Kochi', stateOrUt: 'Kerala', isAccessible: true },
  { airportCode: 'TRV', cityName: 'Thiruvananthapuram', stateOrUt: 'Kerala', isAccessible: true },
  { airportCode: 'LKO', cityName: 'Lucknow', stateOrUt: 'Uttar Pradesh', isAccessible: true },
  { airportCode: 'VNS', cityName: 'Varanasi', stateOrUt: 'Uttar Pradesh', isAccessible: true },
  { airportCode: 'JAI', cityName: 'Jaipur', stateOrUt: 'Rajasthan', isAccessible: true },
  { airportCode: 'ATQ', cityName: 'Amritsar', stateOrUt: 'Punjab', isAccessible: true },
  { airportCode: 'PAT', cityName: 'Patna', stateOrUt: 'Bihar', isAccessible: true },
  { airportCode: 'GAU', cityName: 'Guwahati', stateOrUt: 'Assam', isAccessible: true },
  { airportCode: 'BBI', cityName: 'Bhubaneswar', stateOrUt: 'Odisha', isAccessible: true },
  { airportCode: 'IDR', cityName: 'Indore', stateOrUt: 'Madhya Pradesh', isAccessible: true },
  { airportCode: 'BHO', cityName: 'Bhopal', stateOrUt: 'Madhya Pradesh', isAccessible: true },
  { airportCode: 'IXR', cityName: 'Ranchi', stateOrUt: 'Jharkhand', isAccessible: true },
  { airportCode: 'VTZ', cityName: 'Visakhapatnam', stateOrUt: 'Andhra Pradesh', isAccessible: true },

  // Operational Union Territory (UT) Bases
  { airportCode: 'GOI', cityName: 'Dabolim', stateOrUt: 'Goa', isAccessible: true },
  { airportCode: 'SXR', cityName: 'Srinagar', stateOrUt: 'Jammu & Kashmir', isAccessible: true },
  { airportCode: 'IXC', cityName: 'Chandigarh', stateOrUt: 'Chandigarh', isAccessible: true },
  { airportCode: 'IXZ', cityName: 'Port Blair', stateOrUt: 'Andaman and Nicobar Islands', isAccessible: true }
];

module.exports = ACTIVE_AIRPORTS;