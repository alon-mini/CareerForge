import { UserProfile } from "../types";

const API_KEY_STORAGE_KEY = 'careerForge_apiKey';
const PROFILE_STORAGE_KEY = 'careerForge_default_profile';

export const authService = {
  /**
   * Saves the API Key.
   * In a full Electron app with IPC, we could write this to a .env file.
   * For this implementation, localStorage provides the same persistent "remember me" experience.
   */
  setApiKey: (apiKey: string, remember: boolean) => {
    if (remember) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } else {
      sessionStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    }
  },

  getApiKey: (): string | null => {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || sessionStorage.getItem(API_KEY_STORAGE_KEY);
  },

  clearApiKey: () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    sessionStorage.removeItem(API_KEY_STORAGE_KEY);
  },

  // Since we are now single-user (Desktop App), we use a default key for the profile
  getUserProfile: (): UserProfile | null => {
    const data = localStorage.getItem(PROFILE_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },

  saveUserProfile: (profile: UserProfile) => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }
};