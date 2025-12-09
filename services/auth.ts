
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

  writeApiKeyToDisk: (apiKey: string) => {
    const configPath = authService.getConfigFile();
    if (!configPath || !fs || !path) return;

    try {
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
      
      config = { ...config, apiKey };
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

  setApiKey: (apiKey: string, remember: boolean) => {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    if (remember) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      authService.writeApiKeyToDisk(apiKey);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      authService.removeApiKeyFromDisk();
    }
  },

  getApiKey: (): string | null => {
    const sessionKey = sessionStorage.getItem(API_KEY_STORAGE_KEY);
    if (sessionKey) return sessionKey;

    const localKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (localKey) return localKey;

    const diskKey = authService.readApiKeyFromDisk();
    if (diskKey) return diskKey;

    return null;
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
