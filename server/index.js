require('dotenv').config(); // Loaded first to parse secure credentials[cite: 5]
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { Op } = require('sequelize');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const sequelize = require('./config/database');
const seedDatabase = require('./utils/seeder');
const ACTIVE_AIRLINES = require('./constants/ActiveAirlines');
const ACTIVE_AIRPORTS = require('./constants/ActiveAirPorts');
const Flight = require('./models/Flight');
const User = require('./models/User');
const Location = require('./models/Location');
const Airline = require('./models/Airline');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'horizon_x_secret_key';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// ==========================================
// SWAGGER CONFIGURATION (ORGANIZED COLLECTION)
// ==========================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Horizon-X API documentation',
      version: '1.0.0',
      description: 'Unified backend API engine documentation sorted by operational privileges hierarchy.',
    },
    servers: [{ url: `http://localhost:${PORT}`, description: 'Local Development Server' }],
    // Declaring strict layout groupings (folders) inside Swagger UI
    tags: [
      { name: 'Admin Privileges', description: 'Administrative infrastructure control endpoints' },
      { name: 'User privileges', description: 'Consumer workflow pipelines, onboarding, and itinerary search structures' },
      { name: 'Utility APIs', description: 'System telemetry diagnostics and deployment seed routines' }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your session token string to access locked routes.',
        },
      },
    },
  },
  apis: [path.join(__dirname, 'index.js')], // Absolute resolution layout path[cite: 5]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Defensive Request Guard Middleware
app.use((req, res, next) => {
  if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && (!req.body || Object.keys(req.body).length === 0)) {
    return res.status(400).json({ error: 'Malformed request payload. Check your Content-Type headers.' });
  }
  next();
});

// User Validation Gatekeeper
const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET); 
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid authentication token.' });
  }
};

// Strict Admin Role Gatekeeper
const adminAuthMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. Admin token required.' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrative clearance required.' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired administrative credentials.' });
  }
};

// ==========================================
// FOLDER 3: UTILITY APIs
// ==========================================

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: System heartbeat verification status Check
 *     tags: [Utility APIs]
 *     responses:
 *       200:
 *         description: Server is online.
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Backend is breathing!' });
});

/**
 * @swagger
 * /api/test-seed:
 *   get:
 *     summary: Auto-initialize database environment records
 *     tags: [Utility APIs]
 *     responses:
 *       200:
 *         description: Seeding operations executed successfully.
 */
