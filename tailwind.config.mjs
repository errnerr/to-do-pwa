import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F5F6F7',
        card: '#FFFFFF',
        input: '#FFFFFF',
        button: '#FFFFFF',
        primary: '#EFFF4F',
        'primary-foreground': '#222',
        accent: '#EFFF4F',
        muted: '#F5F6F7',
        border: '#E5E7EB',
        ring: '#EFFF4F',
        destructive: '#FF4F4F',
        'destructive-foreground': '#fff',
        popover: '#fff',
        'popover-foreground': '#222',
        secondary: '#F5F6F7',
        'secondary-foreground': '#222',
        foreground: '#222',
      },
      fontFamily: {
        sans: ['var(--font-jost)', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        lg: '1.5rem',
        md: '1rem',
        sm: '0.5rem',
      },
    },
  },
  plugins: [],
}; 