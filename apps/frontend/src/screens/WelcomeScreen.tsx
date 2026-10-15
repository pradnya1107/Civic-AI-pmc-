import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { ActionButton, Page } from "../components/Controls";
import { Cityscape } from "../components/Cityscape";
import { CivicLogo } from "../components/CivicLogo";
import { colors } from "../theme";

type WelcomeScreenProps = {
  onLogin: () => void;
  onSignup: () => void;
};

export function WelcomeScreen({ onLogin, onSignup }: WelcomeScreenProps) {
  const { height } = useWindowDimensions();
  const compact = height < 730;

  return (
    <Page>
      <View style={styles.topBar}>
        <CivicLogo />
        <View style={styles.locationPill}>
          <View style={styles.locationDot} />
          <Text style={styles.locationText}>PUNE, MH</Text>
        </View>
      </View>
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <Cityscape compact={compact} />
        <View style={styles.heroGlow} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>A MORE CONNECTED CITY STARTS HERE</Text>
        <Text style={styles.title}>Welcome to{"\n"}CivicAI PMC</Text>
        <Text style={styles.subtitle}>
          Your city. Your voice.{"\n"}Our shared future.
        </Text>
      </View>
      <View style={styles.actions}>
        <ActionButton label="Login" onPress={onLogin} />
        <ActionButton
          label="Create Account"
          onPress={onSignup}
          secondary
        />
      </View>
      <Text style={styles.footer}>Together, let’s make Pune better.</Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  topBar: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#EAF4EF",
  },
  locationDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: colors.emerald },
  locationText: { color: colors.emeraldDark, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  hero: { marginTop: 18, height: 257, justifyContent: "center" },
  heroCompact: { height: 215, marginTop: 5 },
  heroGlow: {
    position: "absolute",
    zIndex: -1,
    alignSelf: "center",
    width: 260,
    height: 200,
    borderRadius: 140,
    backgroundColor: "#DBF2E9",
  },
  copy: { alignItems: "center", marginTop: 20 },
  kicker: { color: colors.emerald, fontSize: 9, fontWeight: "800", letterSpacing: 1.35, textAlign: "center" },
  title: { color: colors.ink, fontSize: 34, lineHeight: 39, fontWeight: "800", letterSpacing: -1.1, textAlign: "center", marginTop: 10 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 9 },
  actions: { gap: 11, marginTop: 23 },
  footer: { color: "#92A29E", fontSize: 11, textAlign: "center", marginTop: 18 },
});
