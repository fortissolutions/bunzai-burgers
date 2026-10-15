// Shared Tailwind theme for every Bunzai page (from the code.html design template).
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#FFD21C',
          yellowHover: '#E5BC10',
          bg: '#050B17',
          panel: '#0B1427',
          panelLight: '#101C32',
          card: '#0D182E',
          muted: '#9AA7BB',
          border: 'rgba(255, 255, 255, 0.08)',
          borderActive: 'rgba(255, 210, 28, 0.35)',
          textLight: '#F8FAFC'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        script: ['"Caveat"', 'cursive']
      },
      animation: {
        'marquee': 'marquee 28s linear infinite',
        'float-subtle': 'floatSubtle 5s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        floatSubtle: {
          '0%': { transform: 'translateY(0px)' },
          '100%': { transform: 'translateY(-14px)' }
        }
      }
    }
  }
};
