import { UserProfile } from "../types";

const API_KEY_STORAGE_KEY = 'careerForge_apiKey';
const PROFILE_STORAGE_KEY = 'careerForge_default_profile';

// Electron Node Integration imports
const fs = (window as any).require ? (window as any).require('fs') : null;
const path = (window as any).require ? (window as any).require('path') : null;

const ENV_VAR_NAME = 'GEMINI_API_KEY';

export const authService = {
  
  getEnvFilePath: (): string | null => {
    if (!path || !(process as any).cwd) return null;
    // We write to the root directory of the application
    return path.join((process as any).cwd(), '.env');
  },

  writeApiKeyToEnv: (apiKey: string) => {
    const envPath = authService.getEnvFilePath();
    if (!envPath || !fs) return;

    try {
      let fileContent = '';
      if (fs.existsSync(envPath)) {
        fileContent = fs.readFileSync(envPath, 'utf-8');
      }

      const lines = fileContent.split('\n');
      // Remove existing key if present
      const filteredLines = lines.filter(line => !line.trim().startsWith(`${ENV_VAR_NAME}=`));
      
      // Add new key
      filteredLines.push(`${ENV_VAR_NAME}=${apiKey}`);
      
      // Write back
      fs.writeFileSync(envPath, filteredLines.join('\n').trim(), 'utf-8');
      console.log(`Saved API Key to ${envPath}`);
    } catch (error) {
      console.error("Failed to write API key to .env file:", error);
    }
  },

  readApiKeyFromEnv: (): string | null => {
    const envPath = authService.getEnvFilePath();
    if (!envPath || !fs || !fs.existsSync(envPath)) return null;

    try {
      const fileContent = fs.readFileSync(envPath, 'utf-8');
      const lines = fileContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith(`${ENV_VAR_NAME}=`)) {
           // Extract value, handling potential quotes
           let val = trimmed.substring(`${ENV_VAR_NAME}=`.length).trim();
           if (val.startsWith('"') && val.endsWith('"')) {
             val = val.slice(1, -1);
           }
           return val;
        }
      }
    } catch (error) {
      console.error("Failed to read API key from .env file:", error);
    }
    return null;
  },

  removeApiKeyFromEnv: () => {
    const envPath = authService.getEnvFilePath();
    if (!envPath || !fs || !fs.existsSync(envPath)) return;

    try {
      const fileContent = fs.readFileSync(envPath, 'utf-8');
      const lines = fileContent.split('\n');
      const filteredLines = lines.filter(line => !line.trim().startsWith(`${ENV_VAR_NAME}=`));
      fs.writeFileSync(envPath, filteredLines.join('\n').trim(), 'utf-8');
    } catch (error) {
      console.error("Failed to remove API key from .env file:", error);
    }
  },

  setApiKey: (apiKey: string, remember: boolean) => {
    // Always keep in session for current run
    sessionStorage.setItem(API_KEY_STORAGE_KEY, apiKey);

    if (remember) {
      // Backup to localStorage
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      // Write to .env file for cold boot persistence (Desktop App)
      authService.writeApiKeyToEnv(apiKey);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      authService.removeApiKeyFromEnv();
    }
  },

  getApiKey: (): string | null => {
    // 1. Check Session (fastest, current tab)
    const sessionKey = sessionStorage.getItem(API_KEY_STORAGE_KEY);
    if (sessionKey) return sessionKey;

    // 2. Check LocalStorage (browser persistence)
    const localKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (localKey) return localKey;

    // 3. Check .env file (disk persistence for desktop app)
    const envKey = authService.readApiKeyFromEnv();
    if (envKey) {
        return envKey;
    }

    return null;
  },

  clearApiKey: () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    sessionStorage.removeItem(API_KEY_STORAGE_KEY);
    authService.removeApiKeyFromEnv();
  },

  getUserProfile: (): UserProfile | null => {
    const data = localStorage.getItem(PROFILE_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },

  saveUserProfile: (profile: UserProfile) => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }
};
