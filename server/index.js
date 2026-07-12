const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const sequelize = require('./config/database');
const Flight = require('./models/Flight');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'horizon_x_secret_key';

// ==========================================
// SWAGGER CONFIGURATION (OPENAPI 3.0)
// ==========================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '🚀 Horizon-X Engine Core API Specs',
      version: '1.0.0',
      description: 'Dynamic API registry documentation for Horizon-X flight services and user CRUD ecosystems.',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your session token output string to access locked routes.',
        },
      },
    },
  },
  apis: ['./index.js'], // Scrape OpenAPI comment blocks from this file
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Handles base64 graphics safely

// Defensive Request Guard Middleware
app.use((req, res, next) => {
  if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && (!req.body || Object.keys(req.body).length === 0)) {
    return res.status(400).json({ error: 'Malformed request payload. Check your Content-Type headers.' });
  }
  next();
});

// Self-Contained Authentication Gatekeeper Middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid authentication token.' });
  }
};

// ==========================================
// SYSTEM HEALTH & SEEDING ENDPOINTS
// ==========================================

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: System heartbeat verification status Check
 *     tags: [System Health]
 *     responses:
 *       200:
 *         description: Server is online and executing routines cleanly.
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Backend is breathing!' });
});

/**
 * @openapi
 * /api/test-seed:
 *   get:
 *     summary: Auto-initialize and seed mockup baseline database states
 *     tags: [System Health]
 *     responses:
 *       200:
 *         description: Database data configuration synchronized successfully.
 */
