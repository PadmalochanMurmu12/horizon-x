import { createSlice } from '@reduxjs/toolkit';

// Default mock flight in case user navigates to checkout directly
const DEFAULT_FLIGHT = {
  id: 'HX-402',
  isDirect: true,
  totalDuration: 165,
  departureTime: '2026-11-14T06:15:00.000Z',
  arrivalTime: '2026-11-14T09:00:00.000Z',
  isRecommended: true,
  refundableType: 'Partially Refundable',
  ecoBadge: 'Eco-saver • Carbon Offset Included',
  layovers: [],
  segments: [
    {
      flightId: '65c33d5b-510d-49f3-a8d3-b47ae34cf882',
      flightNumber: 'SK-402',
      airline: { code: 'IX', name: 'Horizon-X Wings' },
      aircraft: 'Airbus A321neo',
      origin: 'DEL',
      destination: 'BLR',
      departureTime: '2026-11-14T06:15:00.000Z',
      arrivalTime: '2026-11-14T09:00:00.000Z',
      originTerminal: 'Terminal 3',
      destinationTerminal: 'Terminal 2',
      originGate: 'Gate 14B',
      destinationBelt: 'Belt 04',
      durationMinutes: 165,
      cabinClass: 'ECONOMY',
      baggage: '15 KG'
    }
  ],
  pricing: {
    baseFare: 4250,
    tax: 640,
    totalFare: 4890,
    currency: 'INR'
  },
  features: {
    meal: true,
    baggage: true,
    usb: true,
    wifi: true
  }
};

// No pre-selected seat! User selects on aircraft seat map or chooses auto-assign
const DEFAULT_PASSENGER = {
  id: 'pax-1',
  isPrimary: true,
  firstName: '',
  lastName: '',
  gender: '',
  age: '',
  nationality: 'India',
  seatNo: null,
  seatLabel: null,
  seatType: null, // 'standard' | 'extraLegroom' | 'autoAssigned'
  seatPrice: 0,
  isAutoAssigned: false,
  mealPreference: 'Standard Non-Veg',
  foodOption: 'NON_VEG'
};

const INSURANCE_FEE = 499;
const EXTRA_BAGGAGE_FEE = 999;
const EXTRA_LEGROOM_FEE = 1200;

function calculateTotals(state) {
  const paxCount = Math.max(1, state.passengers.length);
  // Flight ticket base fare (Taxes & Airport Surcharges hidden per specification, rolled into flight fare)
  const singleBaseFare = Number(state.selectedFlight?.pricing?.totalFare || state.selectedFlight?.pricing?.baseFare || 4250);
  
  const totalBaseFare = singleBaseFare * paxCount;
  const platformFee = Number(state.feeConfig?.platformFee ?? 300);

  // Calculate seat add-ons from selected seats
  let seatAddon = 0;
  state.passengers.forEach(p => {
    if (p.seatPrice && Number(p.seatPrice) > 0) {
      seatAddon += Number(p.seatPrice);
    } else if (p.seatType === 'extraLegroom' || (p.seatPreference && p.seatPreference.includes('Extra Legroom'))) {
      seatAddon += EXTRA_LEGROOM_FEE;
    }
  });

  // Calculate extra addons
  let extraAddons = 0;
  if (state.addons.insurance) extraAddons += INSURANCE_FEE;
  if (state.addons.extraBaggage) extraAddons += EXTRA_BAGGAGE_FEE;

  // Calculate discount
  let discount = 0;
  if (state.promo.appliedCode === 'FLYHIGH') {
    discount = 500;
  } else if (state.promo.appliedCode === 'HORIZON10') {
    discount = Math.round(totalBaseFare * 0.10);
  }

  const totalPayable = Math.max(0, totalBaseFare + platformFee + seatAddon + extraAddons - discount);

  state.pricing = {
    baseFare: totalBaseFare,
    platformFee,
    taxes: 0,
    seatMealAddon: seatAddon,
    extraAddons,
    discount,
    totalPayable
  };

  // Sync state to sessionStorage
  try {
    sessionStorage.setItem('hx_journey_details', JSON.stringify({
      selectedFlight: state.selectedFlight,
      tripType: state.tripType,
      cabinClass: state.cabinClass,
      origin: state.origin,
      destination: state.destination,
      departureDate: state.departureDate,
      returnDate: state.returnDate,
      paxCounts: state.paxCounts,
      contactInfo: state.contactInfo,
      passengers: state.passengers,
      addons: state.addons,
      pricing: state.pricing
    }));
  } catch (err) {
    // ignore sessionStorage restrictions
  }
}

