import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ActionButton, Notice, Page } from "../components/Controls";
import { CivicLogo } from "../components/CivicLogo";
import { colors } from "../theme";
import type { AuthUser } from "../services/auth-api";
import {
  departmentAdminApi,
  type DepartmentComplaintItem,
  type DepartmentDashboardData,
} from "../services/department-admin-api";

type DepartmentAdminDashboardProps = {
  user: AuthUser;
  token: string;
  onLogout: () => Promise<void>;
};

export function DepartmentAdminDashboard({
  user,
  token,
  onLogout,
}: DepartmentAdminDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DepartmentDashboardData | null>(null);
  const [complaints, setComplaints] = useState<DepartmentComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setError("");
      const [dash, compList] = await Promise.all([
        departmentAdminApi.getDepartmentDashboard(token),
        departmentAdminApi.getDepartmentComplaints(token),
      ]);
      setDashboardData(dash);
      setComplaints(compList);
    } catch (err: any) {
      setError(err?.message || "Failed to load department dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [token]);

  const departmentName =
    dashboardData?.department?.name || user.departmentName || "Municipal Department";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return { bg: "#DCFCE7", text: "#166534" };
      case "IN_PROGRESS":
      case "ASSIGNED":
        return { bg: "#DBEAFE", text: "#1E40AF" };
      case "REJECTED":
        return { bg: "#FEE2E2", text: "#991B1B" };
      default:
        return { bg: "#FEF3C7", text: "#92400E" };
    }
  };

  return (
    <Page>
      <View style={styles.brand}>
        <CivicLogo />
      </View>

      {/* Header Profile Card */}
      <View style={styles.headerCard}>
        <View style={styles.badgeRow}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>DEPARTMENT ADMIN</Text>
          </View>
          <View style={styles.deptBadge}>
            <Text style={styles.deptBadgeText}>{departmentName.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.welcomeTitle}>{user.fullName}</Text>
        <Text style={styles.welcomeSubtitle}>
          Administering complaints for {departmentName}
        </Text>
        <Text style={styles.emailText}>{user.email}</Text>
      </View>

      {error ? <Notice message={error} /> : null}

      {loading ? (
        <ActivityIndicator color={colors.emerald} style={{ marginVertical: 30 }} />
      ) : (
        <>
          {/* Summary Metric Cards */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>
                {dashboardData?.counts.total ?? 0}
              </Text>
              <Text style={styles.metricLabel}>Total Assigned</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricNumber, { color: "#D97706" }]}>
                {dashboardData?.counts.pending ?? 0}
              </Text>
              <Text style={styles.metricLabel}>Pending</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricNumber, { color: "#2563EB" }]}>
                {dashboardData?.counts.inProgress ?? 0}
              </Text>
              <Text style={styles.metricLabel}>In Progress</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricNumber, { color: "#16A34A" }]}>
                {dashboardData?.counts.resolved ?? 0}
              </Text>
              <Text style={styles.metricLabel}>Resolved</Text>
            </View>
          </View>

          {/* Department Complaints Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>DEPARTMENT DATA</Text>
                <Text style={styles.sectionTitle}>
                  Assigned Complaints ({complaints.length})
                </Text>
              </View>
            </View>

            {complaints.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No Complaints Assigned</Text>
                <Text style={styles.emptySubtitle}>
                  No complaints have been assigned to this department yet.
                </Text>
              </View>
            ) : (
              complaints.map((c) => {
                const statusStyle = getStatusColor(c.status);
                return (
                  <View key={c._id} style={styles.complaintCard}>
                    <View style={styles.complaintTopRow}>
                      <Text style={styles.complaintId}>{c.complaintNumber}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusStyle.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: statusStyle.text },
                          ]}
                        >
                          {c.status.replace("_", " ")}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.complaintTitle}>{c.title}</Text>
                    <Text style={styles.complaintDesc} numberOfLines={2}>
                      {c.description}
                    </Text>

                    <View style={styles.metaRow}>
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryText}>{c.category}</Text>
                      </View>
                      <View style={styles.priorityPill}>
                        <Text style={styles.priorityText}>
                          Priority: {c.priority}
                        </Text>
                      </View>
                    </View>

                    {c.location?.address ? (
                      <Text style={styles.locationText}>
                        📍 {c.location.address}
                      </Text>
                    ) : null}

                    <Text style={styles.dateText}>
                      Received on{" "}
                      {new Date(c.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </>
      )}

      <View style={{ marginTop: 20, marginBottom: 40 }}>
        <ActionButton label="Sign out" onPress={() => void onLogout()} secondary />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  brand: { marginTop: 10, marginBottom: 20 },
  headerCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  roleBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleBadgeText: { color: "#1E40AF", fontSize: 10, fontWeight: "800" },
  deptBadge: {
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deptBadgeText: { color: colors.emeraldDark, fontSize: 10, fontWeight: "800" },
  welcomeTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  welcomeSubtitle: { color: colors.text, fontSize: 13, marginTop: 4, fontWeight: "600" },
  emailText: { color: colors.muted, fontSize: 12, marginTop: 2 },
  metricsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },
  metricNumber: { fontSize: 20, fontWeight: "800", color: colors.ink },
  metricLabel: { fontSize: 10, fontWeight: "700", color: colors.muted, marginTop: 4 },
  sectionCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionEyebrow: {
    color: colors.emerald,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "800", marginTop: 4 },
  emptyState: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  emptySubtitle: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
  complaintCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
  },
  complaintTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  complaintId: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },
  complaintTitle: { color: colors.ink, fontSize: 15, fontWeight: "700", marginBottom: 4 },
  complaintDesc: { color: colors.text, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  categoryPill: {
    backgroundColor: "#EEF2F6",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryText: { color: "#334155", fontSize: 10, fontWeight: "600" },
  priorityPill: {
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityText: { color: "#991B1B", fontSize: 10, fontWeight: "600" },
  locationText: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  dateText: { color: colors.muted, fontSize: 11, fontStyle: "italic" },
});
