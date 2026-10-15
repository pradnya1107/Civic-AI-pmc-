import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ActionButton, Notice, Page } from "../components/Controls";
import { CivicLogo } from "../components/CivicLogo";
import { colors } from "../theme";
import type { AuthUser } from "../services/auth-api";
import {
  departmentAdminApi,
  type DepartmentAdminItem,
  type DepartmentItem,
} from "../services/department-admin-api";

const DEMO_EMAIL_MAPPINGS: Record<string, string> = {
  roads: "roads.demo@civicai.local",
  "roads-infrastructure": "roads.demo@civicai.local",
  waste: "waste.demo@civicai.local",
  "waste-management": "waste.demo@civicai.local",
  water: "water.demo@civicai.local",
  "water-supply": "water.demo@civicai.local",
  drainage: "drainage.demo@civicai.local",
  "street-lighting": "lighting.demo@civicai.local",
  lighting: "lighting.demo@civicai.local",
  electricity: "lighting.demo@civicai.local",
  "public-health": "health.demo@civicai.local",
  health: "health.demo@civicai.local",
};

type SuperAdminDashboardProps = {
  user: AuthUser;
  token: string;
  onLogout: () => Promise<void>;
};

export function SuperAdminDashboard({
  user,
  token,
  onLogout,
}: SuperAdminDashboardProps) {
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [admins, setAdmins] = useState<DepartmentAdminItem[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    temporaryPassword?: string;
    departmentName: string;
  } | null>(null);

  const fetchData = async () => {
    try {
      setError("");
      const [deptList, adminList] = await Promise.all([
        departmentAdminApi.getDepartments(),
        departmentAdminApi.getDepartmentAdmins(token),
      ]);
      setDepartments(deptList);
      setAdmins(adminList);
      if (deptList.length > 0 && !selectedDeptId) {
        selectDepartment(deptList[0]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load management data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [token]);

  const selectDepartment = (dept: DepartmentItem) => {
    setSelectedDeptId(dept._id);
    const suggestedEmail =
      DEMO_EMAIL_MAPPINGS[dept.slug] || `${dept.slug}.demo@civicai.local`;
    setAdminEmail(suggestedEmail);
  };

  const handleCreate = async () => {
    setError("");
    setSuccessMessage("");
    setCreatedCredentials(null);

    if (!selectedDeptId) {
      setError("Please select a department.");
      return;
    }
    if (!adminName.trim()) {
      setError("Please enter the department admin's full name.");
      return;
    }
    if (!adminEmail.trim()) {
      setError("Please enter or confirm the demo email.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await departmentAdminApi.createDepartmentAdmin(token, {
        departmentId: selectedDeptId,
        fullName: adminName.trim(),
        email: adminEmail.trim(),
      });

      const selectedDept = departments.find((d) => d._id === selectedDeptId);
      setSuccessMessage("Demo account created successfully.");
      setCreatedCredentials({
        email: result.admin.email,
        temporaryPassword: result.temporaryPassword,
        departmentName: selectedDept?.name || "Department",
      });

      // Clear input
      setAdminName("");
      // Refresh list
      const updatedAdmins = await departmentAdminApi.getDepartmentAdmins(token);
      setAdmins(updatedAdmins);
    } catch (err: any) {
      setError(err?.message || "Failed to create department admin.");
    } finally {
      setSubmitting(false);
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
            <Text style={styles.roleBadgeText}>SUPER ADMIN</Text>
          </View>
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>DEMO MODE</Text>
          </View>
        </View>
        <Text style={styles.welcomeTitle}>Super Admin Console</Text>
        <Text style={styles.welcomeSubtitle}>
          Logged in as {user.fullName} ({user.email})
        </Text>
      </View>

      {/* Department Admin Management Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>ADMIN MANAGEMENT</Text>
        <Text style={styles.sectionTitle}>Create Department Admin</Text>
        <Text style={styles.sectionDescription}>
          Select a municipal department and create a demo administrator account.
          Credentials will be generated and printed to the server terminal.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.emerald} style={{ marginVertical: 20 }} />
        ) : (
          <>
            {/* Department Picker Chips */}
            <Text style={styles.fieldLabel}>Select Department</Text>
            <View style={styles.chipsContainer}>
              {departments.map((dept) => {
                const isSelected = selectedDeptId === dept._id;
                return (
                  <Pressable
                    key={dept._id}
                    onPress={() => selectDepartment(dept)}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {dept.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Inputs */}
            <Text style={styles.fieldLabel}>Admin Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rajesh Patil"
              placeholderTextColor={colors.muted}
              value={adminName}
              onChangeText={setAdminName}
            />

            <Text style={styles.fieldLabel}>Demo Email</Text>
            <TextInput
              style={styles.input}
              placeholder="roads.demo@civicai.local"
              placeholderTextColor={colors.muted}
              value={adminEmail}
              onChangeText={setAdminEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {error ? <Notice message={error} /> : null}
            {successMessage ? (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>✓ {successMessage}</Text>
                {createdCredentials?.temporaryPassword ? (
                  <View style={styles.credentialCard}>
                    <Text style={styles.credLabel}>DEMO CREDENTIALS GENERATED</Text>
                    <Text style={styles.credRow}>
                      <Text style={styles.credKey}>Department: </Text>
                      {createdCredentials.departmentName}
                    </Text>
                    <Text style={styles.credRow}>
                      <Text style={styles.credKey}>Email: </Text>
                      {createdCredentials.email}
                    </Text>
                    <Text style={styles.credRow}>
                      <Text style={styles.credKey}>Temporary Password: </Text>
                      <Text style={styles.credPassword}>
                        {createdCredentials.temporaryPassword}
                      </Text>
                    </Text>
                    <Text style={styles.credNotice}>
                      Also logged in backend terminal. You can log in using these credentials.
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={{ marginTop: 14 }}>
              <ActionButton
                label="Create Department Admin"
                onPress={handleCreate}
                loading={submitting}
                disabled={submitting}
              />
            </View>
          </>
        )}
      </View>

      {/* Existing Department Admins List */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>ACTIVE ADMINISTRATORS</Text>
        <Text style={styles.sectionTitle}>Department Admins ({admins.length})</Text>

        {admins.length === 0 ? (
          <Text style={styles.emptyText}>No department admins created yet.</Text>
        ) : (
          admins.map((adm) => (
            <View key={adm.id} style={styles.adminRow}>
              <View style={styles.adminAvatar}>
                <Text style={styles.adminAvatarText}>
                  {adm.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminName}>{adm.fullName}</Text>
                <Text style={styles.adminEmail}>{adm.email}</Text>
                <View style={styles.deptTag}>
                  <Text style={styles.deptTagText}>
                    {adm.department?.name || "General Admin"}
                  </Text>
                </View>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{adm.accountStatus}</Text>
              </View>
            </View>
          ))
        )}
      </View>

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
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleBadgeText: { color: "#991B1B", fontSize: 10, fontWeight: "800" },
  demoBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  demoBadgeText: { color: "#92400E", fontSize: 10, fontWeight: "800" },
  welcomeTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  welcomeSubtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  sectionCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  sectionEyebrow: {
    color: colors.emerald,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "800", marginTop: 4 },
  sectionDescription: { color: colors.muted, fontSize: 13, marginTop: 6, marginBottom: 16 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#F9FBFA",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  chip: {
    backgroundColor: "#EEF3F1",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipSelected: {
    backgroundColor: "#E0F2EB",
    borderColor: colors.emerald,
  },
  chipText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  chipTextSelected: { color: colors.emeraldDark, fontWeight: "800" },
  successBox: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  successTitle: { color: "#065F46", fontWeight: "800", fontSize: 14 },
  credentialCard: {
    backgroundColor: colors.white,
    borderColor: "#6EE7B7",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  credLabel: { color: colors.emeraldDark, fontSize: 10, fontWeight: "800", letterSpacing: 0.8, marginBottom: 6 },
  credRow: { color: colors.text, fontSize: 13, marginVertical: 2 },
  credKey: { fontWeight: "700" },
  credPassword: { color: "#B91C1C", fontWeight: "800", fontFamily: "monospace" },
  credNotice: { color: colors.muted, fontSize: 11, fontStyle: "italic", marginTop: 6 },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F0",
    gap: 12,
  },
  adminAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#DDF5EB",
    alignItems: "center",
    justifyContent: "center",
  },
  adminAvatarText: { color: colors.emeraldDark, fontWeight: "800", fontSize: 16 },
  adminName: { color: colors.text, fontSize: 14, fontWeight: "700" },
  adminEmail: { color: colors.muted, fontSize: 12 },
  deptTag: {
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  deptTagText: { color: "#475569", fontSize: 10, fontWeight: "700" },
  statusPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: { color: "#166534", fontSize: 10, fontWeight: "800" },
  emptyText: { color: colors.muted, fontSize: 13, fontStyle: "italic", marginTop: 8 },
});
