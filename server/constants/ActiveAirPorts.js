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
  { airportCode: 'IXZ', cityName: 'Port Blair', stateOrUt: 'Andaman and Nicobar Islands', isAccessible: true },

  // Goa New Greenfield Airport (Supplementing GOI which was excluded)
  { "airportCode": "GOX", "cityName": "Mopa", "stateOrUt": "Goa", "isAccessible": true },

  // Kerala & Southern India Hubs
  { "airportCode": "CCJ", "cityName": "Kozhikode", "stateOrUt": "Kerala", "isAccessible": true },
  { "airportCode": "CNN", "cityName": "Kannur", "stateOrUt": "Kerala", "isAccessible": true },
  { "airportCode": "IXE", "cityName": "Mangaluru", "stateOrUt": "Karnataka", "isAccessible": true },
  { "airportCode": "CJB", "cityName": "Coimbatore", "stateOrUt": "Tamil Nadu", "isAccessible": true },
  { "airportCode": "TRZ", "cityName": "Tiruchirappalli", "stateOrUt": "Tamil Nadu", "isAccessible": true },
  { "airportCode": "IXM", "cityName": "Madurai", "stateOrUt": "Tamil Nadu", "isAccessible": true },
  { "airportCode": "VGA", "cityName": "Vijayawada", "stateOrUt": "Andhra Pradesh", "isAccessible": true },
  { "airportCode": "TIR", "cityName": "Tirupati", "stateOrUt": "Andhra Pradesh", "isAccessible": true },
  { "airportCode": "RJA", "cityName": "Rajahmundry", "stateOrUt": "Andhra Pradesh", "isAccessible": true },
  { "airportCode": "CDP", "cityName": "Kadapa", "stateOrUt": "Andhra Pradesh", "isAccessible": true },
  { "airportCode": "KJB", "cityName": "Kurnool", "stateOrUt": "Andhra Pradesh", "isAccessible": true },

  // Western India Regional Pockets
  { "airportCode": "BDQ", "cityName": "Vadodara", "stateOrUt": "Gujarat", "isAccessible": true },
  { "airportCode": "RAJ", "cityName": "Rajkot (Hirasar)", "stateOrUt": "Gujarat", "isAccessible": true },
  { "airportCode": "BHU", "cityName": "Bhavnagar", "stateOrUt": "Gujarat", "isAccessible": true },
  { "airportCode": "BHJ", "cityName": "Bhuj", "stateOrUt": "Gujarat", "isAccessible": true },
  { "airportCode": "IXY", "cityName": "Kandla", "stateOrUt": "Gujarat", "isAccessible": true },
  { "airportCode": "JGA", "cityName": "Jamnagar", "stateOrUt": "Gujarat", "isAccessible": true },
  { "airportCode": "PBD", "cityName": "Porbandar", "stateOrUt": "Gujarat", "isAccessible": true },
  { "airportCode": "SAG", "cityName": "Shirdi", "stateOrUt": "Maharashtra", "isAccessible": true },
  { "airportCode": "IXU", "cityName": "Aurangabad", "stateOrUt": "Maharashtra", "isAccessible": true },
  { "airportCode": "NRE", "cityName": "Kolhapur", "stateOrUt": "Maharashtra", "isAccessible": true },
  { "airportCode": "SND", "cityName": "Sindhudurg", "stateOrUt": "Maharashtra", "isAccessible": true },
  { "airportCode": "NWR", "cityName": "Navi Mumbai", "stateOrUt": "Maharashtra", "isAccessible": true },

  // Eastern & Central India Hubs
  { "airportCode": "IXB", "cityName": "Siliguri / Bagdogra", "stateOrUt": "West Bengal", "isAccessible": true },
  { "airportCode": "RPR", "cityName": "Raipur", "stateOrUt": "Chhattisgarh", "isAccessible": true },
  { "airportCode": "GAY", "cityName": "Gaya", "stateOrUt": "Bihar", "isAccessible": true },
  { "airportCode": "DBR", "cityName": "Darbhanga", "stateOrUt": "Bihar", "isAccessible": true },
  { "airportCode": "PXN", "cityName": "Purnea", "stateOrUt": "Bihar", "isAccessible": true },
  { "airportCode": "JRG", "cityName": "Jharsuguda", "stateOrUt": "Odisha", "isAccessible": true },
  { "airportCode": "IXW", "cityName": "Jamshedpur", "stateOrUt": "Jharkhand", "isAccessible": true },
  { "airportCode": "DGR", "cityName": "Durgapur", "stateOrUt": "West Bengal", "isAccessible": true },
  { "airportCode": "GWL", "cityName": "Gwalior", "stateOrUt": "Madhya Pradesh", "isAccessible": true },
  { "airportCode": "JBP", "cityName": "Jabalpur", "stateOrUt": "Madhya Pradesh", "isAccessible": true },
  { "airportCode": "HJR", "cityName": "Khajuraho", "stateOrUt": "Madhya Pradesh", "isAccessible": true },

  // Northern & North-Western States
  { "airportCode": "AGR", "cityName": "Agra", "stateOrUt": "Uttar Pradesh", "isAccessible": true },
  { "airportCode": "IXD", "cityName": "Prayagraj", "stateOrUt": "Uttar Pradesh", "isAccessible": true },
  { "airportCode": "GOP", "cityName": "Gorakhpur", "stateOrUt": "Uttar Pradesh", "isAccessible": true },
  { "airportCode": "AYO", "cityName": "Ayodhya", "stateOrUt": "Uttar Pradesh", "isAccessible": true },
  { "airportCode": "HSR", "cityName": "Hisar", "stateOrUt": "Haryana", "isAccessible": true },
  { "airportCode": "IXP", "cityName": "Pathankot", "stateOrUt": "Punjab", "isAccessible": true },
  { "airportCode": "LUH", "cityName": "Ludhiana", "stateOrUt": "Punjab", "isAccessible": true },
  { "airportCode": "IXJ", "cityName": "Jammu", "stateOrUt": "Jammu & Kashmir", "isAccessible": true },
  { "airportCode": "IXL", "cityName": "Leh", "stateOrUt": "Ladakh", "isAccessible": true },
  { "airportCode": "DED", "cityName": "Dehradun", "stateOrUt": "Uttarakhand", "isAccessible": true },
  { "airportCode": "PGH", "cityName": "Pantnagar", "stateOrUt": "Uttarakhand", "isAccessible": true },
  { "airportCode": "SLN", "cityName": "Shimla", "stateOrUt": "Himachal Pradesh", "isAccessible": true },
  { "airportCode": "KUU", "cityName": "Kullu / Bhuntar", "stateOrUt": "Himachal Pradesh", "isAccessible": true },
  { "airportCode": "DHM", "cityName": "Dharamshala", "stateOrUt": "Himachal Pradesh", "isAccessible": true },
  { "airportCode": "JDH", "cityName": "Jodhpur", "stateOrUt": "Rajasthan", "isAccessible": true },
  { "airportCode": "UDR", "cityName": "Udaipur", "stateOrUt": "Rajasthan", "isAccessible": true },
  { "airportCode": "IXG", "cityName": "Belagavi", "stateOrUt": "Karnataka", "isAccessible": true },
  { "airportCode": "HBX", "cityName": "Hubballi", "stateOrUt": "Karnataka", "isAccessible": true },
  { "airportCode": "MYQ", "cityName": "Mysuru", "stateOrUt": "Karnataka", "isAccessible": true },
  { "airportCode": "VDY", "cityName": "Ballari / Vidyanagar", "stateOrUt": "Karnataka", "isAccessible": true },
  { "airportCode": "BKB", "cityName": "Bikaner", "stateOrUt": "Rajasthan", "isAccessible": true },
  { "airportCode": "KTU", "cityName": "Kota", "stateOrUt": "Rajasthan", "isAccessible": true },
  { "airportCode": "JSA", "cityName": "Jaisalmer", "stateOrUt": "Rajasthan", "isAccessible": true },

  // North-Eastern Frontier States
  { "airportCode": "IMF", "cityName": "Imphal", "stateOrUt": "Manipur", "isAccessible": true },
  { "airportCode": "AJL", "cityName": "Aizawl", "stateOrUt": "Mizoram", "isAccessible": true },
  { "airportCode": "DMU", "cityName": "Dimapur", "stateOrUt": "Nagaland", "isAccessible": true },
  { "airportCode": "IXA", "cityName": "Agartala", "stateOrUt": "Tripura", "isAccessible": true },
  { "airportCode": "SHL", "cityName": "Shillong", "stateOrUt": "Meghalaya", "isAccessible": true },
  { "airportCode": "DIB", "cityName": "Dibrugarh", "stateOrUt": "Assam", "isAccessible": true },
  { "airportCode": "IXS", "cityName": "Silchar", "stateOrUt": "Assam", "isAccessible": true },
  { "airportCode": "JRH", "cityName": "Jorhat", "stateOrUt": "Assam", "isAccessible": true },
  { "airportCode": "TEZ", "cityName": "Tezpur", "stateOrUt": "Assam", "isAccessible": true },
  { "airportCode": "IXI", "cityName": "Lilabari", "stateOrUt": "Assam", "isAccessible": true },
  { "airportCode": "RUP", "cityName": "Rupsi", "stateOrUt": "Assam", "isAccessible": true },
  { "airportCode": "HGI", "cityName": "Itanagar (Donyi Polo)", "stateOrUt": "Arunachal Pradesh", "isAccessible": true },
  { "airportCode": "IXT", "cityName": "Pasighat", "stateOrUt": "Arunachal Pradesh", "isAccessible": true },
  { "airportCode": "TEI", "cityName": "Tezu", "stateOrUt": "Arunachal Pradesh", "isAccessible": true },
  { "airportCode": "PYG", "cityName": "Pakyong", "stateOrUt": "Sikkim", "isAccessible": true },

  // Other Union Territories & Island Bases
  { "airportCode": "DIU", "cityName": "Diu", "stateOrUt": "Dadra and Nagar Haveli and Daman and Diu", "isAccessible": true },
  { "airportCode": "AGX", "cityName": "Agatti", "stateOrUt": "Lakshadweep", "isAccessible": true }

]

module.exports = ACTIVE_AIRPORTS;