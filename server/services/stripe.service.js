let stripe = null;

function getStripeInstance() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.includes('placeholder') || secretKey === 'sk_test_...') {
    return null;
  }
  if (!stripe) {
    try {
      const StripeLib = require('stripe');
      stripe = StripeLib(secretKey);
    } catch {
      console.warn('⚠️ Stripe package is not yet installed. Run "npm install stripe" to enable real Stripe Checkout.');
      return null;
    }
  }
  return stripe;
}

/**
 * Creates a Stripe Checkout Session for flight ticket purchases.
 * Enforces one-shot payment (no EMIs) as per specification.
 */
async function createStripeSession({ booking, passengers, legs, clientBaseUrl, platformFee }) {
  const stripeClient = getStripeInstance();
  const originUrl = clientBaseUrl || process.env.CLIENT_ORIGIN || 'http://localhost:5173';

  // 1. Live connection to Stripe API (using your test/live secret key)
  if (stripeClient) {
    // Build line items for each flight leg in the journey
    const line_items = legs.map((leg, index) => {
      // In INR, Stripe expects integer subunits (paise): 1 INR = 100 paise
      const unitAmountInPaise = Math.round(Number(leg.perPassengerFareWithTax) * 100);

      return {
        price_data: {
          currency: (booking.currency || 'INR').toLowerCase(),
          product_data: {
            name: `Sector ${index + 1}: ${leg.airlineName || 'Aviation Fleet'} (${leg.flightNumber})`,
            description: `${leg.originAirportCode} ➔ ${leg.destinationAirportCode} | Cabin: ${booking.cabinClass} | Passenger(s): ${passengers.map(p => `${p.firstName} ${p.lastName}`).join(', ')}`,
            metadata: {
              flightId: leg.flightId,
              flightNumber: leg.flightNumber
            }
          },
          unit_amount: unitAmountInPaise,
        },
        quantity: passengers.length,
      };
    });

    // Add Convenience & Platform Fee line item
    if (platformFee && Number(platformFee) > 0) {
      line_items.push({
        price_data: {
          currency: (booking.currency || 'INR').toLowerCase(),
          product_data: {
            name: 'Convenience & Platform Fee'
          },
          unit_amount: Math.round(Number(platformFee) * 100),
        },
        quantity: 1,
      });
    }

    const successUrl = `${originUrl}/booking/success?pnr=${booking.pnr}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${originUrl}/checkout?cancelled=true&pnr=${booking.pnr}`;

    const session = await stripeClient.checkout.sessions.create({
      line_items,
      mode: 'payment', // One-shot payment only
      customer_email: booking.contactEmail,
      client_reference_id: booking.id,
      metadata: {
        bookingId: booking.id,
        pnr: booking.pnr,
        tripType: booking.tripType,
        cabinClass: booking.cabinClass,
        passengerCount: String(passengers.length)
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return {
      paymentGateway: 'STRIPE_TEST_SANDBOX',
      isOfflineSimulation: false,
      sessionId: session.id,
      checkoutUrl: session.url,
      successUrl: `${originUrl}/booking/success?pnr=${booking.pnr}&session_id=${session.id}`,
      cancelUrl
    };
  }

  // 2. Offline Simulation Fallback (only used when STRIPE_SECRET_KEY is completely missing from .env)
  const mockSessionId = `mock_cs_${Date.now()}_${booking.pnr}`;
  const mockCheckoutUrl = `${originUrl}/booking/success?pnr=${booking.pnr}&session_id=${mockSessionId}&mode=mock_sandbox`;
  const fallbackCancelUrl = `${originUrl}/checkout?cancelled=true&pnr=${booking.pnr}`;

  return {
    paymentGateway: 'OFFLINE_LOCAL_SIMULATION',
    isOfflineSimulation: true,
    sessionId: mockSessionId,
    checkoutUrl: mockCheckoutUrl,
    successUrl: mockCheckoutUrl,
    cancelUrl: fallbackCancelUrl,
    notice: 'Stripe Secret Key is pending in .env. Operating in Offline Local Simulation Mode.'
  };
}

module.exports = { createStripeSession, getStripeInstance };
