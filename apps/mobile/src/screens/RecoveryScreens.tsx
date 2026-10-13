import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ActionButton,
  Field,
  Notice,
  Page,
  TextAction,
} from "../components/Controls";
import { CivicLogo } from "../components/CivicLogo";
import { colors } from "../theme";
import { isValidEmailAddress } from "../utils/form-validation";
import { ApiError, authApi } from "../services/auth-api";

type ScreenProps = { onBack: () => void };
type VerificationScreenProps = ScreenProps & {
  initialEmail?: string;
  initialNotice?: string;
  initialNoticeTone?: "info" | "error";
  onVerified: (email: string) => void;
};

export function ForgotPasswordScreen({ onBack }: ScreenProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noticeSuccess, setNoticeSuccess] = useState(false);
  const submittingRef = useRef(false);

  const submit = async () => {
    if (submittingRef.current) return;
    const normalizedEmail = email.trim();
    if (!isValidEmailAddress(normalizedEmail)) {
      setError("Enter a valid email address of 254 characters or fewer.");
      setNotice("");
      setNoticeSuccess(false);
      return;
    }
    setError("");
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      setNotice(await authApi.requestPasswordReset(normalizedEmail.toLowerCase()));
      setNoticeSuccess(true);
    } catch (requestError) {
      setNotice(
        requestError instanceof ApiError
          ? requestError.message
          : "Password recovery could not be requested. Please try again.",
      );
      setNoticeSuccess(false);
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
      <View style={styles.icon}>
        <Text style={styles.iconText}>↗</Text>
      </View>
      <Text style={styles.eyebrow}>ACCOUNT RECOVERY</Text>
      <Text style={styles.title}>A fresh start.</Text>
      <Text style={styles.body}>
        Enter the email linked to your account. We’ll help you get back to your
        CivicAI community.
      </Text>
      <View style={styles.form}>
        <Field
          error={error}
          keyboardType="email-address"
          label="Email address"
          onChangeText={(value) => {
            setEmail(value);
            setError("");
            setNotice("");
            setNoticeSuccess(false);
          }}
          editable={!isSubmitting}
          placeholder="you@example.com"
          textContentType="emailAddress"
          value={email}
        />
        {notice ? (
          <Notice
            message={notice}
            tone={noticeSuccess ? "info" : "error"}
          />
        ) : null}
        <ActionButton
          label="Continue"
          onPress={() => void submit()}
          loading={isSubmitting}
        />
      </View>
      <TextAction label="Return to login" onPress={onBack} />
    </Page>
  );
}

export function VerificationScreen({
  onBack,
  initialEmail = "",
  initialNotice,
  initialNoticeTone = "info",
  onVerified,
}: VerificationScreenProps) {
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<{ email?: string; otp?: string }>({});
  const [notice, setNotice] = useState(initialNotice ?? "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [noticeTone, setNoticeTone] = useState<"info" | "error">(
    initialNoticeTone,
  );
  const verifyingRef = useRef(false);
  const resendingRef = useRef(false);

  const submit = async () => {
    if (verifyingRef.current || resendingRef.current) return;
    const nextErrors: typeof errors = {};
    if (!isValidEmailAddress(email)) {
      nextErrors.email = "Enter a valid email address of 254 characters or fewer.";
    }
    if (!/^\d{6}$/.test(otp)) {
      nextErrors.otp = "Enter the 6-digit code from your email.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    verifyingRef.current = true;
    setNotice("");
    setNoticeTone("error");
    setIsVerifying(true);
    try {
      await authApi.verifyEmail(email.trim().toLowerCase(), otp);
      onVerified(email.trim().toLowerCase());
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? error.message
          : "Email verification could not be completed. Please try again.",
      );
    } finally {
      verifyingRef.current = false;
      setIsVerifying(false);
    }
  };

  const resend = async () => {
    if (resendingRef.current || verifyingRef.current) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmailAddress(normalizedEmail)) {
      setErrors((current) => ({
        ...current,
        email: "Enter a valid email address of 254 characters or fewer.",
      }));
      return;
    }

    resendingRef.current = true;
    setNotice("");
    setNoticeTone("error");
    setIsResending(true);
    try {
      setNotice(await authApi.requestEmailCode(normalizedEmail, true));
      setNoticeTone("info");
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? error.message
          : "A verification code could not be requested. Please try again.",
      );
    } finally {
      resendingRef.current = false;
      setIsResending(false);
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
      <View style={styles.icon}>
        <Text style={styles.iconText}>✳</Text>
      </View>
      <Text style={styles.eyebrow}>ONE LAST STEP</Text>
      <Text style={styles.title}>Verify your email.</Text>
      <Text style={styles.body}>
        Enter your email and the 6-digit verification code to continue.
      </Text>
      <View style={styles.form}>
        <Field
          error={errors.email}
          keyboardType="email-address"
          label="Email address"
          onChangeText={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined }));
            setNotice("");
          }}
          editable={!isVerifying && !isResending}
          placeholder="you@example.com"
          textContentType="emailAddress"
          value={email}
        />
        <Field
          error={errors.otp}
          keyboardType="number-pad"
          label="Verification code"
          onChangeText={(value) => {
            setOtp(value.replace(/\D/g, "").slice(0, 6));
            setErrors((current) => ({ ...current, otp: undefined }));
            setNotice("");
          }}
          editable={!isVerifying && !isResending}
          placeholder="000000"
          value={otp}
          maxLength={6}
        />
        {notice ? (
          <Notice
            message={notice}
            tone={noticeTone}
          />
        ) : null}
        <ActionButton
          label="Verify email"
          onPress={() => void submit()}
          loading={isVerifying}
          disabled={isResending}
        />
        <ActionButton
          label="Resend code"
          onPress={() => void resend()}
          secondary
          loading={isResending}
          disabled={isVerifying}
        />
      </View>
      <TextAction label="Return to account" onPress={onBack} />
    </Page>
  );
}

const styles = StyleSheet.create({
  topBar: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
  back: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  icon: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#E3F4EC", alignItems: "center", justifyContent: "center", marginBottom: 23 },
  iconText: { color: colors.emerald, fontSize: 25, fontWeight: "700" },
  eyebrow: { color: colors.emerald, fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 31, fontWeight: "800", letterSpacing: -0.8, marginTop: 9 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 25 },
  form: { gap: 18, marginBottom: 25 },
});
