require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { Op }  = require('sequelize');
const swaggerUi   = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Models & Config
const { sequelize, Flight, User, Location, Airline } = require('./models');
const { seedDatabase } = require('./utils/seeder');
const { seedCancellationDefaults } = require('./utils/cancellation.seeder');

// Middleware — single source of truth
const { authMiddleware, adminAuthMiddleware } = require('./middleware/auth');
const noCache = require('./middleware/noCache');

// Router Imports
const itineraryRoutes = require('./routes/itinerary.routes');
const airlineRoutes   = require('./routes/airlineRoutes');
const checkoutRoutes  = require('./routes/checkout.routes');
const cancellationRoutes = require('./routes/cancellation.routes');
const bookingRoutes   = require('./routes/booking.routes');
const checkinRoutes   = require('./routes/checkin.routes');
const cancellationController = require('./controllers/cancellation.controller');
const bookingController = require('./controllers/booking.controller');
const checkoutController = require('./controllers/checkout.controller');
const flightStatusController = require('./controllers/flightStatus.controller');

const app  = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET      = process.env.JWT_SECRET;
const ADMIN_USERNAME  = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD;
const MOCK_EMAIL_OTP  = process.env.MOCK_EMAIL_OTP || '1111';
const MOCK_PHONE_OTP  = process.env.MOCK_PHONE_OTP || '2222';

// ─── Admin password hash caching ─────────────────────────────────────────────
let _adminPwHash = null;
const getAdminPwHash = async () => {
  if (!_adminPwHash) _adminPwHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  return _adminPwHash;
};

// ==========================================
// SWAGGER CONFIGURATION
// ==========================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Horizon-X API Documentation',
      version: '1.0.0',
      description: 'RESTful aviation endpoints for the Horizon-X flight booking and fleet management system.',
    },
    servers: [{ url: `http://localhost:${PORT}`, description: 'Local Ground Control Server' }],
    tags: [
      { name: 'Itinerary Engine',       description: 'Flight search, sector pairing, and connection logic' },
      { name: 'Checkout & Bookings',    description: 'Stripe payments, PNR reservation, and boarding pass retrieval' },
      { name: 'Cancellation & Refunds', description: 'Flight cancellation, refund calculations, passenger wallet, and fee configs' },
      { name: 'Admin Panel',            description: 'Ground control and fleet operations administration' },
      { name: 'User Panel',             description: 'Passenger onboarding, authentication, and profile management' },
      { name: 'Utility APIs',           description: 'Avionics diagnostics, database seeder, and public airport lookups' }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your passenger session token (format: Bearer <token>)',
        },
      },
    },
  },
  apis: ['./index.js', './routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==========================================
// GLOBAL MIDDLEWARE STACK
// ==========================================
app.disable('etag');

// Restrict CORS to authorized client origin
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));

// ==========================================
// STRIPE ASYNCHRONOUS WEBHOOK DISPATCH
// Must be mounted before express.json() to preserve raw Buffer for cryptographic signature verification
// ==========================================
app.post(
  '/api/checkout/webhook',
  express.raw({ type: 'application/json' }),
  checkoutController.handleStripeWebhook
);

// Payload limit for JSON routes
app.use(express.json({ limit: '10mb' }));

// Anti-cache header enforcement
app.use(noCache);

// Defensive Request Guard Middleware
app.use((req, res, next) => {
  if (req.path.includes('/complete') || req.path.includes('/webhook')) {
    return next();
  }
  if (
    (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') &&
    (!req.body || Object.keys(req.body).length === 0)
  ) {
    return res.status(400).json({ error: 'Malformed flight dispatch payload. Please verify your Content-Type headers and request body.' });
  }
  next();
});

// ==========================================
// MODULE ROUTE MOUNTS
// ==========================================
app.use('/api/airlines',     airlineRoutes);
app.use('/api/itinerary',    itineraryRoutes);
app.use('/api/checkout',     checkoutRoutes);
app.use('/api/cancellation', cancellationRoutes);
app.use('/api/bookings',     bookingRoutes);
app.use('/api/checkin',      checkinRoutes);

// ==========================================
// UTILITY APIs
// ==========================================

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: System avionics health check
 *     tags:
 *       - Utility APIs
 *     responses:
 *       200:
 *         description: Avionics operational
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'All avionics systems nominal. Horizon-X is airborne and operational!' });
});

