import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../theme";
import {
  departmentAdminApi,
  type AIAnalysisData,
  type DepartmentComplaintItem,
} from "../services/department-admin-api";

const AVAILABLE_CATEGORIES = [
  "Water Supply",
  "Roads & Infrastructure",
  "Waste Management",
  "Electricity",
  "Drainage",
  "Street Lighting",
  "Public Health",
  "Building & Construction",
  "Parks & Gardens",
  "General Administration",
];

const AVAILABLE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

type AISuggestionsCardProps = {
  complaintId: string;
  currentCategory: string;
  currentPriority: string;
  token: string;
  onComplaintUpdated?: (updated: DepartmentComplaintItem) => void;
};

export function AISuggestionsCard({
  complaintId,
  currentCategory,
  currentPriority,
  token,
  onComplaintUpdated,
}: AISuggestionsCardProps) {
  const [analysis, setAnalysis] = useState<AIAnalysisData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Confirmation state
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    type: "CATEGORY" | "PRIORITY" | "OVERRIDE";
    title: string;
    description: string;
    patch: { category?: string; priority?: string };
  } | null>(null);

  // Override dialog state
  const [overrideVisible, setOverrideVisible] = useState<boolean>(false);
  const [selectedOverrideCategory, setSelectedOverrideCategory] =
    useState<string>(currentCategory);
  const [selectedOverridePriority, setSelectedOverridePriority] =
    useState<string>(currentPriority);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await departmentAdminApi.getComplaintAiAnalysis(
        token,
        complaintId,
      );
      setAnalysis(data);
    } catch (err: any) {
      if (err?.code === "ANALYSIS_NOT_FOUND" || err?.statusCode === 404) {
        setError("AI analysis is not available for this complaint yet.");
      } else {
        setError(err?.message || "Failed to load AI suggestions.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAnalysis();
  }, [complaintId, token]);

  const handleApplyUpdate = async (patch: {
    category?: string;
    priority?: string;
  }) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const updated = await departmentAdminApi.updateComplaint(
        token,
        complaintId,
        patch,
      );
      setFeedback({
        type: "success",
        message: "Complaint updated successfully with selected values.",
      });
      setPendingConfirmation(null);
      setOverrideVisible(false);
      if (onComplaintUpdated) {
        onComplaintUpdated(updated);
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to update complaint.",
      });
      setPendingConfirmation(null);
    } finally {
      setActionLoading(false);
    }
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 0.85) return { bg: "#DCFCE7", text: "#166534" };
    if (confidence >= 0.7) return { bg: "#FEF3C7", text: "#92400E" };
    return { bg: "#FEE2E2", text: "#991B1B" };
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={styles.sparkleIcon}>✨</Text>
          <Text style={styles.headerTitle}>AI Intelligence Suggestions</Text>
        </View>
        {analysis?.modelVersion ? (
          <View style={styles.modelPill}>
            <Text style={styles.modelText}>{analysis.modelVersion}</Text>
          </View>
        ) : null}
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.emerald} size="small" />
          <Text style={styles.loadingText}>Retrieving AI suggestions...</Text>
        </View>
      ) : null}

      {/* Error or Unavailable State */}
      {!loading && error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => void fetchAnalysis()}
          >
            <Text style={styles.retryButtonText}>Refresh AI</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Available Suggestions */}
      {!loading && analysis ? (
        <View style={styles.content}>
          {/* Plain Language Summary */}
          <View style={styles.summaryBox}>
            <Text style={styles.sectionLabel}>AI EXECUTIVE SUMMARY</Text>
            <Text style={styles.summaryText}>{analysis.summary}</Text>
          </View>

          {/* Confidence Score Bar */}
          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>Confidence Score:</Text>
            <View
              style={[
                styles.confidenceBadge,
                {
                  backgroundColor: getConfidenceBadgeColor(analysis.confidence)
                    .bg,
                },
              ]}
            >
              <Text
                style={[
                  styles.confidenceText,
                  {
                    color: getConfidenceBadgeColor(analysis.confidence).text,
                  },
                ]}
              >
                {Math.round(analysis.confidence * 100)}%
              </Text>
            </View>
          </View>

          {/* Category Suggestion Card */}
          <View style={styles.suggestionBlock}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.blockTitle}>Suggested Category</Text>
              <Text style={styles.currentComparison}>
                Current:{" "}
                <Text style={styles.currentValue}>{currentCategory}</Text>
              </Text>
            </View>
            <View style={styles.valueRow}>
              <View style={styles.pillActive}>
                <Text style={styles.pillActiveText}>
                  {analysis.suggestedCategory}
                </Text>
              </View>
              {analysis.suggestedCategory !== currentCategory ? (
                <Pressable
                  disabled={actionLoading}
                  style={styles.acceptButton}
                  onPress={() =>
                    setPendingConfirmation({
                      type: "CATEGORY",
                      title: "Confirm Category Update",
                      description: `Update complaint category from "${currentCategory}" to AI suggestion "${analysis.suggestedCategory}"?`,
                      patch: { category: analysis.suggestedCategory },
                    })
                  }
                >
                  <Text style={styles.acceptButtonText}>Accept Category</Text>
                </Pressable>
              ) : (
                <View style={styles.matchedBadge}>
                  <Text style={styles.matchedBadgeText}>✓ Already Matches</Text>
                </View>
              )}
            </View>
          </View>

          {/* Priority Suggestion Card */}
          <View style={styles.suggestionBlock}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.blockTitle}>Suggested Priority</Text>
              <Text style={styles.currentComparison}>
                Current:{" "}
                <Text style={styles.currentValue}>{currentPriority}</Text>
              </Text>
            </View>
            <View style={styles.valueRow}>
              <View style={styles.pillPriority}>
                <Text style={styles.pillPriorityText}>
                  {analysis.suggestedPriority}
                </Text>
              </View>
              {analysis.suggestedPriority !== currentPriority ? (
                <Pressable
                  disabled={actionLoading}
                  style={styles.acceptButton}
                  onPress={() =>
                    setPendingConfirmation({
                      type: "PRIORITY",
                      title: "Confirm Priority Update",
                      description: `Update complaint priority from "${currentPriority}" to AI suggestion "${analysis.suggestedPriority}"?`,
                      patch: { priority: analysis.suggestedPriority },
                    })
                  }
                >
                  <Text style={styles.acceptButtonText}>Accept Priority</Text>
                </Pressable>
              ) : (
                <View style={styles.matchedBadge}>
                  <Text style={styles.matchedBadgeText}>✓ Already Matches</Text>
                </View>
              )}
            </View>
          </View>

          {/* Manual Override Action */}
          <View style={styles.overrideSection}>
            <Pressable
              disabled={actionLoading}
              style={styles.overrideButton}
              onPress={() => {
                setSelectedOverrideCategory(currentCategory);
                setSelectedOverridePriority(currentPriority);
                setOverrideVisible(true);
              }}
            >
              <Text style={styles.overrideButtonText}>
                ⚙️ Manual Override Suggestions
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Feedback banner */}
      {feedback ? (
        <View
          style={[
            styles.feedbackBox,
            feedback.type === "success"
              ? styles.feedbackSuccess
              : styles.feedbackError,
          ]}
        >
          <Text
            style={[
              styles.feedbackText,
              feedback.type === "success"
                ? styles.feedbackSuccessText
                : styles.feedbackErrorText,
            ]}
          >
            {feedback.message}
          </Text>
        </View>
      ) : null}

      {/* Confirmation Modal */}
      {pendingConfirmation ? (
        <Modal transparent animationType="fade" visible>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {pendingConfirmation.title}
              </Text>
              <Text style={styles.modalBody}>
                {pendingConfirmation.description}
              </Text>

              <View style={styles.modalActions}>
                <Pressable
                  disabled={actionLoading}
                  style={styles.modalCancel}
                  onPress={() => setPendingConfirmation(null)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={actionLoading}
                  style={styles.modalConfirm}
                  onPress={() =>
                    void handleApplyUpdate(pendingConfirmation.patch)
                  }
                >
                  {actionLoading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Confirm & Apply</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Manual Override Modal */}
      {overrideVisible ? (
        <Modal transparent animationType="slide" visible>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCardLarge}>
              <Text style={styles.modalTitle}>Manual Override</Text>
              <Text style={styles.modalSubtitle}>
                Select an authorized category and priority for this complaint:
              </Text>

              <Text style={styles.overrideLabel}>Select Category:</Text>
              <View style={styles.pickerGrid}>
                {AVAILABLE_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.pickerOption,
                      selectedOverrideCategory === cat &&
                        styles.pickerOptionSelected,
                    ]}
                    onPress={() => setSelectedOverrideCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        selectedOverrideCategory === cat &&
                          styles.pickerOptionTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.overrideLabel, { marginTop: 14 }]}>
                Select Priority:
              </Text>
              <View style={styles.priorityRow}>
                {AVAILABLE_PRIORITIES.map((prio) => (
                  <Pressable
                    key={prio}
                    style={[
                      styles.prioOption,
                      selectedOverridePriority === prio &&
                        styles.prioOptionSelected,
                    ]}
                    onPress={() => setSelectedOverridePriority(prio)}
                  >
                    <Text
                      style={[
                        styles.prioOptionText,
                        selectedOverridePriority === prio &&
                          styles.prioOptionTextSelected,
                      ]}
                    >
                      {prio}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalCancel}
                  onPress={() => setOverrideVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.modalConfirm}
                  onPress={() => {
                    setOverrideVisible(false);
                    setPendingConfirmation({
                      type: "OVERRIDE",
                      title: "Confirm Manual Override",
                      description: `Apply manual override: Category "${selectedOverrideCategory}", Priority "${selectedOverridePriority}"?`,
                      patch: {
                        category: selectedOverrideCategory,
                        priority: selectedOverridePriority,
                      },
                    });
                  }}
                >
                  <Text style={styles.modalConfirmText}>Review & Confirm</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sparkleIcon: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  modelPill: {
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  modelText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  centerBox: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.muted,
  },
  errorBox: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#92400E",
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#F59E0B",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  content: {
    gap: 12,
  },
  summaryBox: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  confidenceBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "800",
  },
  suggestionBlock: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  suggestionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  currentComparison: {
    fontSize: 11,
    color: colors.muted,
  },
  currentValue: {
    fontWeight: "700",
    color: colors.ink,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pillActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
  },
  pillActiveText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.emeraldDark,
  },
  pillPriority: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
  },
  pillPriorityText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  acceptButton: {
    backgroundColor: colors.emerald,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  acceptButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.white,
  },
  matchedBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  matchedBadgeText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
  },
  overrideSection: {
    alignItems: "flex-end",
  },
  overrideButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  overrideButtonText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  feedbackBox: {
    marginTop: 10,
    borderRadius: 8,
    padding: 10,
  },
  feedbackSuccess: {
    backgroundColor: "#DCFCE7",
  },
  feedbackError: {
    backgroundColor: "#FEE2E2",
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: "600",
  },
  feedbackSuccessText: {
    color: "#166534",
  },
  feedbackErrorText: {
    color: "#991B1B",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    gap: 12,
  },
  modalCardLarge: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 480,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  overrideLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 6,
  },
  pickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pickerOption: {
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "transparent",
  },
  pickerOptionSelected: {
    backgroundColor: "#ECFDF5",
    borderColor: colors.emerald,
  },
  pickerOptionText: {
    fontSize: 11,
    color: colors.text,
  },
  pickerOptionTextSelected: {
    color: colors.emeraldDark,
    fontWeight: "700",
  },
  priorityRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  prioOption: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  prioOptionSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  prioOptionText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  prioOptionTextSelected: {
    color: "#1E40AF",
    fontWeight: "800",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  modalCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  modalConfirm: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.emerald,
  },
  modalConfirmText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white,
  },
});
