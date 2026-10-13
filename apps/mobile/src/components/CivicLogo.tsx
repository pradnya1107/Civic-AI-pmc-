import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

type CivicLogoProps = {
  compact?: boolean;
  light?: boolean;
};

export function CivicLogo({ compact = false, light = false }: CivicLogoProps) {
  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel="CivicAI">
      <View style={[styles.mark, compact && styles.markCompact]}>
        <View style={styles.orbit} />
        <Text style={[styles.markLetter, compact && styles.markLetterCompact]}>
          C
        </Text>
        <View style={styles.spark} />
      </View>
      {!compact && (
        <View>
          <Text style={[styles.wordmark, light && styles.wordmarkLight]}>
            Civic<Text style={styles.wordmarkAccent}>AI</Text>
          </Text>
          <Text style={[styles.caption, light && styles.captionLight]}>
            CIVIC TECHNOLOGY FOR PUNE
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  mark: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.emerald,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  markCompact: { width: 38, height: 38, borderRadius: 13 },
  markLetter: { color: colors.white, fontSize: 25, fontWeight: "800" },
  markLetterCompact: { fontSize: 21 },
  orbit: {
    position: "absolute",
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.52)",
    borderRadius: 12,
    transform: [{ rotate: "35deg" }],
  },
  spark: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.aqua,
  },
  wordmark: { color: colors.ink, fontSize: 21, fontWeight: "800", letterSpacing: -0.7 },
  wordmarkLight: { color: colors.white },
  wordmarkAccent: { color: colors.emerald },
  caption: { color: colors.muted, fontSize: 8, fontWeight: "700", letterSpacing: 1.2, marginTop: 2 },
  captionLight: { color: "rgba(255,255,255,0.68)" },
});