/**
 * @openapi
 * /api/flight-status:
 *   get:
 *     summary: Public Flight Status Radar (Departures & Arrivals)
 *     description: Real-time public radar tracking flight status, scheduled departure, arrival, terminals, and gates. Requires NO user or admin authentication.
 *     tags:
 *       - Utility APIs
 *     parameters:
 *       - in: query
 *         name: flightNumber
 *         schema:
 *           type: string
 *         example: QP-1102
 *       - in: query
 *         name: origin
 *         schema:
 *           type: string
 *         example: DEL
 *       - in: query
 *         name: destination
 *         schema:
 *           type: string
 *         example: BOM
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         example: "2026-11-14"
 *     responses:
 *       200:
 *         description: Real-time flight status manifest
 */
app.get('/api/flight-status', flightStatusController.getPublicFlightStatus);
app.get('/api/flights/status', flightStatusController.getPublicFlightStatus);

/**
 * @openapi
 * /api/test-seed:
 *   get:
 *     summary: Trigger manual database seeding
 *     tags:
 *       - Utility APIs
 *     responses:
 *       200:
 *         description: Flight database seeded successfully
 *       500:
 *         description: Seeding error details
 */
app.get('/api/test-seed', async (req, res) => {
  try {
    await seedDatabase();
    res.json({ message: 'Flight schedules and navigational routes synchronized successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/airports:
 *   get:
 *     summary: Retrieve operational airports (public)
 *     description: Returns accessible airports for departure and arrival selections on flight booking forms.
 *     tags:
 *       - Utility APIs
 *     responses:
 *       200:
 *         description: List of accessible airports
 *       500:
 *         description: Airport retrieval error
 */
app.get('/api/airports', async (req, res) => {
  try {
    const airports = await Location.findAll({ where: { isAccessible: true } });
    res.status(200).json(airports);
  } catch (error) {
    res.status(500).json({ error: 'Unable to retrieve operational airport directory at this time. Please try again shortly.' });
  }
});

// ==========================================
// ADMIN PANEL (GROUND CONTROL)
// ==========================================

/**
 * @openapi
 * /api/admin/login:
 *   post:
 *     summary: Ground Control Admin authentication
 *     tags:
 *       - Admin Panel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin@horizonx.com
 *               password:
 *                 type: string
 *                 example: Test@1234
 *     responses:
 *       200:
 *         description: Ground Control access granted
 *       401:
 *         description: Ground Control clearance denied
 */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const isUsernameMatch = username === ADMIN_USERNAME;
    const isPasswordMatch = isUsernameMatch && (await bcrypt.compare(password, await getAdminPwHash()));

    if (!isUsernameMatch || !isPasswordMatch) {
      return res.status(401).json({ error: 'Ground Control clearance denied: Invalid administrative credentials.' });
    }

    const token = jwt.sign({ userId: 'system_root_admin', role: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
    return res.status(200).json({
      message: 'Ground Control clearance granted. Welcome to Horizon-X Operations.',
      token: `Bearer ${token}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Encountered unexpected ground control turbulence. Please try again shortly.' });
  }
});

/**
 * @openapi
 * /api/cities:
 *   get:
 *     summary: Retrieve operational cities (Admin view)
 *     tags:
 *       - Admin Panel
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Operational cities list
 */
app.get('/api/cities', adminAuthMiddleware, async (req, res) => {
  try {
    const operationalCities = await Location.findAll({ where: { isAccessible: true } });
    res.status(200).json(operationalCities);
  } catch (error) {
    res.status(500).json({ error: 'Unable to retrieve operational city directory.' });
  }
});

/**
 * @openapi
 * /api/flights:
 *   get:
 *     summary: Retrieve scheduled flights manifest (Admin view)
 *     tags:
 *       - Admin Panel
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduled flight schedules
 */
app.get('/api/flights', adminAuthMiddleware, async (req, res) => {
  try {
    const flights = await Flight.findAll({
      include: ['airlineData', 'originData', 'destinationData']
    });
    res.json(flights);
  } catch (error) {
    res.status(500).json({ error: 'Unable to retrieve scheduled flight manifests.' });
  }
});

const updateFlightStatusHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['SCHEDULED', 'DELAYED', 'CANCELLED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid flight status: ${status}. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const flight = await Flight.findByPk(id);
    if (!flight) {
      return res.status(404).json({ success: false, error: 'Flight record not found.' });
    }

    flight.status = status;
    await flight.save();

    return res.status(200).json({
      success: true,
      message: `Flight ${flight.flightNumber} status has been updated to ${status}.`,
      data: flight
    });
  } catch (error) {
    console.error('Update Flight Status Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update flight status.' });
  }
};

app.put('/api/admin/flights/:id/status', adminAuthMiddleware, updateFlightStatusHandler);
app.put('/api/flights/:id/status', adminAuthMiddleware, updateFlightStatusHandler);

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Retrieve registered passenger accounts (Admin view)
 *     tags:
 *       - Admin Panel
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Passenger manifest registry
 */
app.get('/api/users', adminAuthMiddleware, async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Unable to retrieve passenger manifest records.' });
  }
});

/**
 * @openapi
 * /api/admin/fee-config:
 *   get:
 *     summary: Retrieve current fee configuration (Admin only)
 *     description: Returns current cancellation and platform fees. Requires Ground Control Admin authorization.
 *     tags:
 *       - Admin Panel
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current fee configuration
 *       401:
 *         description: Admin authorization required
 */
app.get('/api/admin/fee-config', adminAuthMiddleware, cancellationController.getFeeConfig);

/**
 * @openapi
 * /api/admin/update-price:
 *   put:
 *     summary: Update global cancellation and platform fees (Admin only)
 *     description: Ground Control Admin can set global cancellationFee and platformFee rendered across all users.
 *     tags:
 *       - Admin Panel
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cancellationFee
 *               - platformFee
 *             properties:
 *               cancellationFee:
 *                 type: number
 *                 example: 1200.00
 *               platformFee:
 *                 type: number
 *                 example: 200.00
 *     responses:
 *       200:
 *         description: Fee configuration updated successfully
 *       401:
 *         description: Admin authorization required
 */
app.put('/api/admin/update-price', adminAuthMiddleware, cancellationController.updateFeeConfig);
app.post('/api/admin/update-price', adminAuthMiddleware, cancellationController.updateFeeConfig);

/**
 * @openapi
 * /api/admin/bookings/{pnr}/complete:
 *   put:
 *     summary: Manually mark a booking/journey as completed (Admin only)
 *     tags:
 *       - Admin Panel
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pnr
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking marked as completed
 *       400:
 *         description: Cannot mark cancelled booking
 *       401:
 *       403:
 *         description: Admin authorization required
 */
app.put('/api/admin/bookings/:pnr/complete', adminAuthMiddleware, bookingController.markBookingCompleted);
app.post('/api/admin/bookings/:pnr/complete', adminAuthMiddleware, bookingController.markBookingCompleted);
app.delete('/api/admin/bookings/:pnr', adminAuthMiddleware, bookingController.deleteBooking);

// ==========================================
// USER PANEL (PASSENGER ONBOARDING & PROFILE)
// ==========================================

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new passenger profile
 *     tags:
 *       - User Panel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - phone
 *               - password
 *               - gender
 *               - dob
 *               - nationality
 *               - emailOtp
 *               - phoneOtp
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               password:
 *                 type: string
 *                 example: Password@123
 *               gender:
 *                 type: string
 *                 example: MALE
 *               dob:
 *                 type: string
 *                 example: "1995-05-15"
 *               nationality:
 *                 type: string
 *                 example: Indian
 *               emailOtp:
 *                 type: string
 *                 description: "Mock sandbox code — 1111"
 *                 example: "1111"
 *               phoneOtp:
 *                 type: string
 *                 description: "Mock sandbox code — 2222"
 *                 example: "2222"
 *     responses:
 *       201:
 *         description: Passenger onboarded successfully
 *       400:
 *         description: Security code verification error
 *       409:
 *         description: Passenger already registered
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone,
      password, gender, dob, nationality, avatar,
      emailOtp, phoneOtp
    } = req.body;

    // Positive & Negative Input Validation
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        error: 'Passenger profile requirement: First name, last name, email, phone number, and password are required.'
      });
    }

    if (password.length < 8 || !/\d/.test(password)) {
      return res.status(400).json({
        error: 'Password security requirement: Minimum 8 characters with at least one numeric digit.'
      });
    }

    // Static Mock OTP verification (1111 for Email, 2222 for Phone)
    if (!emailOtp || !phoneOtp || emailOtp.length !== 4 || phoneOtp.length !== 4) {
      return res.status(400).json({
        error: 'Security clearance failed: Both your Email and Phone verification codes must be exactly 4 digits. (Sandbox clearance: Email 1111, Phone 2222)'
      });
    }
    if (emailOtp === phoneOtp) {
      return res.status(400).json({
        error: 'Security protocol: Email and Phone verification codes must be distinct from each other.'
      });
    }
    if (emailOtp !== MOCK_EMAIL_OTP || phoneOtp !== MOCK_PHONE_OTP) {
      return res.status(401).json({
        error: 'Security clearance failed: Incorrect verification codes. Please enter sandbox dispatch codes: 1111 for Email and 2222 for Phone.'
      });
    }

    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email }, { phone }] }
    });
    if (existingUser) {
      return res.status(409).json({
        error: 'Passenger manifest conflict: An account is already registered with this email address or contact number.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      firstName, lastName, email, phone,
      password: hashedPassword, gender, dob, nationality, avatar
    });

    res.status(201).json({
      message: 'Welcome aboard! Your Horizon-X passenger profile is officially registered and cleared for takeoff.',
      userId: newUser.id
    });
  } catch (error) {
    res.status(500).json({ error: 'Encountered unexpected turbulence while creating your passenger profile. Please try again shortly.' });
  }
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Passenger login check-in
 *     tags:
 *       - User Panel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: Password@123
 *     responses:
 *       200:
 *         description: Check-in authorization successful
 *       401:
 *         description: Credentials verification failed
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Boarding verification required: Please provide your email/phone and password to proceed.' });
    }

    const user = await User.findOne({
      where: { [Op.or]: [{ email: identifier }, { phone: identifier }] }
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        error: 'Boarding authorization denied: Invalid credentials. Please verify your registered email/phone and password.'
      });
    }

    const token = jwt.sign({ userId: user.id, role: 'user' }, JWT_SECRET, { expiresIn: '2h' });
    res.json({
      message: 'Identity verified. You are cleared for departure! Welcome back.',
      token: `Bearer ${token}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Encountered unexpected turbulence during check-in. Please try again shortly.' });
  }
});

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request passenger password reset
 *     tags:
 *       - User Panel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Reset dispatch dispatched
 *       404:
 *         description: Passenger not found
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;
    const user = await User.findOne({
      where: { [Op.or]: [{ email: identifier }, { phone: identifier }] }
    });
    if (!user) {
      return res.status(404).json({
        error: 'Flight manifest check: No passenger record found matching that email address or phone number.'
      });
    }

    res.status(200).json({
      message: 'Password reset dispatch transmitted successfully. Please verify your security codes.',
      info: 'Sandbox clearance: Use Email code 1111 and Phone code 2222 to set your new security password.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Encountered unexpected turbulence while processing your password reset.' });
  }
});

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Confirm password update with security verification codes
 *     tags:
 *       - User Panel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - emailOtp
 *               - phoneOtp
 *               - newPassword
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: john@example.com
 *               emailOtp:
 *                 type: string
 *                 example: "1111"
 *               phoneOtp:
 *                 type: string
 *                 example: "2222"
 *               newPassword:
 *                 type: string
 *                 example: NewPassword@123
 *     responses:
 *       200:
 *         description: Password updated
 *       401:
 *         description: Security code mismatch
 */
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { identifier, emailOtp, phoneOtp, newPassword } = req.body;

    if (emailOtp !== MOCK_EMAIL_OTP || phoneOtp !== MOCK_PHONE_OTP) {
      return res.status(401).json({
        error: 'Security clearance failed: Verification codes do not match our dispatch records. (Sandbox clearance: Email 1111, Phone 2222)'
      });
    }

    const user = await User.findOne({
      where: { [Op.or]: [{ email: identifier }, { phone: identifier }] }
    });
    if (!user) {
      return res.status(404).json({ error: 'Flight manifest check: No passenger record found matching that identifier.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      message: 'Security credentials updated successfully. You may now proceed to check in with your new password.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Encountered unexpected turbulence while updating your security credentials.' });
  }
});

/**
 * @openapi
 * /api/users/profile:
 *   get:
 *     summary: Retrieve passenger profile details
 *     tags:
 *       - User Panel
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Passenger profile
 *       404:
 *         description: Profile not found
 */
app.get('/api/users/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] }
    });
    if (!user) return res.status(404).json({ error: 'Passenger profile not found in flight manifest.' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Encountered unexpected turbulence while loading your passenger profile.' });
  }
});

/**
 * @openapi
 * /api/users/wallet:
 *   get:
 *     summary: Retrieve passenger wallet balance (Horizon-X credits)
 *     tags:
 *       - User Panel
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current wallet balance
 *       404:
 *         description: Passenger not found
 */
app.get('/api/users/wallet', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'walletBalance']
    });
    if (!user) return res.status(404).json({ error: 'Passenger profile not found in flight manifest.' });
    res.status(200).json({
      success: true,
      data: {
        userId: user.id,
        passengerName: `${user.firstName} ${user.lastName}`,
        walletBalance: Number(user.walletBalance || 0),
        currency: 'INR'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Encountered unexpected turbulence while loading your passenger wallet.' });
  }
});

