import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Custom Root HTML template for Expo Router Web
 * Includes Razorpay Checkout JS SDK in <head> for instant availability
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <script src="https://checkout.razorpay.com/v1/checkout.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
