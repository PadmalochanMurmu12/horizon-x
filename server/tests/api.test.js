const request = require('supertest');
const app = require('../index');
const sequelize = require('../config/database');
const User = require('../models/User');

let authToken = ''; // Will hold the session token for protected routes

beforeAll(async () => {
  // Sync the database structures clean before running tests
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  // Close database connection cleanly after all actions terminate
  await sequelize.close();
});

describe('🚀 Horizon-X Onboarding & Identity Integration Suite', () => {

  // ==========================================
  // 1. POST /api/auth/register (CREATE USER)
  // ==========================================
  describe('POST /api/auth/register', () => {
    it('should successfully onboard a new user with valid metrics', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Pilot',
          lastName: 'Test',
          email: 'pilot@horizonx.com',
          phone: '+919999999999',
          password: 'SecurePassword123!',
          gender: 'Male',
          dob: '1995-01-01',
          nationality: 'Indian',
          avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'User onboarded successfully!');
      expect(res.body).toHaveProperty('userId');
    });

    it('should reject registration if email or phone already exists', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Duplicate',
          lastName: 'User',
          email: 'pilot@horizonx.com', // Duplicate
          phone: '+919999999999', // Duplicate
          password: 'Password123!',
          gender: 'Female',
          dob: '1990-10-10',
          nationality: 'Indian'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Email or Phone Number is already registered.');
    });
  });

  // ==========================================
  // 2. POST /api/auth/login (APPROACH A)
  // ==========================================
  describe('POST /api/auth/login', () => {
    it('should authenticate a valid user and hand back a Bearer Token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'pilot@horizonx.com',
          password: 'SecurePassword123!'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.token.startsWith('Bearer ')).toBe(true);
      
      // Save token globally to unlock subsequent protected routes
      authToken = res.body.token;
    });

    it('should block authentication on invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'pilot@horizonx.com',
          password: 'WrongPassword!'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid credentials.');
    });
  });

  // ==========================================
  // 3. POST /api/auth/verify-otp (APPROACH B)
  // ==========================================
  describe('POST /api/auth/verify-otp', () => {
    it('should successfully authenticate using valid dual-static OTPs', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          identifier: 'pilot@horizonx.com',
          emailOtp: '1111',
          phoneOtp: '2222'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('isRegisteredUser', true);
    });

    it('should enforce strict 4-digit formatting rules', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          identifier: 'pilot@horizonx.com',
          emailOtp: '111', // Invalid length
          phoneOtp: '2222'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Both Email and Phone OTPs must be exactly 4 digits.');
    });

    it('should crash authorization if email and phone OTP parameters match', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          identifier: 'pilot@horizonx.com',
          emailOtp: '1111',
          phoneOtp: '1111' // Identical profile spoofing test
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Email OTP and Phone OTP cannot be the same.');
    });
  });

  // ==========================================
  // 4. GET /api/users/profile & /api/users (READ)
  // ==========================================
  describe('GET Protections & Catalog Queries', () => {
    it('should fail profile query if authorization token missing', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Access denied. No token provided.');
    });

    it('should return complete user details when querying with active token', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', authToken); // Set bearer token header

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('email', 'pilot@horizonx.com');
      expect(res.body).not.toHaveProperty('password'); // Verify exclusion rule
    });

    it('should fetch the entire user database registry for admin monitoring', async () => {
      const res = await request(app).get('/api/users');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });
  });

  // ==========================================
  // 5. PUT /api/users/profile (UPDATE)
  // ==========================================
  describe('PUT /api/users/profile', () => {
    it('should successfully mutate user fields through profile token execution', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', authToken)
        .send({
          firstName: 'Captain',
          nationality: 'Canadian'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'User profile successfully altered.');

      // Check mutation step persistence
      const profileCheck = await request(app).get('/api/users/profile').set('Authorization', authToken);
      expect(profileCheck.body.firstName).toBe('Captain');
      expect(profileCheck.body.nationality).toBe('Canadian');
    });
  });

  // ==========================================
  // 6. DELETE /api/users (DELETE)
  // ==========================================
  describe('DELETE /api/users', () => {
    it('should block execution if safety confirmation flag evaluates to false', async () => {
      const res = await request(app)
        .delete('/api/users')
        .send({
          identifier: 'pilot@horizonx.com',
          password: 'SecurePassword123!',
          delete: false // Disconnected safety toggle
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Deletion operation rejected. Confirmation safety toggle must evaluate to true.');
    });

    it('should cleanly nuke user records upon correct verification confirmation', async () => {
      const res = await request(app)
        .delete('/api/users')
        .send({
          identifier: 'pilot@horizonx.com',
          password: 'SecurePassword123!',
          delete: true
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message.includes('sorry to see you go')).toBe(true);

      // Final Check: Admin list must now evaluate to zero records
      const adminCatalog = await request(app).get('/api/users');
      expect(adminCatalog.body.length).toBe(0);
    });
  });
});