const express = require('express');
const router = express.Router();
const airlineController = require('../controllers/airlineController');

/**
 * @openapi
 * /api/airlines:
 *   get:
 *     summary: Retrieve all carrier statuses
 *     description: Returns a list of all airlines and whether they are currently in service. Used by the admin panel and internal tooling.
 *     tags:
 *       - Admin Panel
 *     responses:
 *       200:
 *         description: List of active and inactive carriers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   airlineCode:
 *                     type: string
 *                     example: 6E
 *                   airlineService:
 *                     type: string
 *                     example: IndiGo
 *                   status:
 *                     type: boolean
 *                     example: true
 *       500:
 *         description: Unable to retrieve carrier data
 */
router.get('/', airlineController.getAirlineStatuses);

module.exports = router;
