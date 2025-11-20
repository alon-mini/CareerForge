
import { UserProfile, ApplicationRecord, GeneratedAssets } from "../types";

// In an Electron environment with nodeIntegration: true, we can use window.require
const fs = (window as any).require ? (window as any).require('fs') : null;
const path = (window as any).require ? (window as any).require('path') : null;

const DATA_DIR_NAME = 'user_data';
const KITS_DIR_NAME = 'Kits';
const PROFILE_FILE_NAME = 'profile.md';
const HISTORY_FILE_NAME = 'applications.json'; // Changed to JSON

export const fileSystemService = {
  /**
   * Ensures the data directory exists and writes the profile content to disk.
   */
  saveProfileToDisk: (content: string) => {
    if (!fs || !path) return;

    try {
      const rootDir = (process as any).cwd();
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
      const rootDir = (process as any).cwd();
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
      const rootDir = (process as any).cwd();
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
   * Loads and parses the JSON history from user_data/Kits/applications.json
   */
  loadApplicationHistory: (): ApplicationRecord[] => {
    if (!fs || !path) return [];

    try {
      const rootDir = (process as any).cwd();
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
  }
};
