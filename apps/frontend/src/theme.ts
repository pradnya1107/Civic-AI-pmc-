import { Platform } from "react-native";

export const colors = {
  ink: "#102D35",
  midnight: "#082633",
  deep: "#071D29",
  emerald: "#087B62",
  emeraldDark: "#05624F",
  mint: "#DDF5EB",
  aqua: "#A8E9DF",
  sky: "#C7E9F2",
  paper: "#F7FAF8",
  white: "#FFFFFF",
  text: "#19343B",
  muted: "#718388",
  border: "#DCE7E3",
  error: "#B4233A",
  success: "#167455",
  glass: "rgba(255,255,255,0.14)",
  glassBorder: "rgba(255,255,255,0.25)",
};

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: "#0B2B34",
      shadowOpacity: 0.1,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 6 },
    default: {},
  }),
  button: Platform.select({
    ios: {
      shadowColor: colors.emeraldDark,
      shadowOpacity: 0.22,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 7 },
    },
    android: { elevation: 4 },
    default: {},
  }),
};
