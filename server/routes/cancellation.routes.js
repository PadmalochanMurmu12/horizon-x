const express = require('express');
const router = express.Router();
const cancellationController = require('../controllers/cancellation.controller');

/**
 * @openapi
 * /api/cancellation/reasons:
 *   get:
 *     summary: Retrieve standard flight cancellation reasons
 *     description: Returns hardcoded standard cancellation reasons stored in the database for passenger dropdown selection.
 *     tags:
 *       - Cancellation & Refunds
 *     responses:
 *       200:
 *         description: List of active cancellation reasons
 */
router.get('/reasons', cancellationController.getCancellationReasons);

/**
 * @openapi
 * /api/cancellation/cancel:
 *   post:
 *     summary: Cancel a flight booking and process refund
 *     description: Cancels a reservation by PNR. Calculates refund amount breakup (Actual Paid - Cancellation Fee - Platform Fee). Supports refund to Passenger Wallet (registered users only) or Original Source. Restores seat inventory back to flight availability.
 *     tags:
 *       - Cancellation & Refunds
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pnr
 *               - reason
 *               - refundTo
 *               - cancel
 *             properties:
 *               pnr:
 *                 type: string
 *                 description: Mandatory 6-character PNR code
 *                 example: GKP4BQ
 *               reason:
 *                 type: string
 *                 description: Cancellation reason code (from /api/cancellation/reasons)
 *                 example: CHANGE_OF_PLANS
 *               refundTo:
 *                 type: string
 *                 enum: [WALLET, ORIGINAL_SOURCE]
 *                 description: Destination for refund. Note that WALLET is only accessible to registered users.
 *                 example: WALLET
 *               cancel:
 *                 type: boolean
 *                 description: Mandatory confirmation flag. Set to true to execute cancellation, or false to get a preview quote.
 *                 example: true
 *     responses:
 *       200:
 *         description: Booking cancelled or cancellation preview generated
 *       400:
 *         description: Parameter or reason validation error
 *       403:
 *         description: Guest user attempting to access Wallet
 *       404:
 *         description: PNR not found
 */
router.post('/cancel', cancellationController.cancelBooking);

module.exports = router;