/**
 * @openapi
 * /api/users/profile:
 *   put:
 *     summary: Update passenger profile details
 *     tags:
 *       - User Panel
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmNewPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
app.put('/api/users/profile', authMiddleware, async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone,
      oldPassword, newPassword, confirmNewPassword,
      gender, dob, nationality, avatar
    } = req.body;

    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Passenger profile not found in flight manifest.' });

    if (email && email !== user.email) {
      const duplicate = await User.findOne({ where: { email } });
      if (duplicate) return res.status(409).json({ error: 'Passenger manifest conflict: That email address is already allocated to another passenger.' });
      user.email = email;
    }
    if (phone && phone !== user.phone) {
      const duplicate = await User.findOne({ where: { phone } });
      if (duplicate) return res.status(409).json({ error: 'Passenger manifest conflict: That phone number is already allocated to another passenger.' });
      user.phone = phone;
    }

    if (firstName)   user.firstName   = firstName;
    if (lastName)    user.lastName    = lastName;
    if (gender)      user.gender      = gender;
    if (dob)         user.dob         = dob;
    if (nationality) user.nationality = nationality;
    if (avatar)      user.avatar      = avatar;

    if (newPassword) {
      if (!oldPassword || !confirmNewPassword) {
        return res.status(400).json({
          error: 'Security update required: To update your password, please provide your current password, new password, and confirmation.'
        });
      }
      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ error: 'Password confirmation mismatch: New password entries do not match.' });
      }
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Security verification failed: Current password does not match our flight records.' });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    res.status(200).json({ message: 'Passenger profile details updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Encountered unexpected turbulence while updating your passenger profile.' });
  }
});

/**
 * @openapi
 * /api/users:
 *   delete:
 *     summary: Permanently decommission passenger account
 *     tags:
 *       - User Panel
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - delete
 *             properties:
 *               password:
 *                 type: string
 *               delete:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Account closed
 */
