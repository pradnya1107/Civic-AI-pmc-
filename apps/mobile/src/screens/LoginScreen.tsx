import { useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ActionButton,
  Field,
  Notice,
  Page,
  TextAction,
} from "../components/Controls";
import { CivicLogo } from "../components/CivicLogo";
import { colors } from "../theme";
import { isValidEmailAddress, utf8ByteLength } from "../utils/form-validation";
import { ApiError } from "../services/auth-api";

type LoginScreenProps = {
  onBack: () => void;
  onSignup: () => void;
  onForgotPassword: () => void;
  onVerify?: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  initialEmail?: string;
  initialNotice?: string;
  initialNoticeTone?: "error" | "success";
};

export function LoginScreen({
  onBack,
  onSignup,
  onForgotPassword,
  onVerify,
  onLogin,
  initialEmail = "",
  initialNotice,
  initialNoticeTone = "success",
}: LoginScreenProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [notice, setNotice] = useState(initialNotice ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const submit = async () => {
    if (submittingRef.current) return;
    const nextErrors: typeof errors = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      nextErrors.email = "Enter your email address.";
    } else if (!isValidEmailAddress(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address of 254 characters or fewer.";
    }
    if (!password) nextErrors.password = "Enter your password.";
    else if (password.length > 128 || utf8ByteLength(password) > 72) {
      nextErrors.password = "Password must be 128 characters and 72 UTF-8 bytes or fewer.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submittingRef.current = true;
    setNotice("");
    setIsSubmitting(true);
    try {
      await onLogin(normalizedEmail.toLowerCase(), password);
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? error.message
          : "Sign in could not be completed. Please try again.",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Page>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8}>
          <Text style={styles.back}>‹  Back</Text>
        </Pressable>
        <CivicLogo compact />
      </View>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>GOOD TO HAVE YOU BACK</Text>
        <Text style={styles.title}>Welcome back.</Text>
        <Text style={styles.subtitle}>
          Sign in to stay connected to the things that matter in your city.
        </Text>
      </View>

      <View style={styles.form}>
        <Field
          autoCapitalize="none"
          error={errors.email}
          keyboardType="email-address"
          label="Email address"
          onChangeText={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined }));
            setNotice("");
          }}
          editable={!isSubmitting}
          placeholder="you@example.com"
          textContentType="emailAddress"
          value={email}
        />
        <Field
          error={errors.password}
          label="Password"
          onChangeText={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
            setNotice("");
          }}
          editable={!isSubmitting}
          placeholder="Enter your password"
          maxLength={128}
          rightElement={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              hitSlop={8}
              onPress={() => setShowPassword((visible) => !visible)}
            >
              <Text style={styles.showPassword}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          }
          secureTextEntry={!showPassword}
          textContentType="password"
          value={password}
        />
        <View style={styles.forgotRow}>
          <TextAction label="Forgot password?" onPress={onForgotPassword} />
        </View>
        {notice ? (
          <Notice
            message={notice}
            tone={initialNotice && notice === initialNotice ? initialNoticeTone : "error"}
          />
        ) : null}
        <ActionButton label="Login" onPress={submit} loading={isSubmitting} />
      </View>

      <View style={styles.signupRow}>
        <Text style={styles.signupPrompt}>New to CivicAI?</Text>
        <TextAction label="Create an account" onPress={onSignup} />
      </View>
      {onVerify ? (
        <View style={styles.verifyRow}>
          <Text style={styles.signupPrompt}>Have a pending verification code?</Text>
          <TextAction label="Verify email" onPress={onVerify} />
        </View>
      ) : null}
      <Text style={styles.privacy}>
        Your community starts with a conversation.
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  topBar: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  heading: { marginTop: 48, marginBottom: 29 },
  eyebrow: { color: colors.emerald, fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 32, fontWeight: "800", letterSpacing: -0.9, marginTop: 9 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 9, maxWidth: 345 },
  form: { gap: 18 },
  showPassword: { color: colors.emerald, fontSize: 12, fontWeight: "700", paddingLeft: 8 },
  forgotRow: { alignItems: "flex-end", marginTop: -4 },
  signupRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 27 },
  verifyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 },
  signupPrompt: { color: colors.muted, fontSize: 13 },
  privacy: { color: "#9AA9A5", fontSize: 11, textAlign: "center", marginTop: 35 },
});
