import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  ActionButton,
  Notice,
  Page,
} from "../components/Controls";
import { CivicLogo } from "../components/CivicLogo";
import { colors } from "../theme";
import { ApiError, type AuthUser } from "../services/auth-api";
import { SuperAdminDashboard } from "./SuperAdminDashboard";
import { DepartmentAdminDashboard } from "./DepartmentAdminDashboard";

type AuthenticatedScreenProps = {
  user: AuthUser;
  token?: string;
  onLogout: () => Promise<void>;
};

export function AuthenticatedScreen({
  user,
  token = "",
  onLogout,
}: AuthenticatedScreenProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Role-based routing
  if (user.role === "SUPER_ADMIN") {
    return (
      <SuperAdminDashboard
        user={user}
        token={token}
        onLogout={onLogout}
      />
    );
  }

  if (user.role === "DEPARTMENT_ADMIN" || (user.role === "ADMIN" && user.departmentId)) {
    return (
      <DepartmentAdminDashboard
        user={user}
        token={token}
        onLogout={onLogout}
      />
    );
  }

  // Default: Citizen Authenticated Screen
  const signOut = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      await onLogout();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Sign out could not be completed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Page>
      <View style={styles.brand}>
        <CivicLogo />
      </View>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.fullName.trim().charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.eyebrow}>AUTHENTICATED SESSION</Text>
        <Text style={styles.title}>You’re signed in.</Text>
        <Text style={styles.name}>{user.fullName}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{user.role}</Text>
        </View>
      </View>
      <Text style={styles.body}>
        Your CivicAI account is connected. More city services will be available
        here as the mobile experience grows.
      </Text>
      {error ? <Notice message={error} /> : null}
      <ActionButton
        label="Sign out"
        onPress={() => void signOut()}
        loading={isSubmitting}
        disabled={isSubmitting}
        secondary
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  brand: { marginTop: 10, marginBottom: 46 },
  card: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 25,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 24,
    backgroundColor: "#DFF3E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },
  avatarText: { color: colors.emeraldDark, fontSize: 28, fontWeight: "800" },
  eyebrow: { color: colors.emerald, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 27, fontWeight: "800", marginTop: 10 },
  name: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 13 },
  email: { color: colors.muted, fontSize: 13, marginTop: 4 },
  rolePill: { backgroundColor: "#EAF4EF", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginTop: 13 },
  roleText: { color: colors.emeraldDark, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 22,
    marginBottom: 30,
    paddingHorizontal: 8,
  },
});
