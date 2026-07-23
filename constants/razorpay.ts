import { Platform } from 'react-native';
import { createRazorpayOrderApi, verifyRazorpayPaymentApi } from '@/constants/api';

/**
 * Razorpay Payment Integration Utility using react-native-razorpay & Web JS SDK
 * Production Key ID: rzp_live_Cqz1hMxOW8QFj3
 */
let RazorpayCheckout: any = null;
try {
  RazorpayCheckout = require('react-native-razorpay').default || require('react-native-razorpay');
} catch (e) {
  // Native module fallback for Web
}

export interface RazorpayPaymentOptions {
  amount: number; // In Rupees (e.g. 1500 for ₹1500 advance)
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

  // Step 1: Create Order on backend server
  let serverOrderId: string | undefined = undefined;
  try {
    const orderRes = await createRazorpayOrderApi({ amount });
    if (orderRes && orderRes.success && orderRes.orderId) {
      serverOrderId = orderRes.orderId;
    }
  } catch (e) {
    console.warn('Backend order creation warning (will fallback to direct checkout):', e);
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

  // 1. Mobile Native SDK
  if (Platform.OS !== 'web' && RazorpayCheckout && typeof RazorpayCheckout.open === 'function') {
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
        console.warn('Razorpay Native SDK:', err);
        if (onCancel) onCancel();
      });
    return;
  }

  // 2. Web JS Checkout
  const launchWebModal = () => {
    try {
      const RzpClass = (window as any).Razorpay;
      if (!RzpClass) {
        if (onError) onError('Razorpay SDK object not found on window scope.');
        return;
      }

      const webOptions = {
        ...options,
        handler: async function (response: any) {
          if (response && response.razorpay_payment_id) {
            const paymentId = response.razorpay_payment_id;
            // Verify payment signature on backend server
            await verifyRazorpayPaymentApi({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: paymentId,
              razorpay_signature: response.razorpay_signature,
              userId,
              amount,
              description: `Payment for - ${title}`,
            });
            onSuccess(paymentId);
          } else if (onError) {
            onError('No payment ID returned from Razorpay.');
          }
        },
        modal: {
          ondismiss: function () {
            if (onCancel) onCancel();
          },
        },
      };

      const rzp = new RzpClass(webOptions);
      rzp.on('payment.failed', function (resp: any) {
        if (onError) onError(resp?.error?.description || 'Payment Failed');
      });
      rzp.open();
    } catch (err: any) {
      console.error('Razorpay Web modal error:', err);
      if (onError) onError(err?.message || 'Razorpay modal launch failed');
    }
  };

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (typeof (window as any).Razorpay !== 'undefined') {
      launchWebModal();
    } else {
      const existing = document.getElementById('razorpay-checkout-js');
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.id = 'razorpay-checkout-js';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        launchWebModal();
      };
      script.onerror = () => {
        if (onError) onError('Network error: checkout.razorpay.com script could not be downloaded. Please check your internet or disable AdBlocker/Brave Shields.');
      };
      (document.head || document.body).appendChild(script);
    }
  }
}
