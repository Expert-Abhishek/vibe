import * as WebBrowser from 'expo-web-browser';
import { createRazorpayOrderApi, verifyRazorpayPaymentApi, API_BASE_URL } from '@/constants/api';

let RazorpayCheckout: any = null;
try {
  const RazorpayModule = require('react-native-razorpay');
  RazorpayCheckout = RazorpayModule.default || RazorpayModule;
} catch (e) {
  console.warn('react-native-razorpay native module fallback:', e);
}

export interface RazorpayPaymentOptions {
  amount: number;
  title: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  userId?: string;
  onSuccess: (paymentId: string) => void;
  onCancel?: () => void;
  onError?: (error: any) => void;
}

export async function openRazorpayPayment({
  amount,
  title,
  customerName = 'Tourist Customer',
  customerPhone = '9876543210',
  customerEmail = 'tourist@vibe.app',
  userId,
  onSuccess,
  onCancel,
  onError,
}: RazorpayPaymentOptions) {
  const keyId = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_Cqz1hMxOW8QFj3';
  const amountInPaise = Math.round(amount * 100);

  let serverOrderId: string | undefined = undefined;
  try {
    const orderRes = await createRazorpayOrderApi({ amount });
    if (orderRes && orderRes.success && orderRes.orderId) {
      serverOrderId = orderRes.orderId;
    }
  } catch (e) {
    console.warn('Backend order creation warning:', e);
  }

  const options: any = {
    key: keyId,
    amount: amountInPaise,
    currency: 'INR',
    name: 'Vibe Tour & Travel',
    description: `Payment for - ${title}`,
    image: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=200',
    prefill: {
      name: customerName,
      contact: customerPhone,
      email: customerEmail,
    },
    theme: {
      color: '#F5C518',
    },
  };

  if (serverOrderId) {
    options.order_id = serverOrderId;
  }

  // 1. Mobile Native C++ SDK (if native build)
  if (RazorpayCheckout && typeof RazorpayCheckout.open === 'function') {
    RazorpayCheckout.open(options)
      .then(async (data: any) => {
        const paymentId = data?.razorpay_payment_id || `pay_${Date.now()}`;
        if (data?.razorpay_signature) {
          await verifyRazorpayPaymentApi({
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: paymentId,
            razorpay_signature: data.razorpay_signature,
            userId,
            amount,
            description: `Payment for - ${title}`,
          });
        }
        onSuccess(paymentId);
      })
      .catch((err: any) => {
        console.warn('Razorpay Native SDK error:', err);
        if (onCancel) onCancel();
      });
    return;
  }

  // 2. In-App WebBrowser Gateway Fallback for Expo Go (Shows Official Razorpay UI)
  try {
    const checkoutUrl = `${API_BASE_URL}/api/wallet/checkout-page?amount=${amount}&title=${encodeURIComponent(title)}&keyId=${keyId}`;
    const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, 'vibe://');

    if (result.type === 'success' && result.url) {
      if (result.url.includes('payment-success')) {
        const match = result.url.match(/payment_id=([^&]+)/);
        const paymentId = match ? match[1] : `pay_${Date.now()}`;
        await verifyRazorpayPaymentApi({
          razorpay_payment_id: paymentId,
          userId,
          amount,
          description: `Payment for - ${title}`,
        });
        onSuccess(paymentId);
      } else {
        if (onCancel) onCancel();
      }
    } else {
      if (onCancel) onCancel();
    }
  } catch (err: any) {
    console.error('In-app WebBrowser checkout error:', err);
    if (onError) onError(err?.message || 'Failed to launch Razorpay payment gateway');
  }
}
