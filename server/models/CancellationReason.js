module.exports = (sequelize, DataTypes) => {
  const CancellationReason = sequelize.define('CancellationReason', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    reasonCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    reasonText: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    }
  }, {
    tableName: 'CancellationReasons'
  });

  return CancellationReason;
};
