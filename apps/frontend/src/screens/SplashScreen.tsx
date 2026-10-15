import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Cityscape } from "../components/Cityscape";
import { CivicLogo } from "../components/CivicLogo";
import { colors } from "../theme";

type SplashScreenProps = { onFinish: () => void };

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const motionSubscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });

    const start = (shouldReduceMotion: boolean) => {
      if (!active) return;
      if (shouldReduceMotion) {
        reveal.setValue(1);
        rise.setValue(0);
        timer = setTimeout(onFinish, 650);
        return;
      }
      Animated.parallel([
        Animated.timing(reveal, {
          toValue: 1,
          duration: 850,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.spring(rise, {
          toValue: 0,
          damping: 18,
          stiffness: 90,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
      timer = setTimeout(onFinish, 2400);
    };

    start(reduceMotion);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      motionSubscription.remove();
    };
  }, [onFinish, reduceMotion, reveal, rise]);

  const animatedStyle = {
    opacity: reveal,
    transform: [{ translateY: rise }],
  };

  return (
    <View style={styles.screen}>
      <View style={styles.aura} />
      <Animated.View style={[styles.brand, animatedStyle]}>
        <CivicLogo light />
      </Animated.View>
      <View style={styles.cityWrap}>
        <Cityscape />
      </View>
      <Animated.View style={[styles.copy, animatedStyle]}>
        <Text style={styles.title}>Smarter Cities,{"\n"}Brighter Communities</Text>
        <Text style={styles.subtitle}>Building a better Pune, together.</Text>
      </Animated.View>
      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <Text style={styles.footerText}>MADE FOR OUR CITY</Text>
        <View style={styles.footerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.deep,
    justifyContent: "center",
    paddingHorizontal: 22,
    overflow: "hidden",
  },
  aura: {
    position: "absolute",
    top: "13%",
    alignSelf: "center",
    width: 360,
    height: 360,
    borderRadius: 220,
    backgroundColor: "rgba(12,104,102,0.16)",
  },
  brand: { alignItems: "center", marginBottom: 27 },
  cityWrap: { width: "100%", maxWidth: 490, alignSelf: "center" },
  copy: { alignItems: "center", marginTop: 27 },
  title: {
    color: colors.white,
    fontSize: 27,
    fontWeight: "800",
    lineHeight: 34,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: { color: "#B9D5D5", fontSize: 14, marginTop: 10 },
  footer: {
    position: "absolute",
    bottom: 34,
    left: 52,
    right: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  footerLine: { height: 1, flex: 1, backgroundColor: "rgba(211,245,235,0.2)" },
  footerText: { color: "#8DB2B3", fontSize: 9, fontWeight: "700", letterSpacing: 1.7 },
});
