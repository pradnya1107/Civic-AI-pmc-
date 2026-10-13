import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActionButton, Page, TextAction } from "../components/Controls";
import { Cityscape } from "../components/Cityscape";
import { colors, shadows } from "../theme";

type OnboardingScreenProps = {
  onFinish: () => void;
};

const slides = [
  {
    title: "See an Issue?\nReport It!",
    body: "From a broken streetlight to a blocked drain, share what needs attention in your neighbourhood.",
    eyebrow: "YOUR VOICE, ON THE MAP",
  },
  {
    title: "AI That Understands\nYour City",
    body: "Helpful technology can make it easier to understand civic concerns and route them to the right team.",
    eyebrow: "A SMARTER WAY TO LISTEN",
  },
  {
    title: "Track Every Step",
    body: "Follow your report as it moves from submission to a real resolution.",
    eyebrow: "CLEAR UPDATES, REAL PROGRESS",
  },
];

const timelineSteps = [
  { title: "Submitted", description: "Your report is received", complete: true },
  { title: "Under Review", description: "The right team is reviewing it", complete: true },
  { title: "In Progress", description: "Work is underway", complete: false },
  { title: "Resolved", description: "A better neighbourhood", complete: false },
];

export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const [step, setStep] = React.useState(0);
  const slide = slides[step];
  const isFinal = step === slides.length - 1;

  return (
    <Page>
      <View style={styles.topBar}>
        <Text style={styles.brand}>CIVICAI · PUNE</Text>
        <TextAction label="Skip" onPress={onFinish} />
      </View>

      <View style={styles.artwork}>
        {step === 0 ? (
          <View style={styles.cityCard}>
            <Cityscape compact />
            <View style={styles.issueCard}>
              <View style={styles.issueIcon}>
                <Text style={styles.issueIconText}>!</Text>
              </View>
              <View style={styles.issueCopy}>
                <Text style={styles.issueTitle}>Streetlight out</Text>
                <Text style={styles.issueMeta}>Koregaon Park · Just now</Text>
              </View>
              <Text style={styles.issueArrow}>›</Text>
            </View>
          </View>
        ) : step === 1 ? (
          <View style={styles.aiCard}>
            <View style={styles.aiOrb}>
              <View style={styles.aiRingOuter} />
              <View style={styles.aiRingInner} />
              <Text style={styles.aiGlyph}>AI</Text>
              <View style={styles.scanLine} />
            </View>
            <View style={styles.scanPill}>
              <View style={styles.scanDot} />
              <Text style={styles.scanText}>UNDERSTANDING YOUR REPORT</Text>
            </View>
            <View style={styles.aiSparkleOne} />
            <View style={styles.aiSparkleTwo} />
          </View>
        ) : (
          <View style={styles.timelineCard}>
            {timelineSteps.map((item, index) => (
              <View key={item.title} style={styles.timelineRow}>
                <View style={styles.timelineTrack}>
                  <View
                    style={[
                      styles.timelineNode,
                      item.complete && styles.timelineNodeDone,
                      index === 3 && styles.timelineNodeLast,
                    ]}
                  >
                    {item.complete ? <Text style={styles.check}>✓</Text> : null}
                  </View>
                  {index < 3 ? (
                    <View
                      style={[
                        styles.timelineLine,
                        index === 0 && styles.timelineLineDone,
                      ]}
                    />
                  ) : null}
                </View>
                <View style={styles.timelineTextBlock}>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <Text style={styles.timelineDescription}>
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.body}>{slide.body}</Text>

      <View style={styles.pagination} accessibilityLabel={`Onboarding step ${step + 1} of 3`}>
        {slides.map((item, index) => (
          <View
            key={item.eyebrow}
            style={[styles.dot, index === step && styles.dotActive]}
          />
        ))}
      </View>

      <ActionButton
        label={isFinal ? "Get Started" : "Continue"}
        onPress={() => (isFinal ? onFinish() : setStep((current) => current + 1))}
      />
      <Text style={styles.stepLabel}>{String(step + 1).padStart(2, "0")} / 03</Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  brand: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.6 },
  artwork: {
    width: "100%",
    height: 246,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },
  cityCard: { width: "100%", height: 206, justifyContent: "center" },
  issueCard: {
    position: "absolute",
    bottom: -4,
    left: 15,
    right: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 13,
    borderRadius: 17,
    ...shadows.card,
  },
  issueIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#FFF0D9",
    alignItems: "center",
    justifyContent: "center",
  },
  issueIconText: { color: "#A96217", fontSize: 19, fontWeight: "800" },
  issueCopy: { flex: 1, marginLeft: 10 },
  issueTitle: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  issueMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  issueArrow: { color: colors.muted, fontSize: 23, marginHorizontal: 5 },
  aiCard: {
    width: "100%",
    height: 220,
    borderRadius: 26,
    backgroundColor: "#E7F4F1",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  aiOrb: {
    width: 143,
    height: 143,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C5E8DD",
  },
  aiRingOuter: {
    position: "absolute",
    width: 126,
    height: 126,
    borderWidth: 1,
    borderColor: "rgba(8,123,98,0.35)",
    borderRadius: 70,
  },
  aiRingInner: {
    position: "absolute",
    width: 94,
    height: 94,
    borderWidth: 1,
    borderColor: "rgba(8,123,98,0.24)",
    borderRadius: 55,
  },
  aiGlyph: { color: colors.emeraldDark, fontSize: 28, fontWeight: "800", letterSpacing: -1 },
  scanLine: {
    position: "absolute",
    left: 25,
    right: 25,
    top: 64,
    borderTopWidth: 1,
    borderColor: "rgba(8,123,98,0.55)",
  },
  scanPill: {
    position: "absolute",
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scanDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: colors.emerald },
  scanText: { color: colors.emeraldDark, fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  aiSparkleOne: { position: "absolute", top: 43, left: 67, width: 9, height: 9, backgroundColor: "#73BCA7", borderRadius: 5 },
  aiSparkleTwo: { position: "absolute", top: 61, right: 71, width: 6, height: 6, backgroundColor: "#A77ED1", borderRadius: 4 },
  timelineCard: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 23,
    paddingHorizontal: 20,
    paddingVertical: 17,
    ...shadows.card,
  },
  timelineRow: { minHeight: 47, flexDirection: "row", gap: 13 },
  timelineTrack: { width: 17, alignItems: "center" },
  timelineNode: {
    width: 16,
    height: 16,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#C5D3D0",
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  timelineNodeDone: { borderColor: colors.emerald, backgroundColor: colors.emerald },
  timelineNodeLast: {},
  check: { color: colors.white, fontSize: 9, fontWeight: "800" },
  timelineLine: { width: 1, flex: 1, backgroundColor: "#DCE5E2", marginTop: -1 },
  timelineLineDone: { backgroundColor: "#64BA9E" },
  timelineTextBlock: { flex: 1, paddingBottom: 10 },
  timelineTitle: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  timelineDescription: { color: colors.muted, fontSize: 10, marginTop: 3 },
  eyebrow: { textAlign: "center", color: colors.emerald, fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: colors.ink, textAlign: "center", fontSize: 29, lineHeight: 34, fontWeight: "800", letterSpacing: -0.7, marginTop: 9 },
  body: { color: colors.muted, textAlign: "center", fontSize: 14, lineHeight: 21, marginTop: 11, paddingHorizontal: 5 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 22, marginBottom: 17 },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: "#CCD9D5" },
  dotActive: { width: 23, backgroundColor: colors.emerald },
  stepLabel: { textAlign: "center", color: "#97A7A4", fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginTop: 12 },
});
