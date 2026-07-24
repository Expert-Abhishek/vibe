import { Platform } from 'react-native';
import * as native from './razorpay.native';
import * as web from './razorpay.web';

export type { RazorpayPaymentOptions } from './razorpay.web';

export const openRazorpayPayment = Platform.OS === 'web' ? web.openRazorpayPayment : native.openRazorpayPayment;
