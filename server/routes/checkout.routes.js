const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkout.controller');

/**
 * @openapi
 * /api/checkout/create-session:
 *   post:
 *     summary: Initialize Stripe Checkout for flight booking
 *     description: Validates passenger details and flight sectors, calculates DB-verified fares, reserves a PNR, and returns a Stripe Checkout URL. Supports both logged-in users and guest travelers.
 *     tags:
 *       - Checkout & Bookings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactInfo
 *               - tripType
 *               - cabinClass
 *               - legs
 *               - passengers
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Optional. Extracted from Authorization header if logged in.
 *               contactInfo:
 *                 type: object
 *                 required:
 *                   - email
 *                   - phone
 *                 properties:
 *                   email:
 *                     type: string
 *                     example: passenger@example.com
 *                   phone:
 *                     type: string
 *                     example: "+919876543210"
 *               tripType:
 *                 type: string
 *                 enum: [ONEWAY, ROUND_TRIP, MULTI_CITY]
 *                 example: ONEWAY
 *               cabinClass:
 *                 type: string
 *                 enum: [ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST]
 *                 example: ECONOMY
 *               airlineProvider:
 *                 type: string
 *                 example: IndiGo
 *               legs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - flightId
 *                   properties:
 *                     flightId:
 *                       type: string
 *                       example: 4a3a30eb-a52d-4d2b-a82f-2d901dbd56ea
 *               passengers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - firstName
 *                     - lastName
 *                   properties:
 *                     firstName:
 *                       type: string
 *                       example: Rahul
 *                     lastName:
 *                       type: string
 *                       example: Sharma
 *                     dob:
 *                       type: string
 *                       format: date
 *                       example: "1994-08-20"
 *                     age:
 *                       type: integer
 *                       example: 30
 *                     nationality:
 *                       type: string
 *                       example: Indian
 *                     seatNo:
 *                       type: string
 *                       example: "12A"
 *                     foodOption:
 *                       type: string
 *                       example: "VEG"
 *     responses:
 *       201:
 *         description: Checkout session created — returns checkout URL and PNR
 *       400:
 *         description: Validation or parameter error
 *       404:
 *         description: Flight not found or not scheduled
 *       409:
 *         description: Insufficient seats available
 */
router.post('/create-session', checkoutController.createCheckout);

/**
 * @openapi
 * /api/checkout/confirm:
 *   post:
 *     summary: Confirm flight booking payment and issue boarding passes
 *     tags:
 *       - Checkout & Bookings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pnr
 *             properties:
 *               pnr:
 *                 type: string
 *                 example: HX7K9B
 *               sessionId:
 *                 type: string
 *                 example: cs_test_a1b2c3d4...
 *     responses:
 *       200:
 *         description: Booking confirmed and ticket issued
 *       404:
 *         description: PNR not found
 */
router.post('/confirm', checkoutController.confirmPayment);

/**
 * @openapi
 * /api/checkout/booking/{pnr}:
 *   get:
 *     summary: Retrieve flight booking and boarding pass details by PNR
 *     tags:
 *       - Checkout & Bookings
 *     parameters:
 *       - in: path
 *         name: pnr
 *         required: true
 *         schema:
 *           type: string
 *         example: HX7K9B
 *     responses:
 *       200:
 *         description: Booking manifest retrieved
 *       404:
 *         description: PNR not found
 */
router.get('/booking/:pnr', checkoutController.getBookingByPnr);

module.exports = router;
