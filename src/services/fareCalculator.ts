export type BookingType = 'INSTANT' | 'PRE_BOOKED';

export type VehicleType = 'hatchback' | 'sedan' | 'suv' | 'auto';

export interface VehicleRateCard {
  baseFare: number;
  ratePerKm: number;
  ratePerMin: number;
  minFare: number;
}

export const RATE_CARDS: Record<VehicleType, VehicleRateCard> = {
  hatchback: { baseFare: 50, ratePerKm: 14, ratePerMin: 2, minFare: 100 },
  sedan: { baseFare: 75, ratePerKm: 18, ratePerMin: 2.5, minFare: 150 },
  suv: { baseFare: 120, ratePerKm: 24, ratePerMin: 3.5, minFare: 250 },
  auto: { baseFare: 30, ratePerKm: 12, ratePerMin: 1.5, minFare: 50 },
};

export interface FareCalculationParams {
  bookingType: BookingType;
  distanceKm: number;
  durationMins: number;
  vehicleType?: VehicleType;
  surgeMultiplier?: number;
  scheduledTime?: string | Date;
}

export interface FareBreakdown {
  bookingType: BookingType;
  vehicleType: VehicleType;
  baseFare: number;
  distanceFare: number;
  durationFare: number;
  subtotal: number;
  surgeMultiplier: number;
  surgeAmount: number;
  preBookingFee: number;
  totalFare: number;
  minimumFareLocked: boolean;
  scheduledTimeFormatted?: string;
}

export interface PreBookedDispatchValidation {
  canStart: boolean;
  timeDiffMins: number;
  unlockBadgeText: string;
  formattedScheduledTime: string;
}

/**
 * Format timestamp into standard display format (e.g. 25 Jul 2026, 08:30 PM)
 */
export function formatScheduledDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Instant Dispatch';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Instant Dispatch';

  const day = d.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = hours.toString().padStart(2, '0');

  return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
}

/**
 * Calculates itemized trip fare for INSTANT vs PRE_BOOKED rides
 */
export function calculateTripFare(params: FareCalculationParams): FareBreakdown {
  const {
    bookingType,
    distanceKm,
    durationMins,
    vehicleType = 'sedan',
    surgeMultiplier = 1.0,
    scheduledTime,
  } = params;

  const rateCard = RATE_CARDS[vehicleType] || RATE_CARDS.sedan;

  const baseFare = rateCard.baseFare;
  const distanceFare = Math.round(distanceKm * rateCard.ratePerKm);
  const durationFare = Math.round(durationMins * rateCard.ratePerMin);

  const subtotalBeforeSurge = baseFare + distanceFare + durationFare;
  const validSurge = Math.max(1.0, surgeMultiplier);
  const surgeAmount = Math.round(subtotalBeforeSurge * (validSurge - 1.0));

  let preBookingFee = 0;
  let minimumFareLocked = false;

  if (bookingType === 'PRE_BOOKED') {
    // Apply pre-booking surcharge / reservation fee (e.g., flat ₹60 reservation fee)
    preBookingFee = 60;
    minimumFareLocked = true;
  }

  const calculatedTotal = subtotalBeforeSurge + surgeAmount + preBookingFee;
  const finalTotal = Math.max(calculatedTotal, rateCard.minFare);

  return {
    bookingType,
    vehicleType,
    baseFare,
    distanceFare,
    durationFare,
    subtotal: subtotalBeforeSurge,
    surgeMultiplier: validSurge,
    surgeAmount,
    preBookingFee,
    totalFare: finalTotal,
    minimumFareLocked,
    scheduledTimeFormatted: formatScheduledDateTime(scheduledTime),
  };
}

/**
 * Time-Gate Validation Guard:
 * Restricts starting pre-booked rides until allowedWindowMins (default 15 mins) prior to scheduled time.
 */
export function validatePreBookedDispatch(
  scheduledTime?: string | Date | null,
  currentTimestamp: Date = new Date(),
  allowedWindowMins: number = 15
): PreBookedDispatchValidation {
  const formattedScheduledTime = formatScheduledDateTime(scheduledTime);

  if (!scheduledTime) {
    return {
      canStart: true,
      timeDiffMins: 0,
      unlockBadgeText: 'Instant Ride - Ready for Dispatch',
      formattedScheduledTime,
    };
  }

  const targetDate = new Date(scheduledTime);
  if (isNaN(targetDate.getTime())) {
    return {
      canStart: true,
      timeDiffMins: 0,
      unlockBadgeText: 'Instant Ride - Ready for Dispatch',
      formattedScheduledTime,
    };
  }

  const diffMs = targetDate.getTime() - currentTimestamp.getTime();
  const timeDiffMins = Math.round(diffMs / (1000 * 60));

  // Driver can start if current time is within allowedWindowMins (e.g. 15 mins) before or past scheduled time
  const canStart = timeDiffMins <= allowedWindowMins;

  const unlockBadgeText = canStart
    ? 'Dispatch Unlocked'
    : `Ride unlocks at ${formattedScheduledTime}`;

  return {
    canStart,
    timeDiffMins,
    unlockBadgeText,
    formattedScheduledTime,
  };
}
