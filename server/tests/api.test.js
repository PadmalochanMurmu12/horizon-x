const request = require('supertest');
const app = require('../index');
const { sequelize, User, Booking, BookingPassenger, Location, Flight, FlightFare, FeeConfig, CancellationReason } = require('../models');
const { seedDatabase } = require('../utils/seeder');
const { seedCancellationDefaults } = require('../utils/cancellation.seeder');

jest.setTimeout(35000);

let passengerToken = '';
let passengerUserId = '';
let adminToken = '';
let testPnr = '';
let checkedInPnr = '';
let flightToBook = null;

beforeAll(async () => {
  await sequelize.sync({ force: false });
  const locCount = await Location.count();
  if (locCount === 0) {
    await seedDatabase();
  }
  await seedCancellationDefaults();

  // Find a valid scheduled flight for booking tests
  flightToBook = await Flight.findOne({
    where: { status: 'SCHEDULED' },
    include: [{ model: FlightFare, as: 'fares' }]
  });

  // Obtain Admin Token for admin suites
  const adminRes = await request(app)
    .post('/api/admin/login')
    .send({
      username: process.env.ADMIN_USERNAME || 'admin@horizonx.com',
      password: process.env.ADMIN_PASSWORD || 'Test@1234'
    });
  adminToken = adminRes.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('✈️ HORIZON-X FULL REST API TEST SUITE', () => {

  // ==========================================
  // 1. SYSTEM UTILITY APIs
  // ==========================================
  describe('System Utility APIs', () => {
    it('GET /api/health should return system status UP', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('UP');
    });

    it('GET /api/airports should return list of accessible airports', async () => {
      const res = await request(app).get('/api/airports');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('airportCode');
    });

    it('GET /api/flight-status should return public flight status board without any authentication', async () => {
      const res = await request(app).get('/api/flight-status');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('flightNumber');
      expect(res.body.data[0]).toHaveProperty('flightStatus');
      expect(res.body.data[0]).toHaveProperty('terminal');
      expect(res.body.data[0]).toHaveProperty('gate');
    });

    it('GET /api/flight-status should filter by flightNumber parameter', async () => {
      if (!flightToBook) return;
      const res = await request(app).get(`/api/flight-status?flightNumber=${flightToBook.flightNumber}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.some(f => f.flightNumber === flightToBook.flightNumber)).toBe(true);
    });
  });

  // ==========================================
  // 2. PASSENGER AUTHENTICATION & PROFILE APIs
  // ==========================================
  describe('Passenger Auth & Profile APIs', () => {
    const testEmail = `tester_${Date.now()}@horizonx.com`;
    const testPhone = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    it('POST /api/auth/register should fail on incorrect sandbox OTP', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Anil',
          lastName: 'Kapoor',
          email: `fail_${testEmail}`,
          phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          password: 'Password@123',
          gender: 'MALE',
          dob: '1985-05-15',
          nationality: 'Indian',
          emailOtp: '9999',
          phoneOtp: '8888'
        });
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Security clearance failed');
    });

    it('POST /api/auth/register should onboard passenger with sandbox OTPs 1111 / 2222', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Anil',
          lastName: 'Kapoor',
          email: testEmail,
          phone: testPhone,
          password: 'Password@123',
          gender: 'MALE',
          dob: '1985-05-15',
          nationality: 'Indian',
          emailOtp: '1111',
          phoneOtp: '2222'
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('userId');
      passengerUserId = res.body.userId;
    });

    it('POST /api/auth/login should block on wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: testEmail, password: 'WrongPassword' });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/auth/login should authenticate passenger and return Bearer token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: testEmail, password: 'Password@123' });
      expect(res.statusCode).toBe(200);
      expect(res.body.token.startsWith('Bearer ')).toBe(true);
      passengerToken = res.body.token;
    });

    it('GET /api/users/profile should retrieve profile for authenticated passenger', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', passengerToken);
      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe(testEmail);
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).toHaveProperty('walletBalance');
    });

    it('GET /api/users/wallet should retrieve passenger wallet details', async () => {
      const res = await request(app)
        .get('/api/users/wallet')
        .set('Authorization', passengerToken);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('walletBalance');
      expect(res.body.data.currency).toBe('INR');
    });

    it('PUT /api/users/profile should update passenger profile', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', passengerToken)
        .send({ firstName: 'Anil Kumar', nationality: 'Indian' });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('updated successfully');
    });

    it('POST /api/auth/forgot-password should dispatch reset info for registered user', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ identifier: testEmail });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('Password reset dispatch transmitted');
    });

    it('POST /api/auth/reset-password should update password with valid OTPs', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          identifier: testEmail,
          emailOtp: '1111',
          phoneOtp: '2222',
          newPassword: 'NewPassword@456'
        });
      expect(res.statusCode).toBe(200);
    });
  });

  // ==========================================
  // 3. FLIGHT ITINERARY & AIRLINE APIs
  // ==========================================
  describe('Flight Itinerary & Airline APIs', () => {
    it('GET /api/airlines should return operational carrier fleet', async () => {
      const res = await request(app).get('/api/airlines');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('POST /api/itinerary should reject past travel dates', async () => {
      const res = await request(app)
        .post('/api/itinerary')
        .send({
          tripType: 'ONEWAY',
          cabinClass: 'ECONOMY',
          paxCounts: { adults: 1 },
          legs: [{
            origin: 'DEL',
            destination: 'BOM',
            travelDate: '2020-01-01'
          }]
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('past');
    });

    it('POST /api/itinerary should reject dates beyond 90-day booking horizon', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 95);
      const res = await request(app)
        .post('/api/itinerary')
        .send({
          tripType: 'ONEWAY',
          cabinClass: 'ECONOMY',
          paxCounts: { adults: 1 },
          legs: [{
            origin: 'DEL',
            destination: 'BOM',
            travelDate: futureDate.toISOString().split('T')[0]
          }]
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('90 days');
    });

    it('POST /api/itinerary should return flight combinations for current/valid date', async () => {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 10);
      const dateStr = validDate.toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/itinerary')
        .send({
          tripType: 'ONEWAY',
          cabinClass: 'ECONOMY',
          paxCounts: { adults: 1 },
          legs: [{
            origin: 'DEL',
            destination: 'BOM',
            travelDate: dateStr
          }]
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('data');
    });
  });

  // ==========================================
  // 4. CHECKOUT, RESERVATION & PAYMENT CONFIRMATION APIs
  // ==========================================
  describe('Checkout & Reservation Lifecycle', () => {
    it('POST /api/checkout/create-session should create checkout session & reserve PNR', async () => {
      if (!flightToBook) return;

      const res = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', passengerToken)
        .send({
          contactInfo: {
            email: 'passenger@horizonx.com',
            phone: '+919876543210'
          },
          tripType: 'ONEWAY',
          cabinClass: 'ECONOMY',
          legs: [{ flightId: flightToBook.id }],
          passengers: [
            {
              firstName: 'Rahul',
              lastName: 'Sharma',
              age: 30,
              nationality: 'Indian',
              seatNo: '14B',
              foodOption: 'VEG'
            }
          ]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('pnr');
      expect(res.body.data.pnr.length).toBe(6);
      testPnr = res.body.data.pnr;
    });

    it('POST /api/checkout/confirm should confirm payment and issue tickets under sandbox mock session', async () => {
      if (!testPnr) return;

      const res = await request(app)
        .post('/api/checkout/confirm')
        .send({
          pnr: testPnr,
          sessionId: 'mock_cs_test_session_12345'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CONFIRMED');
      expect(res.body.data.paymentStatus).toBe('PAID');
    });

    it('GET /api/checkout/booking/:pnr should retrieve booking manifest', async () => {
      if (!testPnr) return;

      const res = await request(app).get(`/api/checkout/booking/${testPnr}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pnr).toBe(testPnr);
    });

    it('GET /api/bookings/:pnr should also retrieve booking manifest directly', async () => {
      if (!testPnr) return;

      const res = await request(app).get(`/api/bookings/${testPnr}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pnr).toBe(testPnr);
    });

    it('POST /api/checkout/webhook should confirm booking asynchronously on checkout.session.completed', async () => {
      if (!flightToBook) return;

      // 1. Create a pending booking
      const resSession = await request(app)
        .post('/api/checkout/create-session')
        .send({
          contactInfo: { email: 'webhook_tester@horizonx.com', phone: '+919876543299' },
          tripType: 'ONEWAY',
          cabinClass: 'ECONOMY',
          legs: [{ flightId: flightToBook.id }],
          passengers: [{ firstName: 'Webhook', lastName: 'Passenger', age: 32, nationality: 'Indian' }]
        });
      const webhookPnr = resSession.body.data.pnr;

      // 2. Dispatch mock checkout.session.completed webhook
      const webhookPayload = JSON.stringify({
        id: `evt_test_${Date.now()}`,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: `cs_test_hook_${Date.now()}`,
            payment_status: 'paid',
            payment_intent: `pi_test_${Date.now()}`,
            metadata: {
              pnr: webhookPnr,
              tripType: 'ONEWAY',
              cabinClass: 'ECONOMY'
            }
          }
        }
      });

      const resHook = await request(app)
        .post('/api/checkout/webhook')
        .set('Content-Type', 'application/json')
        .send(webhookPayload);

      expect(resHook.statusCode).toBe(200);
      expect(resHook.body.received).toBe(true);
      expect(resHook.body.status).toBe('CONFIRMED');

      // 3. Verify booking is now CONFIRMED and PAID in database
      const verifyRes = await request(app).get(`/api/bookings/${webhookPnr}`);
      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.data.status).toBe('CONFIRMED');
      expect(verifyRes.body.data.paymentStatus).toBe('PAID');

      // 4. Test Webhook Idempotency (resending same event)
      const resHookDuplicate = await request(app)
        .post('/api/checkout/webhook')
        .set('Content-Type', 'application/json')
        .send(webhookPayload);
      expect(resHookDuplicate.statusCode).toBe(200);
      expect(resHookDuplicate.body.status).toBe('ALREADY_CONFIRMED');
    });
  });

  // ==========================================
  // 5. MY BOOKINGS & DOCUMENT GENERATION APIs
  // ==========================================
  describe('My Bookings & Documents (E-Ticket / Boarding Pass)', () => {
    it('GET /api/bookings should return booking cards manifest', async () => {
      const res = await request(app).get('/api/bookings');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/bookings/:pnr/ticket?format=json should generate JSON e-ticket receipt', async () => {
      if (!testPnr) return;

      const res = await request(app).get(`/api/bookings/${testPnr}/ticket?format=json`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pnr).toBe(testPnr);
      expect(res.body.data.documentType).toBe('ELECTRONIC_TICKET_RECEIPT');
    });

    it('GET /api/bookings/:pnr/ticket?format=markdown should generate Markdown e-ticket', async () => {
      if (!testPnr) return;

      const res = await request(app).get(`/api/bookings/${testPnr}/ticket?format=markdown`);
      expect(res.statusCode).toBe(200);
      expect(res.body.content).toContain('Passenger Details');
      expect(res.body.content).not.toContain('undefined');
    });

    it('GET /api/bookings/:pnr/ticket?format=html should generate printable HTML ticket', async () => {
      if (!testPnr) return;

      const res = await request(app).get(`/api/bookings/${testPnr}/ticket?format=html`);
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Passenger Details');
      expect(res.text).not.toContain('undefined');
    });

    it('GET /api/bookings/:pnr/boarding-pass?format=markdown should generate Boarding Pass for confirmed flight', async () => {
      if (!testPnr) return;

      const res = await request(app).get(`/api/bookings/${testPnr}/boarding-pass?format=markdown`);
      expect(res.statusCode).toBe(200);
      expect(res.body.content).toContain('BOARDING PASS');
    });
  });

  // ==========================================
  // 6. WEB CHECK-IN API
  // ==========================================
  describe('Web Check-in API', () => {
    it('POST /api/checkin/web-checkin should reject missing mandatory fields', async () => {
      const res = await request(app)
        .post('/api/checkin/web-checkin')
        .send({ pnr: testPnr });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/mandatory/i);
    });

    it('POST /api/checkin/web-checkin should complete check-in and allocate terminal, gate, and barcode', async () => {
      if (!testPnr) return;

      const res = await request(app)
        .post('/api/checkin/web-checkin')
        .send({
          pnr: testPnr,
          lastName: 'Sharma',
          email: 'passenger@horizonx.com',
          mobileLast4: '3210'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isCheckedIn).toBe(true);
      expect(res.body.data.terminal).toBeDefined();
      expect(res.body.data.gate).toBeDefined();
      checkedInPnr = testPnr;
    });
  });

  // ==========================================
  // 7. CANCELLATION & REFUNDS (WITH BUG FIX VERIFICATION)
  // ==========================================
  describe('Cancellation & Refunds Lifecycle', () => {
    it('GET /api/cancellation/reasons should return active cancellation reasons', async () => {
      const res = await request(app).get('/api/cancellation/reasons');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some(r => r.reasonCode === 'CHANGE_OF_PLANS')).toBe(true);
    });

    it('POST /api/cancellation/cancel MUST BLOCK CANCELLATION IF WEB CHECK-IN COMPLETED (Bug Fix)', async () => {
      if (!checkedInPnr) return;

      const res = await request(app)
        .post('/api/cancellation/cancel')
        .send({
          pnr: checkedInPnr,
          reason: 'CHANGE_OF_PLANS',
          refundTo: 'ORIGINAL_SOURCE',
          cancel: true
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Web check-in has already been completed');
    });

    it('POST /api/cancellation/cancel MUST BLOCK PREVIEW QUOTE IF WEB CHECK-IN COMPLETED', async () => {
      if (!checkedInPnr) return;

      const res = await request(app)
        .post('/api/cancellation/cancel')
        .send({
          pnr: checkedInPnr,
          reason: 'CHANGE_OF_PLANS',
          refundTo: 'ORIGINAL_SOURCE',
          cancel: false
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Web check-in has already been completed');
    });

    it('POST /api/checkin/cancel should reject cancellation when passenger last name mismatches', async () => {
      if (!checkedInPnr) return;

      const res = await request(app)
        .post('/api/checkin/cancel')
        .send({
          pnr: checkedInPnr,
          lastName: 'MismatchedName'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('mismatch');
    });

    it('POST /api/checkin/cancel should successfully offload passenger and cancel web check-in', async () => {
      if (!checkedInPnr) return;

      const res = await request(app)
        .post('/api/checkin/cancel')
        .send({
          pnr: checkedInPnr,
          lastName: 'Sharma'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isCheckedIn).toBe(false);
      expect(res.body.message).toContain('successfully cancelled');
    });

    it('VERIFY: Once web check-in is cancelled, cancellation preview quote IS NOW UNBLOCKED', async () => {
      if (!checkedInPnr) return;

      const res = await request(app)
        .post('/api/cancellation/cancel')
        .send({
          pnr: checkedInPnr,
          reason: 'CHANGE_OF_PLANS',
          refundTo: 'ORIGINAL_SOURCE',
          cancel: false
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.previewOnly).toBe(true);
    });

    it('POST /api/checkin/cancel should reject when booking is not checked in', async () => {
      if (!checkedInPnr) return;

      const res = await request(app)
        .post('/api/checkin/cancel')
        .send({
          pnr: checkedInPnr,
          lastName: 'Sharma'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('not currently checked in');
    });

    it('Re-run web check-in for subsequent admin testing', async () => {
      if (!checkedInPnr) return;

      const res = await request(app)
        .post('/api/checkin/web-checkin')
        .send({
          pnr: checkedInPnr,
          lastName: 'Sharma'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isCheckedIn).toBe(true);
    });

    // Create a separate non-checked-in booking for testing valid cancellation
    let cancelablePnr = '';
    let guestCancelablePnr = '';

    it('Setup: Create non-checked-in booking for registered user', async () => {
      if (!flightToBook) return;

      const res = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', passengerToken)
        .send({
          userId: passengerUserId,
          contactInfo: { email: 'registered@horizonx.com', phone: '+919988776655' },
          tripType: 'ONEWAY',
          cabinClass: 'ECONOMY',
          legs: [{ flightId: flightToBook.id }],
          passengers: [{ firstName: 'Sunil', lastName: 'Verma', age: 28, nationality: 'Indian' }]
        });
      cancelablePnr = res.body.data.pnr;
      await request(app).post('/api/checkout/confirm').send({ pnr: cancelablePnr, sessionId: 'mock_cs_test_session_user' });
    });

    it('Setup: Create non-checked-in guest booking', async () => {
      if (!flightToBook) return;

      const res = await request(app)
        .post('/api/checkout/create-session')
        .send({
          contactInfo: { email: 'guest@horizonx.com', phone: '+919988776644' },
          tripType: 'ONEWAY',
          cabinClass: 'ECONOMY',
          legs: [{ flightId: flightToBook.id }],
          passengers: [{ firstName: 'Guest', lastName: 'Traveler', age: 25, nationality: 'Indian' }]
        });
      guestCancelablePnr = res.body.data.pnr;
      await request(app).post('/api/checkout/confirm').send({ pnr: guestCancelablePnr, sessionId: 'mock_cs_test_session_guest' });
    });

    it('POST /api/cancellation/cancel should reject Guest refundTo WALLET with 403', async () => {
      if (!guestCancelablePnr) return;

      const res = await request(app)
        .post('/api/cancellation/cancel')
        .send({
          pnr: guestCancelablePnr,
          reason: 'CHANGE_OF_PLANS',
          refundTo: 'WALLET',
          cancel: true
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Access denied: You must be logged in to refund the amount to the wallet');
    });

    it('POST /api/cancellation/cancel with cancel: false should return refund quote preview', async () => {
      if (!cancelablePnr) return;

      const res = await request(app)
        .post('/api/cancellation/cancel')
        .send({
          pnr: cancelablePnr,
          reason: 'CHANGE_OF_PLANS',
          refundTo: 'WALLET',
          cancel: false
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.previewOnly).toBe(true);
      expect(res.body.data.refundBreakup).toHaveProperty('refundAmount');
      expect(res.body.data.refundBreakup).toHaveProperty('cancellationFee');
      expect(res.body.data.refundBreakup).toHaveProperty('platformFee');
    });

    it('POST /api/cancellation/cancel with cancel: true should cancel and credit Wallet for registered user', async () => {
      if (!cancelablePnr) return;

      const res = await request(app)
        .post('/api/cancellation/cancel')
        .send({
          pnr: cancelablePnr,
          reason: 'CHANGE_OF_PLANS',
          refundTo: 'WALLET',
          cancel: true
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(res.body.data.paymentStatus).toBe('REFUNDED_TO_WALLET');
      expect(res.body.data).toHaveProperty('updatedWalletBalance');
    });

    it('POST /api/cancellation/cancel on already cancelled booking should be blocked idempotently', async () => {
      if (!cancelablePnr) return;

      const res = await request(app)
        .post('/api/cancellation/cancel')
        .send({
          pnr: cancelablePnr,
          reason: 'CHANGE_OF_PLANS',
          refundTo: 'WALLET',
          cancel: true
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Reservation already cancelled');
    });
  });

  // ==========================================
  // 8. ADMIN GROUND CONTROL APIs
  // ==========================================
  describe('Admin Ground Control APIs', () => {
    it('POST /api/admin/login should grant clearance with valid admin credentials', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({
          username: process.env.ADMIN_USERNAME || 'admin@horizonx.com',
          password: process.env.ADMIN_PASSWORD || 'Test@1234'
        });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('GET /api/cities should reject unauthorized requests without token', async () => {
      const res = await request(app).get('/api/cities');
      expect(res.statusCode).toBe(401);
    });

    it('GET /api/cities should return operational cities with Admin token', async () => {
      const res = await request(app)
        .get('/api/cities')
        .set('Authorization', adminToken);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/flights should return flight manifest with Admin token', async () => {
      const res = await request(app)
        .get('/api/flights')
        .set('Authorization', adminToken);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/users should return registered passenger manifest with Admin token', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', adminToken);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/admin/fee-config should retrieve current fee config with Admin token', async () => {
      const res = await request(app)
        .get('/api/admin/fee-config')
        .set('Authorization', adminToken);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('cancellationFee');
      expect(res.body.data).toHaveProperty('platformFee');
    });

    it('PUT /api/admin/update-price should update global cancellation and platform fees', async () => {
      const res = await request(app)
        .put('/api/admin/update-price')
        .set('Authorization', adminToken)
        .send({
          cancellationFee: 1600.00,
          platformFee: 300.00
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cancellationFee).toBe(1600.00);
      expect(res.body.data.platformFee).toBe(300.00);
    });

    it('PUT /api/admin/update-price should reject negative fees with 400', async () => {
      const res = await request(app)
        .put('/api/admin/update-price')
        .set('Authorization', adminToken)
        .send({
          cancellationFee: -500,
          platformFee: 100
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('cannot be negative');
    });

    it('PUT /api/admin/bookings/:pnr/complete should mark confirmed booking as COMPLETED', async () => {
      if (!checkedInPnr) return;

      const res = await request(app)
        .put(`/api/admin/bookings/${checkedInPnr}/complete`)
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
    });

    it('GET /api/bookings/:pnr/boarding-pass MUST BLOCK COMPLETED FLIGHTS', async () => {
      if (!checkedInPnr) return;

      const res = await request(app).get(`/api/bookings/${checkedInPnr}/boarding-pass`);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('already departed and concluded');
    });

    it('GET /api/bookings/:pnr/ticket MUST REMAIN ACCESSIBLE FOR COMPLETED FLIGHTS', async () => {
      if (!checkedInPnr) return;

      const res = await request(app).get(`/api/bookings/${checkedInPnr}/ticket?format=json`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
    });
  });
});
