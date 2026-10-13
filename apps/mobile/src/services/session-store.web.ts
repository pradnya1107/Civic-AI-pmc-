const ACCESS_TOKEN_KEY = "civicai.access-token";
let memoryToken: string | null = null;

export const sessionStore = {
  async getAccessToken(): Promise<string | null> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(ACCESS_TOKEN_KEY);
      }
    } catch {
      // In private browsing or restricted environments, fallback to memory
    }
    return memoryToken;
  },

  async saveAccessToken(token: string): Promise<void> {
    memoryToken = token;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
      }
    } catch {
      // ignore storage write errors
    }
  },

  async clearAccessToken(): Promise<void> {
    memoryToken = null;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    } catch {
      // ignore storage deletion errors
    }
  },
};

