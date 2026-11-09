const express = require('express');
const router = express.Router();

const { searchItineraries } = require('../controllers/itinerary.controller');

/**
 * @openapi
 * /api/itinerary:
 *   post:
 *     summary: Search available flight itineraries
 *     tags:
 *       - Itinerary Engine
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - legs
 *             properties:
 *               tripType:
 *                 type: string
 *                 example: ONEWAY
 *               cabinClass:
 *                 type: string
 *                 example: ECONOMY
 *               legs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     origin:
 *                       type: string
 *                       example: DEL
 *                     destination:
 *                       type: string
 *                       example: BOM
 *                     travelDate:
 *                       type: string
 *                       format: date
 *                       example: 2026-08-10
 *               paxCounts:
 *                 type: object
 *                 properties:
 *                   adults:
 *                     type: integer
 *                     example: 1
 *                   children:
 *                     type: integer
 *                     example: 0
 *                   infants:
 *                     type: integer
 *                     example: 0
 *     responses:
 *       200:
 *         description: Successful retrieval of itineraries
 *       400:
 *         description: Missing or invalid parameters
 *       500:
 *         description: Internal server error
 */
// Actually calling the function we imported, using the POST method.
router.post('/', searchItineraries);

module.exports = router;