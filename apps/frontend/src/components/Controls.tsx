import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native";
import { colors, shadows } from "../theme";

type PageProps = {
  children: ReactNode;
  dark?: boolean;
};

export function Page({ children, dark = false }: PageProps) {
  return (
    <SafeAreaView style={[styles.safeArea, dark && styles.safeDark]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.page, dark && styles.pageDark]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
};

export function ActionButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
  loading = false,
  accessibilityHint,
}: ActionButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.buttonSecondary : styles.buttonPrimary,
        inactive && styles.buttonDisabled,
        pressed && !inactive && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.emerald : colors.white} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            secondary && styles.buttonTextSecondary,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

type TextActionProps = {
  label: string;
  onPress: () => void;
  light?: boolean;
};

export function TextAction({ label, onPress, light = false }: TextActionProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text style={[styles.textAction, light && styles.textActionLight]}>
        {label}
      </Text>
    </Pressable>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  textContentType?: TextInputProps["textContentType"];
  rightElement?: ReactNode;
  maxLength?: number;
  editable?: boolean;
};

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  textContentType,
  rightElement,
  maxLength,
  editable = true,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputShell, error && styles.inputError]}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={editable}
          keyboardType={keyboardType}
          maxLength={maxLength}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8A9B9C"
          secureTextEntry={secureTextEntry}
          selectionColor={colors.emerald}
          style={styles.input}
          textContentType={textContentType}
          value={value}
        />
        {rightElement}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type NoticeProps = {
  message: string;
  tone?: "error" | "info" | "success";
};

export function Notice({ message, tone = "error" }: NoticeProps) {
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.notice,
        tone === "info" && styles.noticeInfo,
        tone === "success" && styles.noticeSuccess,
      ]}
    >
      <Text
        style={[
          styles.noticeText,
          tone === "info" && styles.noticeTextInfo,
          tone === "success" && styles.noticeTextSuccess,
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  safeDark: { backgroundColor: colors.deep },
  scrollContent: { flexGrow: 1 },
  page: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 36,
    backgroundColor: colors.paper,
  },
  pageDark: { backgroundColor: colors.deep },
  button: {
    minHeight: 56,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  buttonPrimary: { backgroundColor: colors.emerald, ...shadows.button },
  buttonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabled: { opacity: 0.58 },
  buttonPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: "700", letterSpacing: 0.15 },
  buttonTextSecondary: { color: colors.emeraldDark },
  textAction: { color: colors.emerald, fontSize: 14, fontWeight: "700" },
  textActionLight: { color: "#B8F0DD" },
  field: { gap: 8 },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: "700", marginLeft: 2 },
  inputShell: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    paddingHorizontal: 15,
    backgroundColor: colors.white,
  },
  inputError: { borderColor: colors.error },
  input: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 15, paddingVertical: 14 },
  fieldError: { color: colors.error, fontSize: 12, marginLeft: 2 },
  notice: {
    backgroundColor: "#FFF1F1",
    borderColor: "#F2C8CD",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
  },
  noticeInfo: { backgroundColor: "#EEF5F4", borderColor: "#D5E5E1" },
  noticeSuccess: { backgroundColor: "#EAF7F0", borderColor: "#C9E9D8" },
  noticeText: { color: "#972B3A", fontSize: 13, lineHeight: 19 },
  noticeTextInfo: { color: "#365A5A" },
  noticeTextSuccess: { color: colors.success },
});
