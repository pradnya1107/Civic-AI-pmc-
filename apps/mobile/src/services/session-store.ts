import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "civicai.access-token";

export const sessionStore = {
  getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  saveAccessToken(token: string): Promise<void> {
    return SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },

  clearAccessToken(): Promise<void> {
    return SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  },
};
