import { heroui } from "@heroui/react";

export default heroui({
  themes: {
    light: {
      colors: {
        primary: {
          foreground: "#aaaaaa",
          DEFAULT: "#000970",
        },
      },
    },
    dark: {
      colors: {
        primary: {
          foreground: "#aaaaaa",
          DEFAULT: "#000970",
        },
      },
    },
  },
  layout: {
    radius: {
      small: "0px",
      medium: "0px",
      large: "0px",
    },
  },
});
