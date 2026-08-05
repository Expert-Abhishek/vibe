import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const resources = {
  en: {
    translation: {
      // General & Common
      appName: 'Vibzz Sakleshpur',
      welcome: 'Welcome to Sakleshpur',
      searchPlaceholder: 'Search destinations, homestays, waterfalls...',
      loading: 'Loading...',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      back: 'Back',
      language: 'Language',
      english: 'English',
      kannada: 'ಕನ್ನಡ',
      selectLanguage: 'Select Preferred Language',

      // Navigation & Tabs
      home: 'Home',
      trips: 'Trips',
      history: 'History',
      profile: 'Profile',
      driverDashboard: 'Vibe Captain',

      // Home Screen Cards & Options
      quickActions: 'Quick Ride & Tour Services',
      bookCab: 'Book Cab / SUV',
      bookCabSub: 'Fast local pickups & outstation rides',
      customTrip: 'Custom Tour Package',
      customTripSub: 'Design your own itinerary & sightseeings',
      hireGuide: 'Local Tour Guide',
      hireGuideSub: 'Expert Sakleshpur guides & trekking',
      jungleSafari: 'Jungle Safari',
      jungleSafariSub: 'Jeep adventure & offroad estate tours',
      popularDestinations: 'Popular Sakleshpur Spots',
      instantBooking: 'Instant Booking',

      // Book Cab Screen
      selectPickup: 'Select Pickup Spot',
      selectDrop: 'Select Destination',
      chooseVehicle: 'Choose Vehicle Type',
      estimatedFare: 'Estimated Fare',
      confirmRide: 'Confirm Ride Booking',

      // Custom Tour / Make Trip Screen
      createPackage: 'Create Custom Tour Plan',
      selectCheckpoints: 'Select Sightseeing Places',
      duration: 'Duration',
      distance: 'Est. Distance',
      bookPackageNow: 'Book Tour Package Now',

      // Hire Guide Screen
      selectGuide: 'Select Local Guide',
      experience: 'Experience',
      perDayRate: 'Per Day Rate',
      bookGuideNow: 'Book Guide Now',

      // History Screen
      tripHistory: 'Ride & Booking History',
      all: 'All',
      cabs: 'Cabs',
      guides: 'Guides',
      completed: 'Completed',
      cancelled: 'Cancelled',
      noHistory: 'No past booking records found',

      // Profile Screen
      userProfile: 'My Profile & Account',
      phone: 'Phone Number',
      role: 'User Role',
      walletBalance: 'Wallet Balance',
      logout: 'Logout',

      // Trip Status & Tracking
      liveStatus: 'Live Trip Status',
      searchingCaptain: '⏳ WAITING FOR CAPTAIN TO ACCEPT YOUR RIDE...',
      partnerAssigned: 'PARTNER ASSIGNED & EN ROUTE',
      driverArrived: 'DRIVER ARRIVED AT PICKUP',
      tripInProgress: 'TRIP IN PROGRESS',
      tripCompleted: 'Trip Completed 🎉',
      tripCancelled: 'TRIP CANCELLED / DECLINED',
      pickupPoint: 'PICKUP POINT',
      finalDropPoint: 'FINAL DROP POINT',
      stop: 'STOP',
      tourItineraryStops: '📍 TOUR ITINERARY STOPS',
      driverWillPickUp: '* Driver will pick tourist up from Pickup Point',
      finalDestinationDrop: '* Final tour destination drop point',
      assignedCaptain: 'ASSIGNED CAPTAIN',
      searchingNearbyCaptains: 'SEARCHING NEARBY CAPTAINS',
      verificationCodes: '🔐 TRIP VERIFICATION CODES',
      startOtp: 'START TRIP OTP',
      endOtp: 'END TRIP OTP',
      paymentMode: 'Payment Mode',
      totalFare: 'Total Fare',
      advanceDepositPaid: 'Advance Deposit Paid',
      remainingCashBalance: 'Remaining Cash Balance',
      cancelBooking: 'Cancel Booking',
      withdrawRequest: 'Withdraw Ride Request',

      // Driver Dashboard
      online: 'ONLINE',
      offline: 'OFFLINE',
      incomingRequest: 'NEW TRIP REQUEST',
      acceptRide: 'Accept Ride',
      declineRide: 'Decline',
      enterStartOtp: 'Enter Start OTP',
      enterEndOtp: 'Enter End OTP',
      verifyOtp: 'Verify OTP',
      startRide: 'Start Ride',
      completeRide: 'Complete Ride',
      todayEarnings: 'Today\'s Earnings',
      payout: 'Instant Bank Payout',
    },
  },
  kn: {
    translation: {
      // General & Common
      appName: 'ವೈಬ್ ಸಕಲೇಶಪುರ',
      welcome: 'ಸಕಲೇಶಪುರಕ್ಕೆ ಸುಸ್ವಾಗತ',
      searchPlaceholder: 'ಪ್ರವಾಸಿ ತಾಣಗಳು, ಹೋಮ್‌ಸ್ಟೇಗಳನ್ನು ಹುಡುಕಿ...',
      loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
      cancel: 'ರದ್ದುಗೊಳಿಸಿ',
      confirm: 'ಖಚಿತಪಡಿಸಿ',
      save: 'ಉಳಿಸಿ',
      back: 'ಹಿಂದೆ',
      language: 'ಭಾಷೆ',
      english: 'English',
      kannada: 'ಕನ್ನಡ',
      selectLanguage: 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',

      // Navigation & Tabs
      home: 'ಹೋಮ್',
      trips: 'ಪ್ರಯಾಣಗಳು',
      history: 'ಇತಿಹಾಸ',
      profile: 'ಪ್ರೊಫೈಲ್',
      driverDashboard: 'ವೈಬ್ ಕ್ಯಾಪ್ಟನ್',

      // Home Screen Cards & Options
      quickActions: 'ಸವಾರಿ ಮತ್ತು ಪ್ರವಾಸ ಸೇವೆಗಳು',
      bookCab: 'ಕ್ಯಾಬ್ ಬುಕಿಂಗ್',
      bookCabSub: 'ಲೋಕಲ್ ಪ್ರಯಾಣ ಮತ್ತು ಟ್ಯಾಕ್ಸಿ ಸೇವೆ',
      customTrip: 'ಕಸ್ಟಮ್ ಟೂರ್ ಪ್ಯಾಕೇಜ್',
      customTripSub: 'ನಿಮ್ಮ ಸ್ವಂತ ಪ್ರವಾಸ ಪಟ್ಟಿಯನ್ನು ಯೋಜಿಸಿ',
      hireGuide: 'ಸ್ಥಳೀಯ ಗೈಡ್',
      hireGuideSub: 'ಸಕಲೇಶಪುರ ಗೈಡ್ ಮತ್ತು ಚಾರಣ',
      jungleSafari: 'ಜಂಗಲ್ ಸಫಾರಿ',
      jungleSafariSub: 'ಜೀಪ್ ಅಡ್ವೆಂಚರ್ ಮತ್ತು ಎಸ್ಟೇಟ್ ಪ್ರವಾಸ',
      popularDestinations: 'ಸಕಲೇಶಪುರದ ಪ್ರಸಿದ್ಧ ತಾಣಗಳು',
      instantBooking: 'ತಕ್ಷಣದ ಬುಕಿಂಗ್',

      // Book Cab Screen
      selectPickup: 'ಪಿಕಪ್ ಸ್ಥಳ ಆಯ್ಕೆಮಾಡಿ',
      selectDrop: 'ತಲುಪುವ ಸ್ಥಳ ಆಯ್ಕೆಮಾಡಿ',
      chooseVehicle: 'ವಾಹನ ಪ್ರಕಾರ ಆಯ್ಕೆಮಾಡಿ',
      estimatedFare: 'ಅಂದಾಜು ದರ',
      confirmRide: 'ಸವಾರಿ ಬುಕಿಂಗ್ ಖಚಿತಪಡಿಸಿ',

      // Custom Tour / Make Trip Screen
      createPackage: 'ಕಸ್ಟಮ್ ಪ್ರವಾಸ ಪಟ್ಟಿ ತಯಾರಿಸಿ',
      selectCheckpoints: 'ಪ್ರವಾಸಿ ತಾಣಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ',
      duration: 'ಸಮಯಾವಧಿ',
      distance: 'ಅಂದಾಜು ದೂರ',
      bookPackageNow: 'ಈಗಲೇ ಟೂರ್ ಪ್ಯಾಕೇಜ್ ಬುಕ್ ಮಾಡಿ',

      // Hire Guide Screen
      selectGuide: 'ಸ್ಥಳೀಯ ಗೈಡ್ ಆಯ್ಕೆಮಾಡಿ',
      experience: 'ಅನುಭವ',
      perDayRate: 'ದಿನದ ದರ',
      bookGuideNow: 'ಈಗಲೇ ಗೈಡ್ ಬುಕ್ ಮಾಡಿ',

      // History Screen
      tripHistory: 'ಪ್ರಯಾಣದ ಇತಿಹಾಸ',
      all: 'ಎಲ್ಲವೂ',
      cabs: 'ಕ್ಯಾಬ್‌ಗಳು',
      guides: 'ಗೈಡ್‌ಗಳು',
      completed: 'ಪೂರ್ಣಗೊಂಡಿದೆ',
      cancelled: 'ರದ್ದುಗೊಂಡಿದೆ',
      noHistory: 'ಯಾವ ಹಳೆಯ ಪ್ರಯಾಣದ ದಾಖಲೆಗಳು ಸಿಗಲಿಲ್ಲ',

      // Profile Screen
      userProfile: 'ನನ್ನ ಪ್ರೊಫೈಲ್ ಮತ್ತು ಖಾತೆ',
      phone: 'ಫೋನ್ ಸಂಖ್ಯೆ',
      role: 'ಬಳಕೆದಾರರ ಪಾತ್ರ',
      walletBalance: 'ವ್ಯಾಲೆಟ್ ಬಾಕಿ',
      logout: 'ಲಾಗ್ ಔಟ್',

      // Trip Status & Tracking
      liveStatus: 'ಲೈವ್ ಪ್ರಯಾಣದ ಸ್ಥಿತಿ',
      searchingCaptain: '⏳ ಕ್ಯಾಪ್ಟನ್ ಸವಾರಿಯನ್ನು ಸ್ವೀಕರಿಸಲು ಕಾಯಲಾಗುತ್ತಿದೆ...',
      partnerAssigned: 'ಚಾಲಕರು ನಿಯೋಜಿಸಲಾಗಿದೆ ಮತ್ತು ಹಾದಿಯಲ್ಲಿದ್ದಾರೆ',
      driverArrived: 'ಚಾಲಕರು ಪಿಕಪ್ ಸ್ಥಳಕ್ಕೆ ತಲುಪಿದ್ದಾರೆ',
      tripInProgress: 'ಪ್ರಯಾಣ ಪ್ರಗತಿಯಲ್ಲಿದೆ',
      tripCompleted: 'ಪ್ರಯಾಣ ಪೂರ್ಣಗೊಂಡಿದೆ 🎉',
      tripCancelled: 'ಪ್ರಯಾಣ ರದ್ದುಗೊಂಡಿದೆ',
      pickupPoint: 'ಪಿಕಪ್ ಪಾಯಿಂಟ್',
      finalDropPoint: 'ಅಂತಿಮ ಡ್ರಾಪ್ ಪಾಯಿಂಟ್',
      stop: 'ನಿಲ್ದಾಣ',
      tourItineraryStops: '📍 ಪ್ರವಾಸದ ನಿಲ್ದಾಣಗಳು',
      driverWillPickUp: '* ಚಾಲಕರು ಪಿಕಪ್ ಪಾಯಿಂಟ್‌ನಿಂದ ಕರೆದೊಯ್ಯಲಿದ್ದಾರೆ',
      finalDestinationDrop: '* ಅಂತಿಮ ತಲುಪುವ ಗಮ್ಯಸ್ಥಾನ',
      assignedCaptain: 'ನಿಯೋಜಿತ ಕ್ಯಾಪ್ಟನ್',
      searchingNearbyCaptains: 'ಸಮೀಪದ ಕ್ಯಾಪ್ಟನ್‌ಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ',
      verificationCodes: '🔐 ಪ್ರಯಾಣದ ಪರಿಶೀಲನೆ ಕೋಡ್‌ಗಳು',
      startOtp: 'ಸ್ಟಾರ್ಟ್ ಓಟಿಪಿ',
      endOtp: 'ಎಂಡ್ ಓಟಿಪಿ',
      paymentMode: 'ಪಾವತಿ ವಿಧಾನ',
      totalFare: 'ಒಟ್ಟು ದರ',
      advanceDepositPaid: 'ಮುಂಗಡ ಠೇವಣಿ ಪಾವತಿಸಲಾಗಿದೆ',
      remainingCashBalance: 'ಉಳಿದ ನಗದು ಬಾಕಿ',
      cancelBooking: 'ಬುಕಿಂಗ್ ರದ್ದುಗೊಳಿಸಿ',
      withdrawRequest: 'ಮನವಿ ಹಿಂಪಡೆಯಿರಿ',

      // Driver Dashboard
      online: 'ಆನ್‌ಲೈನ್',
      offline: 'ಆಫ್‌ಲೈನ್',
      incomingRequest: 'ಹೊಸ ಪ್ರಯಾಣದ ವಿನಂತಿ',
      acceptRide: 'ಸವಾರಿ ಸ್ವೀಕರಿಸಿ',
      declineRide: 'ತಿರಸ್ಕರಿಸಿ',
      enterStartOtp: 'ಸ್ಟಾರ್ಟ್ ಓಟಿಪಿ ನಮೂದಿಸಿ',
      enterEndOtp: 'ಎಂಡ್ ಓಟಿಪಿ ನಮೂದಿಸಿ',
      verifyOtp: 'ಓಟಿಪಿ ಪರಿಶೀಲಿಸಿ',
      startRide: 'ಪ್ರಯಾಣ ಪ್ರಾರಂಭಿಸಿ',
      completeRide: 'ಪ್ರಯಾಣ ಪೂರ್ಣಗೊಳಿಸಿ',
      todayEarnings: 'ಇಂದಿನ ಗಳಿಕೆ',
      payout: 'ಬ್ಯಾಂಕ್ ಹಿಂಪಡೆಯುವಿಕೆ',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language is English
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React handles escaping natively
    },
    compatibilityJSON: 'v4',
  });

export async function setAppLanguage(lang: 'en' | 'kn') {
  await i18n.changeLanguage(lang);
}

export function getCurrentLanguage(): string {
  return i18n.language || 'en';
}

export default i18n;
