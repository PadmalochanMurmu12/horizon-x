module.exports = (sequelize, DataTypes) => {
  const Flight = sequelize.define('Flight', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    flightNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    airlineCode: {
      type: DataTypes.STRING(3),
      allowNull: false,
    },
    originAirportCode: {
      type: DataTypes.STRING,
      allowNull: false, // e.g. 'DEL', 'BOM', 'JFK'
    },
    destinationAirportCode: {
      type: DataTypes.STRING,
      allowNull: false, // e.g. 'BLR', 'LAX'
    },
    scheduledDeparture: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    scheduledArrival: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('SCHEDULED', 'DELAYED', 'CANCELLED', 'COMPLETED'),
      defaultValue: 'SCHEDULED',
    },
  }, {
    tableName: 'Flights',
    indexes: [
      {
        name: 'idx_flights_search_lookup',
        fields: ['originAirportCode', 'destinationAirportCode', 'status', 'scheduledDeparture']
      }
    ]
  });

  Flight.associate = (models) => {
    Flight.hasMany(models.FlightFare, { foreignKey: 'flightId', onDelete: 'CASCADE', as: 'fares' }); 
    
    Flight.belongsTo(models.Airline, { 
      foreignKey: 'airlineCode', 
      targetKey: 'iataCode', 
      as: 'airlineData' 
    });
    
    Flight.belongsTo(models.Location, { foreignKey: 'originAirportCode', targetKey: 'airportCode', as: 'originData' });
    Flight.belongsTo(models.Location, { foreignKey: 'destinationAirportCode', targetKey: 'airportCode', as: 'destinationData' });
  };

  return Flight;
};