app.get('/api/test-seed', async (req, res) => {
  try {
    const flightCount = await Flight.count();
    if (flightCount === 0) {
      await Flight.create({
        flightNumber: 'MMT-101',
        airline: 'MockAir',
        origin: 'DEL',
        destination: 'BOM',
        price: 5500.00
      });
      return res.json({ message: 'Database seeded with a test flight!' });
    }
    res.json({ message: 'Database already has data.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/flights:
 *   get:
 *     summary: Extract complete available flights catalog mapping parameters
 *     tags: [Flight Management]
 *     responses:
 *       200:
 *         description: Returns an array mapping active flight information models.
 */
app.get('/api/flights', async (req, res) => {
  try {
    const flights = await Flight.findAll();
    res.json(flights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// USER MANAGEMENT & ONBOARDING (CRUD)
// ==========================================

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Onboard and generate a new profile database row
 *     tags: [User Core (CRUD)]
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
 *               avatar: { type: string, description: "Raw Base64 encoded imaging structure details." }
 *               emailOtp: { type: string, example: "1111", description: "Static mock code '1111'" }
 *               phoneOtp: { type: string, example: "2222", description: "Static mock code '2222'" }
 *     responses:
 *       201:
 *         description: Account registry created smoothly.
 *       400:
 *         description: Validation limits breached or duplicate structural credentials flagged.
 *       401:
 *         description: Handshake validation parameters failed verification rules.
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
 * @openapi
 * /api/users:
 *   get:
 *     summary: Retrieve total registry catalog list mapping arrays (Admin view)
 *     tags: [User Core (CRUD)]
 *     responses:
 *       200:
 *         description: Global collection array returned. Password fields explicitly omitted.
 */
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/users/profile:
 *   get:
 *     summary: Fetch active profile credentials parsed from authentication scope variables
 *     tags: [User Core (CRUD)]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user instance records extracted matching token index key.
 *       401:
 *         description: Request structure denied due to lack of bearer validation credentials.
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
 * @openapi
 * /api/users/profile:
 *   put:
 *     summary: Alter structural metrics parameters on active records instance rows
 *     tags: [User Core (CRUD)]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *               gender: { type: string }
 *               dob: { type: string, format: date }
 *               nationality: { type: string }
 *               avatar: { type: string }
 *     responses:
 *       200:
 *         description: Target profile entries successfully modified.
 *       400:
 *         description: Input update vectors clash with existing unique index parameters.
 */
app.put('/api/users/profile', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, gender, dob, nationality, avatar } = req.body;
    
    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User profile not found.' });

    if (email && email !== user.email) {
      const duplicateEmail = await User.findOne({ where: { email } });
      if (duplicateEmail) return res.status(400).json({ error: 'Email variant is already allocated to another profile.' });
      user.email = email;
    }
    if (phone && phone !== user.phone) {
      const duplicatePhone = await User.findOne({ where: { phone } });
      if (duplicatePhone) return res.status(400).json({ error: 'Phone contact is already allocated to another profile.' });
      user.phone = phone;
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (gender) user.gender = gender;
    if (dob) user.dob = dob;
    if (nationality) user.nationality = nationality;
    if (avatar) user.avatar = avatar;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.status(200).json({ message: 'User profile successfully altered.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/users:
 *   delete:
 *     summary: Purge active records data row matching parameters safely
 *     tags: [User Core (CRUD)]
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
 *         description: Operational payload executed. Record erased completely.
 *       400:
 *         description: Safety confirmation token parameter mismatch verification checks.
 *       401:
 *         description: Target identity authentication keys mismatch profile signature fields.
 */
app.delete('/api/users', async (req, res) => {
  try {
    const { identifier, password, delete: confirmDelete } = req.body;

    if (confirmDelete !== true) {
      return res.status(400).json({ error: 'Deletion operation rejected. Confirmation safety toggle must evaluate to true.' });
    }

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Missing security verification elements.' });
    }

    const user = await User.findOne({
      where: { [Op.or]: [{ email: identifier }, { phone: identifier }] }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Authentication verification mismatch. Action terminated.' });
    }

    await user.destroy();

    res.status(200).json({
      message: "We're sorry to see you go. Thank you for being with us, You're always welcome back if you decide to return."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// AUTHENTICATION PROTOCOLS (APPROACH A & B)
// ==========================================

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Session authentication route using signature credentials (Approach A)
 *     tags: [Session Authorization Routes]
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
 *         description: Verified successfully. Returns a valid Bearer Token.
 *       401:
 *         description: Credentials verification failed.
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

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Authentication successful!', token: `Bearer ${token}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     summary: Session authentication route using dynamic text tokens verification (Approach B)
 *     tags: [Session Authorization Routes]
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
 *             properties:
 *               identifier: { type: string, example: "aarav@horizonx.com" }
 *               emailOtp: { type: string, example: "1111" }
 *               phoneOtp: { type: string, example: "2222" }
 *     responses:
 *       200:
 *         description: Dynamic validation passed successfully. Token issued.
 *       401:
 *         description: Validation digits parameter array evaluated to invalid.
 */
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { identifier, emailOtp, phoneOtp } = req.body;

    if (!emailOtp || !phoneOtp || emailOtp.length !== 4 || phoneOtp.length !== 4) {
      return res.status(400).json({ error: 'Both Email and Phone OTPs must be exactly 4 digits.' });
    }

    if (emailOtp === phoneOtp) {
      return res.status(400).json({ error: 'Email OTP and Phone OTP cannot be the same.' });
    }

    if (emailOtp !== '1111' || phoneOtp !== '2222') {
      return res.status(401).json({ error: 'Invalid OTP verification codes.' });
    }

    let user = await User.findOne({
      where: { [Op.or]: [{ email: identifier }, { phone: identifier }] }
    });

    const token = jwt.sign({ userId: user ? user.id : 'guest_account' }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({
      message: 'OTP verified successfully!',
      isRegisteredUser: !!user,
      token: `Bearer ${token}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ENGINE BOOTSTRAPPER
// ==========================================
if (process.env.NODE_ENV !== 'test') {
  sequelize.sync({ force: false })
    .then(() => {
      app.listen(PORT, () => console.log(`🚀 Horizon-X Engine live on http://localhost:${PORT}`));
      console.log(`📑 Interactive Swagger specifications rendering interface live on http://localhost:${PORT}/api-docs`);
    })
    .catch(err => console.error('Database configuration sync failed:', err));
}

module.exports = app;