
import { UserProfile } from "../types";

const API_KEY_STORAGE_KEY = 'careerForge_apiKey';
const PROFILE_STORAGE_KEY = 'careerForge_default_profile';

// Electron Node Integration imports with safe fallbacks
let fs: any = null;
let path: any = null;
let ipcRenderer: any = null;

try {
  if ((window as any).require) {
    fs = (window as any).require('fs');
    path = (window as any).require('path');
    const electron = (window as any).require('electron');
    ipcRenderer = electron ? electron.ipcRenderer : null;
  }
} catch (e) {
  console.warn("Electron modules not available.");
}

const CONFIG_FILE = 'config.json';
const DATA_DIR_NAME = 'user_data';

// --- Encryption Helpers ---

const encryptValue = (value: string): string => {
  if (!value) return '';
  
  if (ipcRenderer) {
    try {
      // Use OS-level encryption via Main process
      // This returns a Base64 string of the encrypted buffer
      return ipcRenderer.sendSync('encrypt-string', value);
    } catch (e) {
      console.error("Encryption IPC failed", e);
      return btoa(value); // Fallback
    }
  }
  
  // Web Fallback: Simple obfuscation
  return btoa(value);
};

const decryptValue = (value: string): string => {
  if (!value) return '';

  // MIGRATION CHECK: Legacy keys are plain text starting with AIza.
  // We return them as-is so the user doesn't get logged out.
  // They will be encrypted next time the user logs in/saves.
  if (value.startsWith('AIza')) {
    return value;
  }
  
  if (ipcRenderer) {
    try {
      const decrypted = ipcRenderer.sendSync('decrypt-string', value);
      if (decrypted) return decrypted;
    } catch (e) {
      console.error("Decryption IPC failed", e);
    }
  }

  // Web Fallback / Last Resort
  try {
    return atob(value);
  } catch {
    return value; // Should theoretically not happen if flow is correct
  }
};

// --------------------------

export const authService = {
  
  getUserDataPath: (): string | null => {
    if (!ipcRenderer) return null;
    try {
        return ipcRenderer.sendSync('get-user-data-path');
    } catch {
        return null;
    }
  },

  getConfigFile: (): string | null => {
    const root = authService.getUserDataPath();
    if (!root || !path) return null;
    return path.join(root, DATA_DIR_NAME, CONFIG_FILE);
  },

  /**
   * Writes the API key to disk.
   * NOTE: The apiKey passed here MUST be already encrypted if intended for secure storage.
   * `setApiKey` handles the encryption flow before calling this.
   */
  writeApiKeyToDisk: (encryptedApiKey: string) => {
    const configPath = authService.getConfigFile();
    if (!configPath || !fs || !path) return;

    try {
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
      
      config = { ...config, apiKey: encryptedApiKey };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error("Failed to write config:", error);
    }
  },

  readApiKeyFromDisk: (): string | null => {
    const configPath = authService.getConfigFile();
    if (!configPath || !fs || !fs.existsSync(configPath)) return null;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.apiKey || null;
    } catch (error) {
      console.error("Failed to read config:", error);
    }
    return null;
  },

  removeApiKeyFromDisk: () => {
    const configPath = authService.getConfigFile();
    if (!configPath || !fs || !fs.existsSync(configPath)) return;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      delete config.apiKey;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error("Failed to update config:", error);
    }
  },

  setApiKey: (plainTextApiKey: string, remember: boolean) => {
    // 1. Encrypt the key immediately using OS Keychain or fallback
    const encryptedKey = encryptValue(plainTextApiKey);

    // 2. Store encrypted version in session (runtime)
    sessionStorage.setItem(API_KEY_STORAGE_KEY, encryptedKey);

    if (remember) {
      // 3. Store encrypted version in local storage (persistence)
      localStorage.setItem(API_KEY_STORAGE_KEY, encryptedKey);
      // 4. Store encrypted version on disk (file system)
      authService.writeApiKeyToDisk(encryptedKey);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      authService.removeApiKeyFromDisk();
    }
  },

  getApiKey: (): string | null => {
    // 1. Retrieve the stored value (which is likely encrypted, or legacy plain text)
    let storedValue = sessionStorage.getItem(API_KEY_STORAGE_KEY);

    if (!storedValue) {
        storedValue = localStorage.getItem(API_KEY_STORAGE_KEY);
    }

    if (!storedValue) {
        storedValue = authService.readApiKeyFromDisk();
    }

    if (!storedValue) return null;

    // 2. Decrypt it to get the plain text key for the app to use
    return decryptValue(storedValue);
  },

  clearApiKey: () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    sessionStorage.removeItem(API_KEY_STORAGE_KEY);
    authService.removeApiKeyFromDisk();
  },

  getUserProfile: (): UserProfile | null => {
    const data = localStorage.getItem(PROFILE_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },

  saveUserProfile: (profile: UserProfile) => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }
};