app.get('/api/test-seed', async (req, res) => {
  try {
    const locationCount = await Location.count();
    if (locationCount === 0) {
      await Location.bulkCreate(ACTIVE_AIRPORTS);
      console.log(`✅ Successfully mapped ${ACTIVE_AIRPORTS.length} operational Indian airport sectors.`);
    }

    const airlineCount = await Airline.count();
    if (airlineCount === 0) {
      await Airline.bulkCreate(ACTIVE_AIRLINES);
      console.log(`✅ Successfully mapped ${ACTIVE_AIRLINES.length} operational Indian airline services.`);
    }

    const flightCount = await Flight.count();
    if (flightCount === 0) {
      await Flight.bulkCreate([
        { flightNumber: 'AI-805', airline: 'Air India', origin: 'DEL', destination: 'BOM', price: 5800.00 },
        { flightNumber: '6E-2134', airline: 'IndiGo', origin: 'DEL', destination: 'BOM', price: 4200.00 }
      ]);
    }

    res.json({ message: 'Horizon-X database sync completed smoothly.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// FOLDER 1: ADMIN PRIVILEGES
// ==========================================

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Administrative operational clearance access entry portal
 *     tags: [Admin Privileges]
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
 *               username: { type: string, example: "admin@horizonx.com" }
 *               password: { type: string, example: "AdminHorizonX2026!" }
 *     responses:
 *       200:
 *         description: Admin validation successful. Scoped token distributed.
 *       400:
 *         description: Credential match evaluation failed.
 */
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ userId: 'system_root_admin', role: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
    return res.status(200).json({ message: 'Welcome Admin', token: `Bearer ${token}` });
  }

  res.status(400).json({ error: 'Invalid Admin Credentials' });
});

/**
 * @swagger
 * /api/cities:
 *   get:
 *     summary: See all operational cities map matrix
 *     tags: [Admin Privileges]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Vector array loaded.
 */
app.get('/api/cities', adminAuthMiddleware, async (req, res) => {
  try {
    const operationalCities = await Location.findAll({ where: { isAccessible: true } });
    res.status(200).json(operationalCities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/flights:
 *   get:
 *     summary: See active operational internal flights grid
 *     tags: [Admin Privileges]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Operations grid mapped successfully.
 */
app.get('/api/flights', adminAuthMiddleware, async (req, res) => {
  try {
    const flights = await Flight.findAll();
    res.json(flights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all onboarded consumer user profiles database mapping registry
 *     tags: [Admin Privileges]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Consumer mapping rows processed cleanly. Password components omitted.
 */
app.get('/api/users', adminAuthMiddleware, async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// FOLDER 2: USER PRIVILEGES
// ==========================================

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Onboard new passenger user profiles into registry
 *     tags: [User privileges]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - email
 *               - phone
 *               - password
 *               - emailOtp
 *               - phoneOtp
 *             properties:
 *               firstName: { type: string, example: "Aarav" }
 *               lastName: { type: string, example: "Sharma" }
 *               email: { type: string, example: "aarav@horizonx.com" }
 *               phone: { type: string, example: "+919876543210" }
 *               password: { type: string, example: "FlyHighSecure123!" }
 *               gender: { type: string, example: "Male" }
 *               dob: { type: string, format: date, example: "1995-05-15" }
 *               nationality: { type: string, example: "Indian" }
 *               emailOtp: { type: string, example: "1111" }
 *               phoneOtp: { type: string, example: "2222" }
 *     responses:
 *       201:
 *         description: Profile setup operation complete.
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, gender, dob, nationality, avatar, emailOtp, phoneOtp } = req.body;

    if (!emailOtp || !phoneOtp || emailOtp.length !== 4 || phoneOtp.length !== 4) {
      return res.status(400).json({ error: 'Registration rejected. Both Email and Phone OTPs are mandatory and must be exactly 4 digits.' });
    }

    if (emailOtp === phoneOtp) {
      return res.status(400).json({ error: 'Email OTP and Phone OTP cannot be the same.' });
    }

    if (emailOtp !== '1111' || phoneOtp !== '2222') {
      return res.status(401).json({ error: 'Invalid verification codes provided for registration.' });
    }

    const existingUser = await User.findOne({ where: { [Op.or]: [{ email }, { phone }] } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email or Phone Number is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      gender,
      dob,
      nationality,
      avatar
    });

    res.status(201).json({ message: 'User onboarded successfully!', userId: newUser.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with existing user credentials to build an authenticated session
 *     tags: [User privileges]
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
 *               identifier: { type: string, example: "aarav@horizonx.com" }
 *               password: { type: string, example: "FlyHighSecure123!" }
 *     responses:
 *       200:
 *         description: Authentication successful. Token assigned.
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please provide complete credentials.' });
    }

    const user = await User.findOne({
      where: { [Op.or]: [{ email: identifier }, { phone: identifier }] }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign({ userId: user.id, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Authentication successful!', token: `Bearer ${token}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Initiate password recovery protocol verification codes (Public)
 *     tags: [User privileges]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *             properties:
 *               identifier: { type: string, example: "aarav@horizonx.com" }
 *     responses:
 *       200:
 *         description: Account identified. Verification parameters sent.
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;
    const user = await User.findOne({ where: { [Op.or]: [{ email: identifier }, { phone: identifier }] } });
    if (!user) return res.status(404).json({ error: 'No account matching that identifier was found.' });

    res.status(200).json({ 
      message: 'Password reset initialization successful. OTP codes sent.',
      info: 'Mock Notice: Use codes (Email: 1111, Phone: 2222) to overwrite password.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Overwrite historical user profile passwords via validated security tokens (Public)
 *     tags: [User privileges]
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
 *               identifier: { type: string, example: "aarav@horizonx.com" }
 *               emailOtp: { type: string, example: "1111" }
 *               phoneOtp: { type: string, example: "2222" }
 *               newPassword: { type: string, example: "BrandNewSecurePass2026!" }
 *     responses:
 *       200:
 *         description: Password updated successfully.
 */
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { identifier, emailOtp, phoneOtp, newPassword } = req.body;
    if (emailOtp !== '1111' || phoneOtp !== '2222') return res.status(401).json({ error: 'Invalid verification security tokens.' });

    const user = await User.findOne({ where: { [Op.or]: [{ email: identifier }, { phone: identifier }] } });
    if (!user) return res.status(404).json({ error: 'User profile mapping targets missing.' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.status(200).json({ message: 'Password recovery execution completed.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get onboarded user profile data for active session
 *     tags: [User privileges]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Structural tracking items successfully loaded.
 */
app.get('/api/users/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ error: 'User profile not found.' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile metrics configuration data (Includes Secure Password Change)
 *     tags: [User privileges]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               oldPassword: { type: string }
 *               newPassword: { type: string }
 *               confirmNewPassword: { type: string }
 *     responses:
 *       200:
 *         description: Profile entries successfully modified.
 */
app.put('/api/users/profile', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, oldPassword, newPassword, confirmNewPassword, gender, dob, nationality, avatar } = req.body;
    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User profile not found.' });

    if (email && email !== user.email) {
      const duplicateEmail = await User.findOne({ where: { email } });
      if (duplicateEmail) return res.status(400).json({ error: 'Email variant allocated already.' });
      user.email = email;
    }
    if (phone && phone !== user.phone) {
      const duplicatePhone = await User.findOne({ where: { phone } });
      if (duplicatePhone) return res.status(400).json({ error: 'Phone contact allocated already.' });
      user.phone = phone;
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (gender) user.gender = gender;
    if (dob) user.dob = dob;
    if (nationality) user.nationality = nationality;
    if (avatar) user.avatar = avatar;

    if (newPassword) {
      if (!oldPassword || !confirmNewPassword) {
        return res.status(400).json({ error: 'Altering credentials requires oldPassword, newPassword, and confirmNewPassword fields.' });
      }
      if (newPassword !== confirmNewPassword) return res.status(400).json({ error: 'New password entries do not match.' });
      
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) return res.status(401).json({ error: 'The old password provided does not match our records.' });

      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    res.status(200).json({ message: 'User profile successfully altered.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/users:
 *   delete:
 *     summary: Delete an existing user profile and associated records
 *     tags: [User privileges]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *               - delete
 *             properties:
 *               identifier: { type: string, example: "aarav@horizonx.com" }
 *               password: { type: string, example: "FlyHighSecure123!" }
 *               delete: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Data item cleared.
 */
app.delete('/api/users', async (req, res) => {
  try {
    const { identifier, password, delete: confirmDelete } = req.body;
    if (confirmDelete !== true) return res.status(400).json({ error: 'Toggle parameter must evaluate to true.' });

    const user = await User.findOne({ where: { [Op.or]: [{ email: identifier }, { phone: identifier }] } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Authentication signature validation mismatch.' });
    }

    await user.destroy();
    res.status(200).json({ message: "We're sorry to see you go. Record erased." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/itinerary:
 *   get:
 *     summary: Search for available flight options based on itinerary parameters
 *     tags: [User privileges]
 *     parameters:
 *       - in: query
 *         name: itinerary
 *         required: true
 *         schema: { type: string }
 *         description: "Sector connection format (e.g., DEL-BOM)"
 *       - in: query
 *         name: tripType
 *         required: true
 *         schema: { type: string, enum: [oneway, roundtrip, multicity] }
 *       - in: query
 *         name: paxType
 *         required: true
 *         schema: { type: string }
 *         description: "Passenger configuration layout (Format: A-1_C-0_I-0)"
 *       - in: query
 *         name: cabinClass
 *         required: true
 *         schema: { type: string, enum: [economy, premium-economy, business] }
 *     responses:
 *       200:
 *         description: Search evaluations compiled successfully.
 */
app.get('/api/itinerary', async (req, res) => {
  try {
    const { itinerary, tripType, paxType, cabinClass } = req.query;
    if (!itinerary || !tripType || !paxType || !cabinClass) return res.status(400).json({ error: 'Missing parameters.' });

    const parts = paxType.split('_');
    const adults = parseInt(parts[0].split('-')[1], 10);
    const children = parseInt(parts[1].split('-')[1], 10);
    const infants = parseInt(parts[2].split('-')[1], 10);

    if (adults < 1 || infants > adults) return res.status(400).json({ error: 'Passenger limits evaluation error.' });

    const [origin, destination] = itinerary.split('-');
    const availableFlights = await Flight.findAll({ where: { origin: origin.toUpperCase(), destination: destination.toUpperCase() } });

    let priceMultiplier = 1.0;
    if (cabinClass === 'premium-economy') priceMultiplier = 1.4;
    if (cabinClass === 'business') priceMultiplier = 2.5;

    const mappedItineraryOptions = availableFlights.map(flight => {
      const baseFarePerSeat = parseFloat(flight.price) * priceMultiplier;
      return {
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        sector: `${flight.origin}-${flight.destination}`,
        cabinClass,
        fareMetrics: { baseFarePerSeat: baseFarePerSeat.toFixed(2), totalCalculatedItineraryCost: (baseFarePerSeat * (adults + children)).toFixed(2) }
      };
    });

    res.status(200).json({ optionsAvailable: mappedItineraryOptions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ENGINE BOOTSTRAPPER
// ==========================================
if (process.env.NODE_ENV !== 'test') {
  sequelize.sync({ force: false })
    .then(async () => {
      await seedDatabase(); 
      app.listen(PORT, () => console.log(`🚀 Horizon-X Engine live on http://localhost:${PORT}`));
    })
    .catch(err => console.error('Database configuration sync failed:', err));
}

module.exports = app;