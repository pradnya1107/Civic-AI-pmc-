import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

const buildings = [
  { width: 46, height: 102, tone: "#173C48" },
  { width: 57, height: 145, tone: "#204B56" },
  { width: 42, height: 122, tone: "#143744" },
  { width: 62, height: 178, tone: "#1D4652" },
  { width: 45, height: 132, tone: "#183C48" },
  { width: 57, height: 158, tone: "#214C58" },
  { width: 43, height: 112, tone: "#163844" },
];

type CityscapeProps = { compact?: boolean };

export function Cityscape({ compact = false }: CityscapeProps) {
  const height = compact ? 206 : 264;

  return (
    <View
      style={[styles.scene, { height }]}
      accessible
      accessibilityLabel="Illustration of a greener Pune skyline at dusk"
    >
      <View style={styles.skyGlow} />
      <View style={[styles.moon, compact && styles.moonCompact]} />
      <View style={styles.stars}>
        {[0, 1, 2, 3, 4].map((star) => (
          <View key={star} style={[styles.star, { left: `${10 + star * 18}%`, top: 20 + (star % 3) * 24 }]} />
        ))}
      </View>
      <View style={styles.skyline}>
        {buildings.map((building, index) => (
          <View
            key={`${building.width}-${index}`}
            style={[
              styles.building,
              {
                width: building.width,
                height: compact ? building.height * 0.75 : building.height,
                backgroundColor: building.tone,
                marginHorizontal: compact ? -3 : -1,
              },
            ]}
          >
            <View style={styles.windows}>
              {Array.from({ length: 8 }).map((_, windowIndex) => (
                <View
                  key={windowIndex}
                  style={[
                    styles.window,
                    (windowIndex + index) % 3 === 0 && styles.windowLit,
                  ]}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={styles.treeLine}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((tree) => (
          <View key={tree} style={styles.tree}>
            <View style={styles.treeTop} />
            <View style={styles.treeTrunk} />
          </View>
        ))}
      </View>
      <View style={styles.ground} />
      <View style={styles.road} />
      <View style={styles.roadStripe} />
      <View style={styles.lightTrail} />
      <View style={styles.sceneLabel}>
        <View style={styles.liveDot} />
        <Text style={styles.sceneLabelText}>PUNE · A CITY IN MOTION</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: "100%",
    backgroundColor: colors.midnight,
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
  },
  skyGlow: {
    position: "absolute",
    top: -104,
    left: "13%",
    width: "74%",
    height: 218,
    borderRadius: 140,
    backgroundColor: "rgba(30,130,135,0.28)",
  },
  moon: {
    position: "absolute",
    top: 35,
    right: 44,
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: "#B8E7DF",
    opacity: 0.86,
  },
  moonCompact: { top: 25, right: 30, width: 23, height: 23 },
  stars: { ...StyleSheet.absoluteFill },
  star: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#DDF7F1",
    opacity: 0.62,
  },
  skyline: {
    position: "absolute",
    bottom: 55,
    left: "3%",
    right: "3%",
    height: "70%",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  building: {
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderColor: "rgba(178,229,220,0.13)",
    borderWidth: 1,
    padding: 8,
    justifyContent: "flex-start",
  },
  windows: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  window: {
    width: 6,
    height: 7,
    borderRadius: 1,
    backgroundColor: "rgba(142,205,199,0.22)",
  },
  windowLit: { backgroundColor: "rgba(196,239,190,0.86)" },
  treeLine: {
    position: "absolute",
    bottom: 45,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  tree: { alignItems: "center" },
  treeTop: { width: 22, height: 22, borderRadius: 15, backgroundColor: "#16735F" },
  treeTrunk: { width: 3, height: 12, backgroundColor: "#8C7652" },
  ground: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 53,
    backgroundColor: "#0A2832",
    borderTopWidth: 1,
    borderTopColor: "rgba(160,223,206,0.16)",
  },
  road: {
    position: "absolute",
    bottom: -32,
    left: "14%",
    width: "72%",
    height: 61,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    backgroundColor: "#102E37",
    borderTopWidth: 2,
    borderColor: "rgba(168,233,223,0.28)",
  },
  roadStripe: {
    position: "absolute",
    bottom: 17,
    left: "47%",
    width: "12%",
    borderTopWidth: 2,
    borderColor: "rgba(199,233,242,0.45)",
  },
  lightTrail: {
    position: "absolute",
    bottom: 28,
    left: "22%",
    width: "21%",
    borderTopWidth: 2,
    borderColor: "#83E7D1",
    opacity: 0.8,
    transform: [{ rotate: "-8deg" }],
  },
  sceneLabel: {
    position: "absolute",
    left: 17,
    top: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(5,26,35,0.46)",
    borderColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: "#84E7C5" },
  sceneLabelText: { color: "rgba(255,255,255,0.82)", fontSize: 8, fontWeight: "700", letterSpacing: 1.1 },
});
