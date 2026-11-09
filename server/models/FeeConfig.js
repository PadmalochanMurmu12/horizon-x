module.exports = (sequelize, DataTypes) => {
  const FeeConfig = sequelize.define('FeeConfig', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    configKey: {
      type: DataTypes.STRING,
      defaultValue: 'GLOBAL_FLIGHT_FEES',
      unique: true,
      allowNull: false,
    },
    cancellationFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 1500.00,
      allowNull: false,
    },
    platformFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 250.00,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'INR',
    },
    lastUpdatedBy: {
      type: DataTypes.STRING,
      defaultValue: 'system_admin',
    }
  }, {
    tableName: 'FeeConfigs'
  });

  return FeeConfig;
};
