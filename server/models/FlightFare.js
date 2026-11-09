module.exports = (sequelize, DataTypes) => {
  const FlightFare = sequelize.define('FlightFare', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    flightId: { type: DataTypes.UUID, allowNull: false },
    cabinClass: {
      type: DataTypes.ENUM('ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'),
      allowNull: false
    },
    // DECIMAL(10,2) prevents IEEE 754 floating-point drift on monetary values
    baseFare: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    taxPercentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 18.0 },
    seatsAvailable: { type: DataTypes.INTEGER, allowNull: false },
    baggageAllowance: { type: DataTypes.STRING, defaultValue: '15kg' }
  }, {
    tableName: 'FlightFares',
    indexes: [
      { name: 'idx_fares_lookup', fields: ['flightId', 'cabinClass', 'seatsAvailable'] }
    ]
  });

  return FlightFare;
};
