const { CancellationReason, FeeConfig } = require('../models');

const DEFAULT_CANCELLATION_REASONS = [
  {
    reasonCode: 'CHANGE_OF_PLANS',
    reasonText: 'Change of travel plans or schedule',
    description: 'Passenger is no longer able to travel on the scheduled date'
  },
  {
    reasonCode: 'MEDICAL_EMERGENCY',
    reasonText: 'Medical emergency / health condition',
    description: 'Passenger or immediate family member experienced a medical emergency'
  },
  {
    reasonCode: 'FLIGHT_TIMING_INCONVENIENT',
    reasonText: 'Flight schedule inconvenient or rescheduled',
    description: 'Flight departure or arrival time does not suit the passenger itinerary'
  },
  {
    reasonCode: 'FOUND_BETTER_FARE',
    reasonText: 'Found alternate flight or preferred airline',
    description: 'Booked another flight sector or airline provider'
  },
  {
    reasonCode: 'PERSONAL_EMERGENCY',
    reasonText: 'Urgent personal or family emergency',
    description: 'Unforeseen personal circumstances requiring journey cancellation'
  },
  {
    reasonCode: 'WEATHER_OR_TRAVEL_ADVISORY',
    reasonText: 'Adverse weather or travel advisory',
    description: 'Weather disruption or advisory at origin or destination airport'
  },
  {
    reasonCode: 'OTHER',
    reasonText: 'Other reasons',
    description: 'Reason not covered in standard cancellation options'
  }
];

async function seedCancellationDefaults() {
  try {
    // 1. Seed Fee Configuration if empty
    const feeCount = await FeeConfig.count();
    if (feeCount === 0) {
      await FeeConfig.create({
        configKey: 'GLOBAL_FLIGHT_FEES',
        cancellationFee: 1500.00,
        platformFee: 250.00,
        currency: 'INR',
        lastUpdatedBy: 'system_admin'
      });
      console.log('✅ Default Aviation Fee Configuration initialized: Cancellation Fee ₹1,500 | Platform Fee ₹250');
    }

    // 2. Seed Standard Cancellation Reasons if empty
    const reasonCount = await CancellationReason.count();
    if (reasonCount === 0) {
      await CancellationReason.bulkCreate(DEFAULT_CANCELLATION_REASONS);
      console.log(`✅ Seeded ${DEFAULT_CANCELLATION_REASONS.length} standard aviation cancellation reasons.`);
    }
  } catch (error) {
    console.error('⚠️ Cancellation defaults seeding error:', error.message);
  }
}

module.exports = { seedCancellationDefaults, DEFAULT_CANCELLATION_REASONS };
