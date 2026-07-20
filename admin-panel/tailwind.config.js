/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fefce8',
          100: '#fef9c3',
          400: '#facc15',
          500: '#F5C518',
          600: '#ca8a04',
        },
        dark: {
          bg: '#0A0B0E',
          card: '#12141A',
          hover: '#1B1E26',
          border: '#232733',
          textMuted: '#8B93A7',
        },
      },
    },
  },
  plugins: [],
};
