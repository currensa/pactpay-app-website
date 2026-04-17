import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },

      colors: {
        primary: '#5e85ee',
        primaryLight: '#7aa2ff',
      },

      backdropBlur: {
        xs: '2px',
      },

      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.08)',
        soft: '0 4px 20px rgba(0,0,0,0.06)',
      },

      borderRadius: {
        xl2: '20px',
        xl3: '22px',
      },

      keyframes: {
        // ✨ 流光效果
        shine: {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(100%)',
          },
        },

        // ✨ 轻微呼吸光（可选增强质感）
        glow: {
          '0%, 100%': {
            opacity: 0.4,
          },
          '50%': {
            opacity: 0.7,
          },
        },

        // ✨ 渐变背景流动（如果后面你要做大背景可以用）
        gradientMove: {
          '0%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: '100% 50%',
          },
          '100%': {
            backgroundPosition: '0% 50%',
          },
        },
      },

      animation: {
        shine: 'shine 6s linear infinite',
        glow: 'glow 3s ease-in-out infinite',
        gradient: 'gradientMove 12s ease infinite',
      },
    },
  },

  plugins: [],
}