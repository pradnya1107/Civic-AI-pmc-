import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { ApiError } from "./src/services/auth-api";
import { AuthenticatedScreen } from "./src/screens/AuthenticatedScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import {
  ForgotPasswordScreen,
  VerificationScreen,
} from "./src/screens/RecoveryScreens";
import { SignUpScreen } from "./src/screens/SignUpScreen";
import { SplashScreen } from "./src/screens/SplashScreen";
import { WelcomeScreen } from "./src/screens/WelcomeScreen";
import {
  authApi,
  type AuthSession,
  type AuthUser,
} from "./src/services/auth-api";
import { sessionStore } from "./src/services/session-store";

type AppScreen =
  | "splash"
  | "onboarding"
  | "welcome"
  | "login"
  | "signup"
  | "forgot-password"
  | "verify-email"
  | "authenticated";

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("splash");
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser>();
  const [accessToken, setAccessToken] = useState<string>();
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationNotice, setVerificationNotice] = useState("");
  const [verificationNoticeTone, setVerificationNoticeTone] = useState<
    "info" | "error"
  >("info");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [loginNoticeTone, setLoginNoticeTone] = useState<"error" | "success">(
    "error",
  );
  const restoredSession = useRef<
    { token: string; user: AuthUser } | undefined
  >(undefined);
  const splashFinished = useRef(false);

  const finishSplash = useCallback(() => {
    splashFinished.current = true;
    setScreen(restoredSession.current ? "authenticated" : "onboarding");
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await sessionStore.getAccessToken();
        if (token) {
          try {
            const user = await authApi.getCurrentUser(token);
            if (active) {
              restoredSession.current = { token, user };
              setAccessToken(token);
              setAuthenticatedUser(user);
            }
          } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
              await sessionStore.clearAccessToken();
            } else if (active) {
              setLoginNoticeTone("error");
              setLoginNotice(
                error instanceof ApiError
                  ? error.message
                  : "The saved session could not be checked.",
              );
            }
          }
        }
      } catch {
        if (active) {
          setLoginNoticeTone("error");
          setLoginNotice("The saved session could not be accessed securely.");
        }
      } finally {
        if (active && splashFinished.current && restoredSession.current) {
          setScreen("authenticated");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const session: AuthSession = await authApi.login(email, password);
    await sessionStore.saveAccessToken(session.accessToken);
    setAuthenticatedUser(session.user);
    setAccessToken(session.accessToken);
    setScreen("authenticated");
  };

  const handleLogout = async () => {
    if (!accessToken) {
      throw new Error("No active access token is available.");
    }
    await authApi.logout(accessToken);
    await sessionStore.clearAccessToken();
    setAuthenticatedUser(undefined);
    setAccessToken(undefined);
    restoredSession.current = undefined;
    setScreen("welcome");
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={screen === "splash" ? "light-content" : "dark-content"}
        backgroundColor={screen === "splash" ? "#071D29" : "#F7FAF8"}
      />
      {screen === "splash" ? (
        <SplashScreen onFinish={finishSplash} />
      ) : screen === "onboarding" ? (
        <OnboardingScreen onFinish={() => setScreen("welcome")} />
      ) : screen === "welcome" ? (
        <WelcomeScreen
          onLogin={() => setScreen("login")}
          onSignup={() => setScreen("signup")}
        />
      ) : screen === "login" ? (
        <LoginScreen
          onBack={() => setScreen("welcome")}
          onSignup={() => setScreen("signup")}
          onForgotPassword={() => setScreen("forgot-password")}
          onVerify={() => setScreen("verify-email")}
          onLogin={handleLogin}
          initialEmail={loginEmail}
          initialNotice={loginNotice}
          initialNoticeTone={loginNoticeTone}
        />
      ) : screen === "signup" ? (
        <SignUpScreen
          onBack={() => setScreen("welcome")}
          onLogin={() => setScreen("login")}
          onVerify={() => setScreen("verify-email")}
          onRegistered={(email, notice, tone) => {
            setVerificationEmail(email);
            setVerificationNotice(notice);
            setVerificationNoticeTone(tone);
            setScreen("verify-email");
          }}
        />
      ) : screen === "forgot-password" ? (
        <ForgotPasswordScreen onBack={() => setScreen("login")} />
      ) : screen === "verify-email" ? (
        <VerificationScreen
          onBack={() => setScreen("signup")}
          initialEmail={verificationEmail}
          initialNotice={verificationNotice}
          initialNoticeTone={verificationNoticeTone}
          onVerified={(email) => {
            setLoginEmail(email);
            setLoginNotice("Email verified. You can now sign in.");
            setLoginNoticeTone("success");
            setScreen("login");
          }}
        />
      ) : screen === "authenticated" && authenticatedUser ? (
        <AuthenticatedScreen
          user={authenticatedUser}
          token={accessToken}
          onLogout={handleLogout}
        />
      ) : (
        <WelcomeScreen
          onLogin={() => setScreen("login")}
          onSignup={() => setScreen("signup")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
