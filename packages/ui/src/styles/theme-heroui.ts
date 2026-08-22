import { heroui } from '@heroui/react'

// HeroUI primary values mirror the CSS variables in src/styles/tokens.css :root
// (--primary: 221.2 83.2% 53.3% light / 217.2 91.2% 59.8% dark).
// HeroUI's color generator can't parse `hsl(var(--primary))` (needs a literal
// value to derive shades), so we duplicate the values here. Keep the two
// layers in sync when changing the brand blue. foreground is white for WCAG
// AA contrast on the deep blue (was #aaa — ~3.7:1, failed AA).
const plugin: ReturnType<typeof heroui> = heroui({

  themes: {
    light: {
      colors: {
        primary: {
          DEFAULT: 'hsl(221.2 83.2% 53.3%)',
          foreground: 'hsl(0 0% 100%)',
        },
      },
    },
    dark: {
      colors: {
        primary: {
          DEFAULT: 'hsl(217.2 91.2% 59.8%)',
          foreground: 'hsl(210 40% 98%)',
        },
      },
    },
  },
  layout: {
    radius: {
      small: '0px',
      medium: '0px',
      large: '0px',
    },
  },
})

export default plugin
