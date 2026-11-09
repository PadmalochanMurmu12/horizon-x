module.exports = (sequelize, DataTypes) => {
  const Location = sequelize.define('Location', {
    airportCode: {
      type: DataTypes.STRING(3),
      primaryKey: true,
      allowNull: false
    },
    cityName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    stateOrUt: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isAccessible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'Locations'
  });

  Location.associate = (models) => {
    Location.hasMany(models.Flight, { foreignKey: 'originAirportCode', sourceKey: 'airportCode' });
    Location.hasMany(models.Flight, { foreignKey: 'destinationAirportCode', sourceKey: 'airportCode' });
  };

  return Location;
};