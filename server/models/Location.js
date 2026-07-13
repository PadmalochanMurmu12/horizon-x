const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Location = sequelize.define('Location', {
  airportCode: {
    type: DataTypes.STRING(3),
    primaryKey: true, // DEL, BOM, etc.
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
    defaultValue: true // Operational gate status toggle
  }
});

module.exports = Location;