/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        brand: {
          blue: '#2563EB',
          'blue-hover': '#1D4ED8',
          green: '#10B981',
          'green-hover': '#059669',
          purple: '#8B5CF6',
          'purple-hover': '#7C3AED',
        },
        surface: '#FFFFFF',
        app: '#F8FAFC',
      },
    },
  },
  plugins: [],
};
