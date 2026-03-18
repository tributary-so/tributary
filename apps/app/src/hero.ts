// hero.ts
import { heroui } from '@heroui/react'

export default heroui({
  themes: {
    light: {
      colors: {
        primary: {
          foreground: '#aaaaaa',
          DEFAULT: '#000970',
        },
      },
      // Global radius configuration
      layout: {
        radius: {
          small: '0px',
          medium: '0px',
          large: '0px',
        },
      },
    },
  },
})