app.delete('/api/users', authMiddleware, async (req, res) => {
  try {
    const { password, delete: confirmDelete } = req.body;

    if (confirmDelete !== true) {
      return res.status(400).json({
        error: 'De-registration safety check: Confirmation toggle must evaluate to true to decommission your passenger profile.'
      });
    }

    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Passenger profile not found in flight manifest.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Security verification failed: Incorrect password. Account decommissioning halted.'
      });
    }

    await user.destroy();
    res.status(200).json({
      message: 'Your Horizon-X passenger account has been decommissioned. We hope to welcome you aboard again in the future.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Encountered unexpected turbulence while decommissioning your account.' });
  }
});

// ==========================================
// ENGINE BOOTSTRAPPER
// ==========================================
if (process.env.NODE_ENV !== 'test') {
  sequelize.sync({ force: false })
    .then(async () => {
      console.log('✅ Aviation database structures synchronised.');

      const cityCount = await Location.count();
      if (cityCount === 0) {
        console.log('🌱 Flight database empty — running automatic flight schedule seeder...');
        await seedDatabase();
        console.log('✅ Flight database loaded. All boarding gates are open.');
      } else {
        console.log(`ℹ️  Horizon-X operational with ${cityCount} airports loaded.`);
      }

      await seedCancellationDefaults();

      app.listen(PORT, () => {
        console.log(`🚀 Horizon-X Engine airborne on http://localhost:${PORT}`);
      });
    })
    .catch(err => console.error('❌ Database bootstrap failed:', err));
}

module.exports = app;
