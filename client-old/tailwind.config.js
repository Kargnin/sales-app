/** @type {import('tailwindcss').Config} */
export default {
  corePlugins: {
    preflight: false,
  },
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stitch "Warm Tactile Industrial" palette
        canvas: '#fbfaf9',
        midnight: {
          DEFAULT: '#121212',
          container: '#1c1b1b',
        },
        ember: {
          DEFAULT: '#ff3e00',
          light: '#db3400',
          dark: '#af2800',
        },
        stone: {
          DEFAULT: '#f2f0ed',
          border: '#f2f0ed',
        },
        surface: {
          elevated: '#ffffff',
          recessed: '#f8f7f4',
          dim: '#dadad9',
        },
        text: {
          primary: '#474645',
          heading: '#343433',
          muted: '#848281',
          disabled: '#a7a7a7',
        },
        success: '#00ca48',
        info: '#0090ff',
        warning: '#ffbb26',
        error: '#ff2b3a',
        flamingo: '#ff58ae',
        violet: '#9f4fff',
      },
      fontFamily: {
        display: ['Family', 'Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        pill: '9999px',
        blob: '72px',
      },
      spacing: {
        '2xs': '4px',
        'xs': '8px',
        'sm': '12px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
      },
      fontSize: {
        'display': ['68px', { lineHeight: '1.09', letterSpacing: '-2.11px', fontWeight: '500' }],
        'headline-lg': ['44px', { lineHeight: '1.09', letterSpacing: '-1.14px', fontWeight: '500' }],
        'headline-lg-mobile': ['32px', { lineHeight: '1.1', letterSpacing: '-0.8px', fontWeight: '500' }],
        'heading': ['23px', { lineHeight: '1.2', letterSpacing: '-0.44px', fontWeight: '600' }],
        'heading-sm': ['19px', { lineHeight: '1.38', letterSpacing: '-0.25px', fontWeight: '600' }],
        'body': ['15px', { lineHeight: '1.47', letterSpacing: '-0.2px', fontWeight: '400' }],
        'label': ['15px', { lineHeight: '1.47', letterSpacing: '-0.2px', fontWeight: '500' }],
        'caption': ['12px', { lineHeight: '1.58', letterSpacing: '-0.14px', fontWeight: '400' }],
      },
    },
  },
  plugins: [],
}
