const { Booking, BookingPassenger, sequelize } = require('./models');

async function run() {
  try {
    await sequelize.authenticate();
    await BookingPassenger.destroy({ where: {}, truncate: false });
    await Booking.destroy({ where: {}, truncate: false });
    const count = await Booking.count();
    console.log('Bookings remaining in DB:', count);
    await sequelize.close();
  } catch (err) {
    console.error('Error clearing bookings:', err);
    process.exit(1);
  }
}
run();