function loadSavedState() {
  try {
    const raw = sessionStorage.getItem('hx_journey_details');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch (e) {
    console.error('Error loading saved booking state:', e);
  }
  return null;
}

const saved = loadSavedState();

const initialState = {
  selectedFlight: saved?.selectedFlight || DEFAULT_FLIGHT,
  tripType: saved?.tripType || 'ONEWAY',
  cabinClass: saved?.cabinClass || 'ECONOMY',
  origin: saved?.origin || 'DEL',
  destination: saved?.destination || 'BLR',
  departureDate: saved?.departureDate || '2026-11-14',
  returnDate: saved?.returnDate || null,
  paxCounts: saved?.paxCounts || { adults: 1, children: 0, infants: 0 },
  contactInfo: saved?.contactInfo || {
    email: '',
    countryCode: '+91',
    phone: '',
    whatsappUpdates: true
  },
  passengers: saved?.passengers || [DEFAULT_PASSENGER],
  addons: saved?.addons || {
    insurance: false,
    extraBaggage: false
  },
  feeConfig: {
    platformFee: 300,
    cancellationFee: 1600,
    currency: 'INR'
  },
  promo: {
    code: '',
    appliedCode: null,
    discountAmount: 0,
    message: '',
    isError: false
  },
  pricing: {
    baseFare: 4250,
    platformFee: 300,
    taxes: 640,
    seatMealAddon: 0,
    extraAddons: 0,
    discount: 0,
    totalPayable: 5190
  },
  ui: {
    isReviewModalOpen: false,
    isSeatMapOpen: false,
    seatMapActivePaxIndex: 0,
    isSubmitting: false,
    errorMessage: null
  },
  bookingResult: null
};

// Initial calculation
calculateTotals(initialState);

export const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setJourneyDetails: (state, action) => {
      const {
        flight,
        tripType,
        cabinClass,
        origin,
        destination,
        departureDate,
        returnDate,
        paxCounts
      } = action.payload;

      if (flight) {
        state.selectedFlight = flight;
        // Always reset seat allocations whenever a flight is selected / changed from the itinerary list
        if (state.passengers && Array.isArray(state.passengers)) {
          state.passengers.forEach((p) => {
            p.seatNo = null;
            p.seatLabel = null;
            p.seatType = null;
            p.seatPrice = 0;
            p.isAutoAssigned = false;
            p.seatPreference = null;
          });
        }
      }
      if (tripType) state.tripType = tripType;
      if (cabinClass) state.cabinClass = cabinClass;
      if (origin) state.origin = origin;
      if (destination) state.destination = destination;
      if (departureDate) state.departureDate = departureDate;
      if (returnDate !== undefined) state.returnDate = returnDate;
      if (paxCounts) {
        state.paxCounts = paxCounts;
        const totalPax = Math.max(1, (paxCounts.adults || 1) + (paxCounts.children || 0));
        while (state.passengers.length < totalPax) {
          const idx = state.passengers.length + 1;
          state.passengers.push({
            id: `pax-${idx}`,
            isPrimary: false,
            firstName: '',
            lastName: '',
            gender: '',
            age: '',
            nationality: 'India',
            seatNo: null,
            seatLabel: null,
            seatType: null,
            seatPrice: 0,
            isAutoAssigned: false,
            mealPreference: 'Standard Non-Veg',
            foodOption: 'NON_VEG'
          });
        }
        if (state.passengers.length > totalPax) {
          state.passengers = state.passengers.slice(0, totalPax);
        }
      }

      calculateTotals(state);
    },

    resetAllSeats: (state) => {
      if (state.passengers && Array.isArray(state.passengers)) {
        state.passengers.forEach((p) => {
          p.seatNo = null;
          p.seatLabel = null;
          p.seatType = null;
          p.seatPrice = 0;
          p.isAutoAssigned = false;
          p.seatPreference = null;
        });
      }
      calculateTotals(state);
    },

    setAdminFeeConfig: (state, action) => {
      if (action.payload) {
        state.feeConfig = {
          ...state.feeConfig,
          ...action.payload,
          platformFee: Number(action.payload.platformFee ?? state.feeConfig.platformFee)
        };
        calculateTotals(state);
      }
    },

    setContactInfo: (state, action) => {
      state.contactInfo = { ...state.contactInfo, ...action.payload };
    },

    updatePassenger: (state, action) => {
      const { index, field, value } = action.payload;
      if (state.passengers[index]) {
        state.passengers[index][field] = value;
        calculateTotals(state);
      }
    },

    assignSeatToPassenger: (state, action) => {
      const { index, seatNo, seatLabel, seatType, seatPrice } = action.payload;
      if (state.passengers[index]) {
        state.passengers[index].seatNo = seatNo;
        state.passengers[index].seatLabel = seatLabel || seatNo;
        state.passengers[index].seatType = seatType || 'standard';
        state.passengers[index].seatPrice = Number(seatPrice || 0);
        state.passengers[index].isAutoAssigned = false;
        state.passengers[index].seatPreference = `${seatNo} (${seatType === 'extraLegroom' ? 'Extra Legroom' : 'Standard'})`;
        calculateTotals(state);
      }
    },

    autoAssignSeatToPassenger: (state, action) => {
      const index = action.payload;
      if (state.passengers[index]) {
        state.passengers[index].seatNo = 'AUTO';
        state.passengers[index].seatLabel = 'Free Auto-Assign at Check-in';
        state.passengers[index].seatType = 'autoAssigned';
        state.passengers[index].seatPrice = 0;
        state.passengers[index].isAutoAssigned = true;
        state.passengers[index].seatPreference = 'Auto-assigned (Free)';
        calculateTotals(state);
      }
    },

    autoAssignAllSeats: (state) => {
      state.passengers.forEach((p) => {
        p.seatNo = 'AUTO';
        p.seatLabel = 'Free Auto-Assign at Check-in';
        p.seatType = 'autoAssigned';
        p.seatPrice = 0;
        p.isAutoAssigned = true;
        p.seatPreference = 'Auto-assigned (Free)';
      });
      calculateTotals(state);
    },

    clearPassengerSeat: (state, action) => {
      const index = action.payload;
      if (state.passengers[index]) {
        state.passengers[index].seatNo = null;
        state.passengers[index].seatLabel = null;
        state.passengers[index].seatType = null;
        state.passengers[index].seatPrice = 0;
        state.passengers[index].isAutoAssigned = false;
        state.passengers[index].seatPreference = null;
        calculateTotals(state);
      }
    },

    addPassenger: (state) => {
      if (state.passengers.length >= 9) return;
      const idx = state.passengers.length + 1;
      state.passengers.push({
        id: `pax-${Date.now()}-${idx}`,
        isPrimary: false,
        firstName: '',
        lastName: '',
        gender: '',
        age: '',
        nationality: 'India',
        seatNo: null,
        seatLabel: null,
        seatType: null,
        seatPrice: 0,
        isAutoAssigned: false,
        mealPreference: 'Standard Non-Veg',
        foodOption: 'NON_VEG'
      });
      calculateTotals(state);
    },

    removePassenger: (state, action) => {
      const indexToRemove = action.payload;
      if (state.passengers.length > 1 && indexToRemove >= 0 && indexToRemove < state.passengers.length) {
        state.passengers.splice(indexToRemove, 1);
        if (state.passengers[0]) {
          state.passengers[0].isPrimary = true;
        }
        calculateTotals(state);
      }
    },

    toggleAddon: (state, action) => {
      const addonName = action.payload; // 'insurance' | 'extraBaggage'
      if (state.addons[addonName] !== undefined) {
        state.addons[addonName] = !state.addons[addonName];
        calculateTotals(state);
      }
    },

    setPromoInput: (state, action) => {
      state.promo.code = action.payload;
      state.promo.isError = false;
      state.promo.message = '';
    },

    applyPromoCode: (state) => {
      const code = (state.promo.code || '').trim().toUpperCase();
      if (!code) {
        state.promo.isError = true;
        state.promo.message = 'Please enter a voucher code.';
        return;
      }

      if (code === 'FLYHIGH') {
        state.promo.appliedCode = 'FLYHIGH';
        state.promo.isError = false;
        state.promo.message = 'Code FLYHIGH applied successfully! (-₹500.00)';
        calculateTotals(state);
      } else if (code === 'HORIZON10') {
        state.promo.appliedCode = 'HORIZON10';
        state.promo.isError = false;
        state.promo.message = 'Code HORIZON10 applied successfully! (10% Off Base Fare)';
        calculateTotals(state);
      } else {
        state.promo.isError = true;
        state.promo.message = 'Invalid or expired promo code. Try FLYHIGH or HORIZON10.';
      }
    },

    removePromoCode: (state) => {
      state.promo.code = '';
      state.promo.appliedCode = null;
      state.promo.discountAmount = 0;
      state.promo.message = '';
      state.promo.isError = false;
      calculateTotals(state);
    },

    setReviewModalOpen: (state, action) => {
      state.ui.isReviewModalOpen = Boolean(action.payload);
      if (!action.payload) {
        state.ui.errorMessage = null;
      }
    },

    setSeatMapModalOpen: (state, action) => {
      const { isOpen, paxIndex } = action.payload;
      state.ui.isSeatMapOpen = Boolean(isOpen);
      if (paxIndex !== undefined) {
        state.ui.seatMapActivePaxIndex = paxIndex;
      }
    },

    setSeatMapActivePaxIndex: (state, action) => {
      state.ui.seatMapActivePaxIndex = action.payload;
    },

    setCheckoutLoading: (state, action) => {
      state.ui.isSubmitting = Boolean(action.payload);
    },

    setCheckoutError: (state, action) => {
      state.ui.errorMessage = action.payload;
      state.ui.isSubmitting = false;
    },

    setBookingResult: (state, action) => {
      state.bookingResult = action.payload;
      state.ui.isSubmitting = false;
      state.ui.errorMessage = null;
    },

    resetBooking: () => {
      sessionStorage.removeItem('hx_journey_details');
      return { ...initialState };
    }
  }
});

export const {
  setJourneyDetails,
  setAdminFeeConfig,
  setContactInfo,
  updatePassenger,
  assignSeatToPassenger,
  autoAssignSeatToPassenger,
  autoAssignAllSeats,
  clearPassengerSeat,
  resetAllSeats,
  addPassenger,
  removePassenger,
  toggleAddon,
  setPromoInput,
  applyPromoCode,
  removePromoCode,
  setReviewModalOpen,
  setSeatMapModalOpen,
  setSeatMapActivePaxIndex,
  setCheckoutLoading,
  setCheckoutError,
  setBookingResult,
  resetBooking
} = bookingSlice.actions;

export default bookingSlice.reducer;
