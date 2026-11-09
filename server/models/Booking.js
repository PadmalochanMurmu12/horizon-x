module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Aviation Standard 6-character PNR (Passenger Name Record)
    pnr: {
      type: DataTypes.STRING(6),
      allowNull: false,
      unique: true,
    },
    // Nullable for guest checkouts
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    contactEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true }
    },
    contactPhone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tripType: {
      type: DataTypes.ENUM('ONEWAY', 'ROUND_TRIP', 'MULTI_CITY'),
      defaultValue: 'ONEWAY',
    },
    cabinClass: {
      type: DataTypes.ENUM('ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'),
      defaultValue: 'ECONOMY',
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'INR',
    },
    status: {
      type: DataTypes.ENUM('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED'),
      defaultValue: 'PENDING_PAYMENT',
    },
    paymentStatus: {
      type: DataTypes.STRING, // e.g. 'UNPAID', 'PAID', 'FAILED', 'REFUNDED_TO_WALLET', 'REFUNDED_TO_ORIGINAL_SOURCE'
      defaultValue: 'UNPAID',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isCheckedIn: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    stripeSessionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Cancellation & Refund Breakdown Details
    cancellationReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cancellationFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    platformFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
    },
    refundDestination: {
      type: DataTypes.STRING, // 'WALLET' or 'ORIGINAL_SOURCE'
      allowNull: true,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Immutable snapshot of all flight sectors and pricing when booked
    journeyDetails: {
      type: DataTypes.JSON,
      allowNull: false,
    }
  }, {
    tableName: 'Bookings',
    indexes: [
      { name: 'idx_bookings_pnr', unique: true, fields: ['pnr'] },
      { name: 'idx_bookings_user', fields: ['userId'] },
      { name: 'idx_bookings_status', fields: ['status', 'paymentStatus'] }
    ]
  });

  Booking.associate = (models) => {
    Booking.hasMany(models.BookingPassenger, {
      foreignKey: 'bookingId',
      as: 'passengers',
      onDelete: 'CASCADE'
    });
    Booking.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Booking;
};
