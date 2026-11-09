const { sequelize, Booking, BookingPassenger, User, FlightFare, FeeConfig, CancellationReason } = require('../models');

/**
 * GET /api/cancellation/reasons
 * Retrieves all standard aviation cancellation reasons stored in the database.
 */
async function getCancellationReasons(req, res) {
  try {
    const reasons = await CancellationReason.findAll({
      where: { isActive: true },
      attributes: ['reasonCode', 'reasonText', 'description']
    });
    return res.status(200).json({
      success: true,
      message: 'Active cancellation reasons retrieved from flight database.',
      data: reasons
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve cancellation reasons at this time.'
    });
  }
}

/**
 * GET /api/admin/fee-config
 * Retrieves the current global cancellation fee and platform fee.
 */
async function getFeeConfig(req, res) {
  try {
    let config = await FeeConfig.findOne({ where: { configKey: 'GLOBAL_FLIGHT_FEES' } });
    if (!config) {
      config = await FeeConfig.create({
        configKey: 'GLOBAL_FLIGHT_FEES',
        cancellationFee: 1500.00,
        platformFee: 250.00,
        currency: 'INR'
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        configKey: config.configKey,
        cancellationFee: Number(config.cancellationFee),
        platformFee: Number(config.platformFee),
        currency: config.currency,
        lastUpdatedBy: config.lastUpdatedBy,
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve ground control fee configurations.'
    });
  }
}

/**
 * PUT /api/admin/fee-config
 * Admin endpoint to update the global cancellation fee and platform fee.
 */
async function updateFeeConfig(req, res) {
  try {
    const rawCancellation = req.body.cancellationFee !== undefined ? req.body.cancellationFee : req.body.cancellationPrice;
    const rawPlatform = req.body.platformFee !== undefined ? req.body.platformFee : req.body.platformPrice;

    if (rawCancellation === undefined || rawPlatform === undefined || isNaN(Number(rawCancellation)) || isNaN(Number(rawPlatform))) {
      return res.status(400).json({
        success: false,
        error: 'Fee configuration error: Both cancellationFee (or cancellationPrice) and platformFee (or platformPrice) must be valid numerical values.'
      });
    }

    const cancellationFee = Number(rawCancellation);
    const platformFee = Number(rawPlatform);

    if (cancellationFee < 0 || platformFee < 0) {
      return res.status(400).json({
        success: false,
        error: 'Fee configuration error: Fees cannot be negative numbers.'
      });
    }

    let config = await FeeConfig.findOne({ where: { configKey: 'GLOBAL_FLIGHT_FEES' } });
    if (!config) {
      config = await FeeConfig.create({
        configKey: 'GLOBAL_FLIGHT_FEES',
        cancellationFee: Number(cancellationFee),
        platformFee: Number(platformFee),
        currency: 'INR',
        lastUpdatedBy: req.user?.userId || 'system_admin'
      });
    } else {
      config.cancellationFee = Number(cancellationFee);
      config.platformFee = Number(platformFee);
      config.lastUpdatedBy = req.user?.userId || 'system_admin';
      await config.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Ground Control fee configuration updated successfully. Rendered for all passengers.',
      data: {
        cancellationFee: Number(config.cancellationFee),
        platformFee: Number(config.platformFee),
        currency: config.currency,
        lastUpdatedBy: config.lastUpdatedBy,
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Unable to update ground control fee configurations.'
    });
  }
}

/**
 * POST /api/cancellation/cancel
 * Primary API to cancel a flight booking, calculate refund breakdown,
 * credit Wallet (registered users only) or initiate Original Source refund,
 * and restore seats to the flight inventory.
 */
async function cancelBooking(req, res) {
  const { pnr, reason, refundTo, cancel } = req.body;

  // 1. Mandatory Parameter Validations
  if (!pnr || typeof pnr !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Cancellation error: Mandatory 6-character PNR code is required.'
    });
  }

  const formattedPnr = pnr.trim().toUpperCase();

  if (!reason || typeof reason !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Cancellation error: A valid cancellation reason code is mandatory.'
    });
  }

  // Validate Reason against database
  const validReasonRecord = await CancellationReason.findOne({
    where: {
      isActive: true,
      reasonCode: reason.trim().toUpperCase()
    }
  });

  if (!validReasonRecord) {
    // Also check if reason was passed as reasonText
    const fallbackReason = await CancellationReason.findOne({
      where: { isActive: true, reasonText: reason.trim() }
    });
    if (!fallbackReason) {
      return res.status(400).json({
        success: false,
        error: `Cancellation validation error: "${reason}" is not a recognized reason in our airline database. Call GET /api/cancellation/reasons to view valid codes.`
      });
    }
  }

  const selectedReasonText = validReasonRecord ? validReasonRecord.reasonText : reason.trim();

  // Validate refundTo destination
  const normalizedRefundTo = refundTo ? String(refundTo).trim().toUpperCase() : '';
  if (normalizedRefundTo !== 'WALLET' && normalizedRefundTo !== 'ORIGINAL_SOURCE') {
    return res.status(400).json({
      success: false,
      error: 'Refund destination error: refundTo must be either "WALLET" or "ORIGINAL_SOURCE".'
    });
  }

  // 2. Fetch Booking from Database
  const booking = await Booking.findOne({
    where: { pnr: formattedPnr },
    include: [{ model: BookingPassenger, as: 'passengers' }]
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      error: `Flight manifest check: No reservation found matching PNR ${formattedPnr}.`
    });
  }

  // Guard against completed flights
  if (booking.status === 'COMPLETED') {
    return res.status(400).json({
      success: false,
      error: `Cancellation denied: Flight for PNR ${formattedPnr} has already departed and concluded. Cancellations are strictly prohibited on completed journeys.`
    });
  }

  // Guard against bookings with completed web check-in
  const isCheckedIn = Boolean(booking.isCheckedIn || (booking.passengers && booking.passengers.some(p => p.isCheckedIn)));
  if (isCheckedIn) {
    return res.status(400).json({
      success: false,
      error: `Cancellation denied: Web check-in has already been completed for PNR ${formattedPnr}. Passengers who have completed check-in and received boarding clearance cannot cancel their flight online. Please contact airport ground staff.`
    });
  }

  // Idempotency: Prevent re-cancellation
  if (booking.status === 'CANCELLED') {
    return res.status(400).json({
      success: false,
      error: `Reservation already cancelled: PNR ${formattedPnr} was decommissioned on ${booking.cancelledAt}. Payment status: ${booking.paymentStatus}.`,
      data: {
        pnr: booking.pnr,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        refundBreakup: {
          actualAmountPaid: Number(booking.totalAmount),
          cancellationFee: Number(booking.cancellationFee),
          platformFee: Number(booking.platformFee),
          refundAmount: Number(booking.refundAmount),
          refundDestination: booking.refundDestination,
          cancelledAt: booking.cancelledAt
        }
      }
    });
  }

  // 3. User Authentication & Wallet Access Rules
  let registeredUser = null;
  if (booking.userId) {
    registeredUser = await User.findByPk(booking.userId);
  }

  // Guest restriction: Guest users cannot access Wallet!
  if (normalizedRefundTo === 'WALLET') {
    if (!booking.userId || !registeredUser) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You must be logged in to refund the amount to the wallet',
        message: 'Access denied: You must be logged in to refund the amount to the wallet'
      });
    }
  }

  // 4. Calculate Refund Amount Breakup from Dynamic Admin Fee Config
  const feeConfig = await FeeConfig.findOne({ where: { configKey: 'GLOBAL_FLIGHT_FEES' } });
  const cancellationFee = Number(feeConfig ? feeConfig.cancellationFee : 1500.00);
  const platformFee = Number(feeConfig ? feeConfig.platformFee : 250.00);

  const actualAmountPaid = Number(booking.totalAmount);
  const totalDeductions = cancellationFee + platformFee;
  const netRefund = actualAmountPaid - totalDeductions;
  const refundAmount = netRefund > 0 ? Math.round(netRefund * 100) / 100 : 0.00;

  // 5. If cancel !== true, Return Cancellation Quote Preview
  if (cancel !== true) {
    return res.status(200).json({
      success: true,
      message: 'Cancellation preview generated. Review the refund breakdown below and set cancel: true to confirm cancellation.',
      previewOnly: true,
      data: {
        pnr: booking.pnr,
        currentStatus: booking.status,
        refundBreakup: {
          actualAmountPaid,
          cancellationFee,
          platformFee,
          totalDeductions,
          refundAmount,
          currency: booking.currency,
          refundTo: normalizedRefundTo,
          refundDestination: normalizedRefundTo === 'WALLET'
            ? 'Horizon-X Passenger Wallet'
            : 'Original Payment Source (3-5 business days)'
        },
        userType: booking.userId ? 'REGISTERED_PASSENGER' : 'GUEST_PASSENGER',
        passengersToCancel: booking.passengers.length
      }
    });
  }

  // 6. Execute Cancellation inside a Database Transaction
  const t = await sequelize.transaction();

  try {
    let updatedWalletBalance = null;

    if (normalizedRefundTo === 'WALLET') {
      // Credit Refund to User's Wallet in Database
      const currentWallet = Number(registeredUser.walletBalance || 0);
      const newWallet = Math.round((currentWallet + refundAmount) * 100) / 100;
      registeredUser.walletBalance = newWallet;
      await registeredUser.save({ transaction: t });

      updatedWalletBalance = newWallet;
      booking.paymentStatus = 'REFUNDED_TO_WALLET';
      booking.refundDestination = 'WALLET';
    } else {
      // Refund to Original Source (Static text / Stripe Reversal Reference)
      booking.paymentStatus = 'REFUNDED_TO_ORIGINAL_SOURCE';
      booking.refundDestination = 'ORIGINAL_SOURCE';
    }

    // Update Booking Record
    booking.status = 'CANCELLED';
    booking.cancellationReason = selectedReasonText;
    booking.cancellationFee = cancellationFee;
    booking.platformFee = platformFee;
    booking.refundAmount = refundAmount;
    booking.cancelledAt = new Date();
    await booking.save({ transaction: t });

    // 7. Restore Seat Inventory to Flight Fare
    const legs = Array.isArray(booking.journeyDetails) ? booking.journeyDetails : [];
    const passengerCount = booking.passengers.length;

    for (const leg of legs) {
      const fare = await FlightFare.findOne({
        where: {
          flightId: leg.flightId,
          cabinClass: booking.cabinClass
        },
        transaction: t
      });

      if (fare) {
        fare.seatsAvailable = fare.seatsAvailable + passengerCount;
        await fare.save({ transaction: t });
      }
    }

    await t.commit();

    // 8. Return Confirmation Response
    const responsePayload = {
      success: true,
      message: `Flight reservation for PNR ${booking.pnr} has been officially cancelled. Seat allocations released to flight manifest.`,
      data: {
        pnr: booking.pnr,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        cancellationReason: booking.cancellationReason,
        cancelledAt: booking.cancelledAt,
        refundBreakup: {
          actualAmountPaid,
          cancellationFee,
          platformFee,
          totalDeductions,
          refundAmount,
          currency: booking.currency,
          refundTo: normalizedRefundTo,
          refundDestination: normalizedRefundTo === 'WALLET'
            ? 'Horizon-X Passenger Wallet'
            : 'Original Payment Source (via Stripe sandbox reversal)'
        }
      }
    };

    // If refunded to Wallet, include the updated wallet balance as requested
    if (normalizedRefundTo === 'WALLET') {
      responsePayload.data.updatedWalletBalance = updatedWalletBalance;
      responsePayload.data.walletCurrency = booking.currency;
    }

    return res.status(200).json(responsePayload);

  } catch (error) {
    await t.rollback();
    console.error('Cancellation Transaction Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Encountered unexpected ground control turbulence while cancelling reservation. Please try again shortly.'
    });
  }
}

module.exports = {
  getCancellationReasons,
  getFeeConfig,
  updateFeeConfig,
  cancelBooking
};
