const express = require('express');
const router = express.Router();
const checkinController = require('../controllers/checkin.controller');

/**
 * @openapi
 * /api/checkin/web-checkin:
 *   post:
 *     summary: Complete airline web check-in and issue boarding pass
 *     description: Mandatory PNR & Last Name. Optional Email & Mobile Last 4 digits. In sandbox mode, available immediately after booking.
 *     tags:
 *       - Checkout & Bookings
 */
router.post('/web-checkin', checkinController.completeWebCheckin);
router.post('/', checkinController.completeWebCheckin);

/**
 * @openapi
 * /api/checkin/cancel:
 *   post:
 *     summary: Cancel web check-in (passenger offload)
 *     description: Mandatory PNR & Last Name. Invalidates boarding pass barcode, resets isCheckedIn to false, unlocking flight cancellation or re-checkin.
 *     tags:
 *       - Checkout & Bookings
 */
router.post('/cancel', checkinController.cancelWebCheckin);

module.exports = router;
