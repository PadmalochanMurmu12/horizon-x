module.exports = (sequelize, DataTypes) => {
  const BookingPassenger = sequelize.define('BookingPassenger', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nationality: {
      type: DataTypes.STRING,
      defaultValue: 'Indian',
    },
    seatNumber: {
      type: DataTypes.STRING(10),
      allowNull: true, // e.g. "12A", "14C"
    },
    foodOption: {
      type: DataTypes.STRING(50),
      defaultValue: 'VEG', // e.g. "VEG", "NON_VEG", "JAIN", "DIABETIC", "NONE"
    },
    ticketNumber: {
      type: DataTypes.STRING(30),
      allowNull: true, // e.g. "HX-098-44219082"
    },
    isCheckedIn: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    gate: {
      type: DataTypes.STRING(10),
      allowNull: true, // e.g. "14B"
    },
    terminal: {
      type: DataTypes.STRING(10),
      allowNull: true, // e.g. "T2", "T3"
    },
    boardingGroup: {
      type: DataTypes.STRING(10),
      allowNull: true, // e.g. "Zone 1", "Zone 2"
    },
    boardingPassNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    tableName: 'BookingPassengers',
    indexes: [
      { name: 'idx_booking_passengers_booking', fields: ['bookingId'] }
    ]
  });

  BookingPassenger.associate = (models) => {
    BookingPassenger.belongsTo(models.Booking, {
      foreignKey: 'bookingId',
      as: 'booking'
    });
  };

  return BookingPassenger;
};
