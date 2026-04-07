/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#080C14',
        chat: '#0d121d',
        card: '#111827',
        input: '#1F2937',
        hover: '#1E293B',
        'tier-basic': '#22C55E',
        'tier-social': '#3B82F6',
        'tier-engage': '#F59E0B',
        'tier-monetize': '#EF4444',
        border: '#374151',
        'text-primary': '#F9FAFB',
        'text-secondary': '#9CA3AF',
        'text-muted': '#6B7280',
      },
    },
  },
  plugins: [],
};
