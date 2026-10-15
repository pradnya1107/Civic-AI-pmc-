import { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
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
import { isValidEmailAddress, validatePassword } from "../utils/form-validation";
import { ApiError, authApi } from "../services/auth-api";

type SignUpScreenProps = {
  onBack: () => void;
  onLogin: () => void;
  onVerify: () => void;
  onRegistered: (
    email: string,
    notice: string,
    tone: "info" | "error",
  ) => void;
};

type SignUpErrors = {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  confirmPassword?: string;
};

export function SignUpScreen({
  onBack,
  onLogin,
  onVerify,
  onRegistered,
}: SignUpScreenProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const submit = async () => {
    if (submittingRef.current) return;
    const nextErrors: SignUpErrors = {};
    const normalizedEmail = email.trim().toLowerCase();
    if (!fullName.trim()) nextErrors.fullName = "Enter your full name.";
    else if (fullName.trim().length > 120) {
      nextErrors.fullName = "Name must be 120 characters or fewer.";
    }
    if (!normalizedEmail) nextErrors.email = "Enter your email address.";
    else if (!isValidEmailAddress(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address of 254 characters or fewer.";
    }
    if (phoneNumber.trim().length > 32) {
      nextErrors.phoneNumber = "Phone number must be 32 characters or fewer.";
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      nextErrors.password = passwordError;
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password.";
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    setNotice("");
    if (Object.keys(nextErrors).length > 0) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await authApi.register({
        name: fullName.trim(),
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
        confirmPassword,
        ...(phoneNumber.trim() ? { phoneNumber: phoneNumber.trim() } : {}),
      });

      const successNotice =
        result.message ||
        "Account created. A verification code has been sent to your email.";
      onRegistered(normalizedEmail, successNotice, "info");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "EMAIL_ALREADY_EXISTS" || error.status === 409) {
          setErrors((current) => ({
            ...current,
            email: "An account with this email already exists.",
          }));
        }
        setNotice(error.message);
      } else {
        setNotice(
          "Account creation could not be completed. Please try again.",
        );
      }
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
        <Text style={styles.eyebrow}>LET’S BUILD A BETTER PUNE</Text>
        <Text style={styles.title}>Create your account.</Text>
        <Text style={styles.subtitle}>
          Join your neighbours in making every voice count.
        </Text>
      </View>
      <View style={styles.form}>
        <Field
          autoCapitalize="words"
          error={errors.fullName}
          label="Full name"
          onChangeText={(value) => {
            setFullName(value);
            setErrors((current) => ({ ...current, fullName: undefined }));
            setNotice("");
          }}
          editable={!isSubmitting}
          placeholder="How should we address you?"
          textContentType="name"
          value={fullName}
          maxLength={120}
        />
        <Field
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
          maxLength={254}
        />
        <Field
          error={errors.phoneNumber}
          keyboardType="phone-pad"
          label="Phone number (optional)"
          onChangeText={(value) => {
            setPhoneNumber(value);
            setErrors((current) => ({ ...current, phoneNumber: undefined }));
            setNotice("");
          }}
          editable={!isSubmitting}
          placeholder="+91 90000 00000"
          textContentType="telephoneNumber"
          value={phoneNumber}
          maxLength={32}
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
          placeholder="At least 8 characters (Aa, 1, #)"
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
          textContentType="newPassword"
          value={password}
          maxLength={128}
        />
        <Field
          error={errors.confirmPassword}
          label="Confirm password"
          onChangeText={(value) => {
            setConfirmPassword(value);
            setErrors((current) => ({
              ...current,
              confirmPassword: undefined,
            }));
            setNotice("");
          }}
          editable={!isSubmitting}
          placeholder="Enter your password again"
          secureTextEntry={!showPassword}
          textContentType="newPassword"
          value={confirmPassword}
          maxLength={128}
        />
        {notice ? <Notice message={notice} /> : null}
        <ActionButton
          label="Create Account"
          onPress={() => void submit()}
          loading={isSubmitting}
        />
      </View>
      <View style={styles.loginRow}>
        <Text style={styles.loginPrompt}>Already have an account?</Text>
        <TextAction label="Login" onPress={onLogin} />
      </View>
      <View style={styles.verifyRow}>
        <Text style={styles.loginPrompt}>Already received a code?</Text>
        <TextAction label="Verify email" onPress={onVerify} />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  topBar: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  heading: { marginTop: 25, marginBottom: 23 },
  eyebrow: { color: colors.emerald, fontSize: 9, fontWeight: "800", letterSpacing: 1.35 },
  title: { color: colors.ink, fontSize: 29, lineHeight: 35, fontWeight: "800", letterSpacing: -0.8, marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  form: { gap: 15 },
  showPassword: { color: colors.emerald, fontSize: 12, fontWeight: "700", paddingLeft: 8 },
  loginRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 23 },
  verifyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 13 },
  loginPrompt: { color: colors.muted, fontSize: 13 },
});
