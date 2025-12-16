
import { UserProfile, ApplicationRecord, GeneratedAssets, UsageLog, TokenStats } from "../types";

// In an Electron environment with nodeIntegration: true, we can use window.require
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

const DATA_DIR_NAME = 'user_data';
const KITS_DIR_NAME = 'Kits';
const PROFILE_FILE_NAME = 'profile.md';
const HISTORY_FILE_NAME = 'applications.json';
const USAGE_FILE_NAME = 'usage.json';

// Helper to get the Safe storage path (AppData)
const getStoragePath = () => {
  if (!ipcRenderer) return null;
  try {
    // Ask main process for %APPDATA%/CareerForge
    const userDataPath = ipcRenderer.sendSync('get-user-data-path');
    return userDataPath;
  } catch (e) {
    // Fallback for dev mode outside electron
    return (process as any).cwd ? (process as any).cwd() : null;
  }
};

export const fileSystemService = {
  /**
   * Ensures the data directory exists and writes the profile content to disk.
   */
  saveProfileToDisk: (content: string) => {
    if (!fs || !path) return;

    try {
      const rootDir = getStoragePath();
      if (!rootDir) return;
      
      const dataDir = path.join(rootDir, DATA_DIR_NAME);

      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const filePath = path.join(dataDir, PROFILE_FILE_NAME);
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Profile saved to ${filePath}`);
    } catch (error) {
      console.error("Failed to save profile to disk:", error);
    }
  },

  /**
   * Checks for the existence of the profile file and reads it.
   */
  loadProfileFromDisk: (): UserProfile | null => {
    if (!fs || !path) return null;

    try {
      const rootDir = getStoragePath();
      if (!rootDir) return null;

      const filePath = path.join(rootDir, DATA_DIR_NAME, PROFILE_FILE_NAME);

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return {
          content,
          fileName: PROFILE_FILE_NAME
        };
      }
    } catch (error) {
      console.error("Failed to load profile from disk:", error);
    }
    return null;
  },

  /**
   * Appends an application record to the JSON file.
   * Reads the existing array, pushes new record, writes back.
   * Saves to user_data/Kits/applications.json
   */
  saveApplicationToHistory: (record: ApplicationRecord) => {
    if (!fs || !path) return;

    try {
      const rootDir = getStoragePath();
      if (!rootDir) return;

      const kitsDir = path.join(rootDir, DATA_DIR_NAME, KITS_DIR_NAME);
      
      if (!fs.existsSync(kitsDir)) {
        fs.mkdirSync(kitsDir, { recursive: true });
      }

      const filePath = path.join(kitsDir, HISTORY_FILE_NAME);
      
      let history: ApplicationRecord[] = [];

      // Load existing if available
      if (fs.existsSync(filePath)) {
        try {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          history = JSON.parse(fileContent);
          if (!Array.isArray(history)) history = [];
        } catch (e) {
          console.warn("Could not parse existing history, starting fresh.");
          history = [];
        }
      }

      // Add new record
      history.push(record);

      // Write back
      fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8');
      console.log(`Application history saved to ${filePath}`);
      
    } catch (error) {
      console.error("Failed to save application history:", error);
    }
  },

  /**
   * Updates a specific application record in the history file.
   */
  updateApplicationInHistory: (updatedRecord: ApplicationRecord) => {
    if (!fs || !path) return;

    try {
      const rootDir = getStoragePath();
      if (!rootDir) return;

      const filePath = path.join(rootDir, DATA_DIR_NAME, KITS_DIR_NAME, HISTORY_FILE_NAME);

      if (!fs.existsSync(filePath)) return;

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      let history: ApplicationRecord[] = JSON.parse(fileContent);

      if (!Array.isArray(history)) return;

      // Find and replace
      const index = history.findIndex(r => r.id === updatedRecord.id);
      if (index !== -1) {
        history[index] = updatedRecord;
        fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8');
        console.log(`Updated application ${updatedRecord.id}`);
      }
    } catch (error) {
      console.error("Failed to update application history:", error);
    }
  },

  /**
   * Deletes an application from the history file.
   */
  deleteApplicationFromHistory: (id: string) => {
    if (!fs || !path) return;

    try {
      const rootDir = getStoragePath();
      if (!rootDir) return;

      const filePath = path.join(rootDir, DATA_DIR_NAME, KITS_DIR_NAME, HISTORY_FILE_NAME);

      if (!fs.existsSync(filePath)) return;

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      let history: ApplicationRecord[] = JSON.parse(fileContent);

      if (!Array.isArray(history)) return;

      const newHistory = history.filter(r => r.id !== id);
      fs.writeFileSync(filePath, JSON.stringify(newHistory, null, 2), 'utf-8');
      console.log(`Deleted application ${id}`);
    } catch (error) {
      console.error("Failed to delete application:", error);
    }
  },

  /**
   * Loads and parses the JSON history from user_data/Kits/applications.json
   */
  loadApplicationHistory: (): ApplicationRecord[] => {
    if (!fs || !path) return [];

    try {
      const rootDir = getStoragePath();
      if (!rootDir) return [];

      const filePath = path.join(rootDir, DATA_DIR_NAME, KITS_DIR_NAME, HISTORY_FILE_NAME);

      if (!fs.existsSync(filePath)) return [];

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const history = JSON.parse(fileContent);

      if (!Array.isArray(history)) return [];

      // Return newest first
      return history.reverse();
    } catch (error) {
      console.error("Failed to load history:", error);
      return [];
    }
  },

  /**
   * Saves an API usage log to usage.json
   */
  saveUsageLog: (log: UsageLog) => {
    if (!fs || !path) return;

    try {
      const rootDir = getStoragePath();
      if (!rootDir) return;
      
      const dataDir = path.join(rootDir, DATA_DIR_NAME);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

      const filePath = path.join(dataDir, USAGE_FILE_NAME);
      let logs: UsageLog[] = [];

      if (fs.existsSync(filePath)) {
         try {
           logs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
         } catch { logs = []; }
      }

      logs.push(log);
      fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (e) {
      console.error("Failed to log usage:", e);
    }
  },

  /**
   * Reads usage.json and calculates stats
   */
  getUsageStats: (): TokenStats => {
     if (!fs || !path) {
         return { totalTokens: 0, totalCost: 0, requestCount: 0, modelBreakdown: {} };
     }

     try {
        const rootDir = getStoragePath();
        if (!rootDir) return { totalTokens: 0, totalCost: 0, requestCount: 0, modelBreakdown: {} };
        
        const filePath = path.join(rootDir, DATA_DIR_NAME, USAGE_FILE_NAME);
        if (!fs.existsSync(filePath)) return { totalTokens: 0, totalCost: 0, requestCount: 0, modelBreakdown: {} };

        const logs: UsageLog[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        const stats: TokenStats = {
            totalTokens: 0,
            totalCost: 0,
            requestCount: logs.length,
            modelBreakdown: {}
        };

        logs.forEach(log => {
            stats.totalTokens += log.totalTokens;
            stats.totalCost += log.cost;
            
            if (!stats.modelBreakdown[log.model]) {
                stats.modelBreakdown[log.model] = { tokens: 0, cost: 0 };
            }
            stats.modelBreakdown[log.model].tokens += log.totalTokens;
            stats.modelBreakdown[log.model].cost += log.cost;
        });

        return stats;

     } catch (e) {
         console.error("Failed to get usage stats:", e);
         return { totalTokens: 0, totalCost: 0, requestCount: 0, modelBreakdown: {} };
     }
  }
};
