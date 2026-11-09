const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Flight = require('./Flight')(sequelize, DataTypes);
const FlightFare = require('./FlightFare')(sequelize, DataTypes);
const Location = require('./Location')(sequelize, DataTypes);
const Booking = require('./Booking')(sequelize, DataTypes);
const BookingPassenger = require('./BookingPassenger')(sequelize, DataTypes);
const FeeConfig = require('./FeeConfig')(sequelize, DataTypes);
const CancellationReason = require('./CancellationReason')(sequelize, DataTypes);

const User = require('./User');
const Airline = require('./Airline');

const db = {
  sequelize,
  Sequelize,
  Flight,
  FlightFare,
  User,
  Location,
  Airline,
  Booking,
  BookingPassenger,
  FeeConfig,
  CancellationReason
};

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
