const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const checkoutController = require('../controllers/checkout.controller');

/**
 * @openapi
 * /api/bookings:
 *   get:
 *     summary: Retrieve passenger bookings grouped by journey status
 *     description: Returns card formatted current (today), future (upcoming), past, and cancelled journeys.
 *     tags:
 *       - Checkout & Bookings
 */
router.get('/', bookingController.getMyBookings);
router.get('/my-bookings', bookingController.getMyBookings);

/**
 * @openapi
 * /api/bookings/{pnr}/ticket:
 *   get:
 *     summary: Generate and view Electronic Ticket Receipt
 *     description: Permitted for Past, Current, and Future journeys. Supports formats json, markdown, html, and ?download=true.
 *     tags:
 *       - Checkout & Bookings
 */
router.get('/:pnr/ticket', bookingController.getETicket);

/**
 * @openapi
 * /api/bookings/{pnr}/boarding-pass:
 *   get:
 *     summary: Generate and view Official Boarding Pass
 *     description: Permitted strictly for Current and Future journeys. Blocked for Past and Cancelled reservations.
 *     tags:
 *       - Checkout & Bookings
 */
router.get('/:pnr/boarding-pass', bookingController.getBoardingPass);

/**
 * @openapi
 * /api/bookings/{pnr}:
 *   get:
 *     summary: Retrieve booking details by PNR
 *     tags:
 *       - Checkout & Bookings
 */
router.get('/:pnr', checkoutController.getBookingByPnr);

/**
 * @openapi
 * /api/bookings/{pnr}/complete:
 *   put:
 *     summary: Complete a booking journey
 *     tags:
 *       - Checkout & Bookings
 */
router.put('/:pnr/complete', bookingController.markBookingCompleted);
router.post('/:pnr/complete', bookingController.markBookingCompleted);
router.delete('/:pnr', bookingController.deleteBooking);

module.exports = router;
