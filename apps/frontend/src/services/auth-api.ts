import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: "CITIZEN" | "ADMIN" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";
  departmentId?: string;
  departmentName?: string;
  emailVerified: boolean;
  accountStatus: "ACTIVE" | "DISABLED";
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthUser;
};

export type RegistrationInput = {
  name?: string;
  fullName?: string;
  email: string;
  password: string;
  confirmPassword?: string;
  phoneNumber?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: { code?: string };
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const REQUEST_TIMEOUT_MS = 12_000;

function getDevelopmentApiUrl(): string | undefined {
  if (Platform.OS === "web" || Platform.OS === "ios") {
    return "http://localhost:5000/api/v1";
  }

  if (Platform.OS !== "android") {
    return undefined;
  }

  if (!Device.isDevice) {
    return "http://10.0.2.2:5000/api/v1";
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    return undefined;
  }

  try {
    const host = new URL(`http://${hostUri}`).hostname;
    return `http://${host}:5000/api/v1`;
  } catch {
    return undefined;
  }
}

export function getApiBaseUrl(): string {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    (__DEV__ ? getDevelopmentApiUrl() : undefined);
  if (!configuredUrl) {
    throw new ApiError(
      "Backend URL is not configured. Set EXPO_PUBLIC_API_URL for this build, or start the Expo development server with --lan for a physical Android device.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new ApiError("EXPO_PUBLIC_API_URL must be a valid HTTP or HTTPS URL.");
  }

  const pathname = parsedUrl.pathname.replace(/\/+$/, "");
  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash ||
    pathname !== "/api/v1"
  ) {
    throw new ApiError(
      "EXPO_PUBLIC_API_URL must be a server URL ending in /api/v1, without credentials or query parameters.",
    );
  }

  return `${parsedUrl.origin}${pathname}`;
}

async function request<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    token?: string;
  } = {},
): Promise<{ data: T; message: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `${getApiBaseUrl()}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.token
            ? { Authorization: `Bearer ${options.token}` }
            : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ApiError(
          "The server took too long to respond. Check the connection and try again.",
        );
      }
      throw new ApiError(
        "Could not reach CivicAI PMC. Check that the backend is running and the API URL is reachable from this device.",
      );
    }

    let envelope: ApiEnvelope<T>;
    try {
      envelope = (await response.json()) as ApiEnvelope<T>;
    } catch {
      throw new ApiError("The server returned an unreadable response.", response.status);
    }

    if (!response.ok || envelope.success !== true) {
      throw new ApiError(
        envelope.message ?? "The request could not be completed.",
        response.status,
        envelope.error?.code,
      );
    }

    return {
      data: envelope.data as T,
      message: envelope.message ?? "Request completed successfully.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export const authApi = {
  async register(
    input: RegistrationInput,
  ): Promise<{ user: AuthUser; message: string }> {
    const response = await request<{ user: AuthUser }>("/auth/register", {
      method: "POST",
      body: input,
    });
    if (!response.data?.user?.id) {
      throw new ApiError("The server returned an incomplete registration response.");
    }
    return {
      user: response.data.user,
      message: response.message,
    };
  },

  async requestEmailCode(email: string, resend = false): Promise<string> {
    return expectNoData(
      resend ? "/auth/resend-otp" : "/auth/send-otp",
      { email },
    );
  },

  async verifyEmail(email: string, otp: string): Promise<string> {
    return expectNoData("/auth/verify-otp", { email, otp });
  },

  async login(email: string, password: string): Promise<AuthSession> {
    const response = await request<AuthSession>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (
      !response.data?.accessToken ||
      response.data.tokenType !== "Bearer" ||
      !response.data.user?.id
    ) {
      throw new ApiError("The server returned an incomplete sign-in response.");
    }
    return response.data;
  },

  async requestPasswordReset(email: string): Promise<string> {
    return expectNoData("/auth/forgot-password", { email });
  },

  async resetPassword(token: string, password: string): Promise<string> {
    return expectNoData("/auth/reset-password", { token, password });
  },

  async getCurrentUser(token: string): Promise<AuthUser> {
    const response = await request<{ user: AuthUser }>("/auth/me", { token });
    if (!response.data?.user?.id) {
      throw new ApiError("The server returned an incomplete profile response.");
    }
    return response.data.user;
  },

  async logout(token: string): Promise<string> {
    try {
      return await expectNoData("/auth/logout", undefined, token);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return "Session expired or already terminated.";
      }
      throw error;
    }
  },

  async healthCheck(): Promise<void> {
    const baseUrl = getApiBaseUrl().replace(/\/api\/v1$/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ApiError(
          "The backend is reachable but reports an unhealthy database.",
          response.status,
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (controller.signal.aborted) {
        throw new ApiError("The backend health check timed out.");
      }
      throw new ApiError(
        "Could not reach the backend health endpoint from this device.",
      );
    } finally {
      clearTimeout(timeout);
    }
  },
};

async function expectNoData(
  path: string,
  body: unknown,
  token?: string,
): Promise<string> {
  const response = await request<undefined>(path, {
    method: "POST",
    body,
    token,
  });
  return response.message;
}
