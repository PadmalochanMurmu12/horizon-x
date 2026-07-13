const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Airline = sequelize.define('Airline', {
  iataCode: {
    type: DataTypes.STRING(3),
    primaryKey: true, // AI, 6E, SG, etc.
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  isInService: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = Airline;