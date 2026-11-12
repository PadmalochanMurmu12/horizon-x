const request = require('supertest');
const app = require('../index');
const { sequelize, User } = require('../models');

jest.setTimeout(30000);

const ADMIN_EMAIL = process.env.ADMIN_USERNAME || 'admin@horizonx.com';
const INITIAL_ADMIN_PW = process.env.ADMIN_PASSWORD || 'Test@1234';
const NEW_ADMIN_PW = 'NewAdminSecret@2026';
const MOCK_OTP = process.env.MOCK_OTP || '1234';

const TEST_USER = {
  firstName: 'Recovery',
  lastName: 'Tester',
  email: `recovery_${Date.now()}@example.com`,
  phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
  password: 'Password@123',
  dob: '1995-05-15',
  gender: 'MALE',
  nationality: 'Indian'
};
const NEW_USER_PW = 'UpdatedPass@2026';

beforeAll(async () => {
  await sequelize.sync({ force: false });

  // Create test user for password reset tests
  await request(app)
    .post('/api/auth/register')
    .send({
      ...TEST_USER,
      emailOtp: '1111',
      phoneOtp: '2222'
    });
});

afterAll(async () => {
  // Clean up test user
  await User.destroy({ where: { email: TEST_USER.email } });

  // Restore initial admin password
  await request(app)
    .post('/api/admin/reset-password')
    .send({
      email: ADMIN_EMAIL,
      otp: MOCK_OTP,
      newPassword: INITIAL_ADMIN_PW
    });

  await sequelize.close();
});

describe('🔐 FORGOT PASSWORD & RESET PASSWORD TEST SUITE (ADMIN & USER)', () => {
  
  // ==========================================
  // ADMIN PANEL FORGOT & RESET PASSWORD
  // ==========================================
  describe('Admin Panel Forgot & Reset Password', () => {
    
    it('POST /api/admin/forgot-password should reject unknown admin email with 404', async () => {
      const res = await request(app)
        .post('/api/admin/forgot-password')
        .send({ email: 'intruder@unknown.com' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/No administrator account found/i);
    });

    it('POST /api/admin/forgot-password should succeed for registered admin email', async () => {
      const res = await request(app)
        .post('/api/admin/forgot-password')
        .send({ email: ADMIN_EMAIL });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/dispatched successfully/i);
    });

    it('POST /api/admin/reset-password should reject random/incorrect 4-digit OTP with 401', async () => {
      const res = await request(app)
        .post('/api/admin/reset-password')
        .send({
          email: ADMIN_EMAIL,
          otp: '9999',
          newPassword: NEW_ADMIN_PW
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid or incorrect 4-digit OTP/i);
    });

    it('POST /api/admin/reset-password should reject weak password (< 8 chars or no digit) with 400', async () => {
      const res = await request(app)
        .post('/api/admin/reset-password')
        .send({
          email: ADMIN_EMAIL,
          otp: MOCK_OTP,
          newPassword: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/at least 8 characters/i);
    });

    it('POST /api/admin/reset-password should update admin password with valid OTP', async () => {
      const res = await request(app)
        .post('/api/admin/reset-password')
        .send({
          email: ADMIN_EMAIL,
          otp: MOCK_OTP,
          newPassword: NEW_ADMIN_PW
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/updated successfully/i);
    });

    it('POST /api/admin/login should successfully authenticate with NEW password', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({
          username: ADMIN_EMAIL,
          password: NEW_ADMIN_PW
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('POST /api/admin/login should fail with OLD password after reset', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({
          username: ADMIN_EMAIL,
          password: INITIAL_ADMIN_PW
        });

      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // USER PANEL FORGOT & RESET PASSWORD
  // ==========================================
  describe('User Panel Forgot & Reset Password', () => {

    it('POST /api/auth/forgot-password should reject unregistered identifier with 404', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ identifier: 'nonexistent@example.com' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/No passenger record found/i);
    });

    it('POST /api/auth/forgot-password should succeed for registered user email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ identifier: TEST_USER.email });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/transmitted successfully/i);
    });

    it('POST /api/auth/forgot-password should succeed for registered user phone', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ identifier: TEST_USER.phone });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/transmitted successfully/i);
    });

    it('POST /api/auth/reset-password should reject random/incorrect 4-digit OTP with 401', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          identifier: TEST_USER.email,
          otp: '7777',
          newPassword: NEW_USER_PW
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid or incorrect 4-digit OTP/i);
    });

    it('POST /api/auth/reset-password should reject weak password with 400', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          identifier: TEST_USER.email,
          otp: MOCK_OTP,
          newPassword: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/at least 8 characters/i);
    });

    it('POST /api/auth/reset-password should update passenger password with valid 4-digit OTP', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          identifier: TEST_USER.email,
          otp: MOCK_OTP,
          newPassword: NEW_USER_PW
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/updated successfully/i);
    });

    it('POST /api/auth/login should authenticate with NEW password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: TEST_USER.email,
          password: NEW_USER_PW
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('POST /api/auth/login should fail with OLD password after reset', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: TEST_USER.email,
          password: TEST_USER.password
        });

      expect(res.status).toBe(401);
    });
  });

  describe('Guest Onboarding & Fast OTP Authentication', () => {
    it('POST /api/auth/send-otp should reject empty identifier with 400', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('POST /api/auth/send-otp should dispatch OTP code for guest email', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ identifier: 'guest.traveler@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.mockOtp).toBeDefined();
    });

    it('POST /api/auth/otp-login should reject incorrect OTP code with 401', async () => {
      const res = await request(app)
        .post('/api/auth/otp-login')
        .send({
          identifier: 'guest.traveler@example.com',
          otp: '9999'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid or incorrect/i);
    });

    it('POST /api/auth/otp-login should complete guest onboarding and issue JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/otp-login')
        .send({
          identifier: 'newguest@horizonx.com',
          otp: '1234'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/onboarding complete/i);
      expect(res.body.token).toBeDefined();
    });

    it('POST /api/auth/otp-login should onboard guest with both email and phone', async () => {
      const res = await request(app)
        .post('/api/auth/otp-login')
        .send({
          email: 'cleartrip.style@horizonx.com',
          phone: '9876543219',
          firstName: 'Rohan',
          lastName: 'Sharma',
          otp: '1234'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('cleartrip.style@horizonx.com');
      expect(res.body.user.phone).toBe('9876543219');
    });
  });
});
