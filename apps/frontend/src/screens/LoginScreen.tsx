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
import { departmentAdminApi } from "../services/department-admin-api";

type LoginScreenProps = {
  onBack: () => void;
  onSignup: () => void;
  onForgotPassword: () => void;
  onVerify?: () => void;
  onLogin: (email: string, password: string, otp?: string) => Promise<any>;
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

  // Department Admin OTP confirmation state
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpDepartmentName, setOtpDepartmentName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendingOtp, setResendingOtp] = useState(false);
  const [resendNotice, setResendNotice] = useState("");

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
      const res = await onLogin(normalizedEmail.toLowerCase(), password);
      if (res && res.requiresOtp) {
        setIsOtpStep(true);
        setOtpDepartmentName(res.departmentName || "Department");
        setNotice(
          "🔒 Security OTP Generated: A 6-digit confirmation OTP has been printed to the backend terminal. Enter it below to complete sign in.",
        );
        return;
      }
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

  const submitOtp = async () => {
    if (submittingRef.current) return;
    const cleaned = otpCode.trim();
    if (!cleaned) {
      setOtpError("Enter the 6-digit OTP printed in your backend terminal.");
      return;
    }
    if (!/^\d{6}$/.test(cleaned)) {
      setOtpError("OTP must be exactly 6 digits.");
      return;
    }

    setOtpError("");
    setNotice("");
    setResendNotice("");
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onLogin(email.trim().toLowerCase(), password, cleaned);
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? error.message
          : "OTP verification failed. Please check your backend terminal.",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setResendingOtp(true);
    setResendNotice("");
    setNotice("");
    try {
      await departmentAdminApi.resendDepartmentAdminOtp(email.trim().toLowerCase());
      setResendNotice("✓ A fresh 6-digit OTP has been printed to your backend terminal.");
    } catch (err: any) {
      setNotice(err?.message || "Failed to resend OTP to terminal.");
    } finally {
      setResendingOtp(false);
    }
  };

  if (isOtpStep) {
    return (
      <Page>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setIsOtpStep(false);
              setOtpCode("");
              setNotice("");
              setResendNotice("");
            }}
            hitSlop={8}
          >
            <Text style={styles.back}>‹  Back to Login</Text>
          </Pressable>
          <CivicLogo compact />
        </View>

        <View style={styles.heading}>
          <View style={styles.terminalBadge}>
            <Text style={styles.terminalBadgeText}>
              🏛️ {otpDepartmentName ? otpDepartmentName.toUpperCase() : "DEPARTMENT ADMIN"}
            </Text>
          </View>
          <Text style={styles.title}>Confirm Login</Text>
          <Text style={styles.subtitle}>
            A 6-digit confirmation OTP has been printed to the running backend terminal for{" "}
            <Text style={{ fontWeight: "700", color: colors.ink }}>{email}</Text>.
            Enter the OTP below to confirm your account and access the department console.
          </Text>
        </View>

        <View style={styles.terminalBannerCard}>
          <Text style={styles.terminalBannerTitle}>💻 TERMINAL DISPATCH ACTIVE</Text>
          <Text style={styles.terminalBannerText}>
            Look at the terminal window running <Text style={{ fontFamily: "monospace", fontWeight: "700" }}>pnpm dev</Text>.
            Copy the 6-digit OTP from the banner and enter it below.
          </Text>
        </View>

        <View style={styles.form}>
          <Field
            error={otpError}
            label="Enter 6-digit Terminal OTP"
            onChangeText={(value) => {
              setOtpCode(value);
              setOtpError("");
              setNotice("");
            }}
            editable={!isSubmitting}
            placeholder="e.g. 549102"
            maxLength={6}
            keyboardType="number-pad"
            value={otpCode}
          />

          {notice ? (
            <Notice message={notice} tone="error" />
          ) : null}

          {resendNotice ? (
            <Notice message={resendNotice} tone="success" />
          ) : null}

          <ActionButton
            label="Verify & Access Dashboard"
            onPress={submitOtp}
            loading={isSubmitting}
          />

          <View style={{ marginTop: 8 }}>
            <ActionButton
              label={resendingOtp ? "Sending to Terminal..." : "Resend OTP to Terminal"}
              onPress={handleResendOtp}
              loading={resendingOtp}
              secondary
            />
          </View>
        </View>

        <View style={styles.signupRow}>
          <TextAction
            label="‹ Sign in with different credentials"
            onPress={() => {
              setIsOtpStep(false);
              setOtpCode("");
              setNotice("");
              setResendNotice("");
            }}
          />
        </View>
      </Page>
    );
  }

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
  terminalBadge: {
    backgroundColor: "#DBEAFE",
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  terminalBadgeText: {
    color: "#1E40AF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  terminalBannerCard: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.emerald,
  },
  terminalBannerTitle: {
    color: "#34D399",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  terminalBannerText: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 18,
  },
});
