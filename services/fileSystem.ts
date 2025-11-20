
import { UserProfile, ApplicationRecord, GeneratedAssets } from "../types";

// In an Electron environment with nodeIntegration: true, we can use window.require
const fs = (window as any).require ? (window as any).require('fs') : null;
const path = (window as any).require ? (window as any).require('path') : null;

const DATA_DIR_NAME = 'user_data';
const KITS_DIR_NAME = 'Kits';
const PROFILE_FILE_NAME = 'profile.md';
const HISTORY_FILE_NAME = 'applications.csv';

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
   * Appends an application record to the CSV file.
   * We use Base64 encoding for the heavy content fields to avoid CSV parsing issues with newlines/commas.
   * Saves to user_data/Kits/applications.csv
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

      // CSV Columns: ID, Date, Title, Company, B64_Assets
      // We serialize the entire assets object to JSON then Base64 it for the single column
      const assetsB64 = btoa(JSON.stringify(record.assets));
      
      // Escape logic for standard fields (just in case they have commas)
      const escape = (txt: string) => `"${txt.replace(/"/g, '""')}"`;
      
      const row = `${escape(record.id)},${escape(record.date)},${escape(record.title)},${escape(record.company)},${assetsB64}\n`;

      // Add header if file doesn't exist
      if (!fs.existsSync(filePath)) {
        const header = `ID,Date,Title,Company,AssetsPayload\n`;
        fs.writeFileSync(filePath, header + row, 'utf-8');
      } else {
        fs.appendFileSync(filePath, row, 'utf-8');
      }
    } catch (error) {
      console.error("Failed to save application history:", error);
    }
  },

  /**
   * Loads and parses the CSV history from user_data/Kits/applications.csv
   */
  loadApplicationHistory: (): ApplicationRecord[] => {
    if (!fs || !path) return [];

    try {
      const rootDir = (process as any).cwd();
      const filePath = path.join(rootDir, DATA_DIR_NAME, KITS_DIR_NAME, HISTORY_FILE_NAME);

      if (!fs.existsSync(filePath)) return [];

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim() !== '');
      
      // Skip header
      if (lines.length <= 1) return [];
      
      const records: ApplicationRecord[] = [];

      // Simple CSV parser (assumes our specific format)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        
        if (parts && parts.length >= 5) {
           const id = parts[0].replace(/^"|"$/g, '').replace(/""/g, '"');
           const date = parts[1].replace(/^"|"$/g, '').replace(/""/g, '"');
           const title = parts[2].replace(/^"|"$/g, '').replace(/""/g, '"');
           const company = parts[3].replace(/^"|"$/g, '').replace(/""/g, '"');
           const assetsB64 = parts[4]; 

           try {
             const assetsJson = atob(assetsB64);
             const assets = JSON.parse(assetsJson) as GeneratedAssets;
             records.push({ id, date, title, company, assets });
           } catch (e) {
             console.warn("Failed to parse row assets", e);
           }
        }
      }

      // Return newest first
      return records.reverse();
    } catch (error) {
      console.error("Failed to load history:", error);
      return [];
    }
  }
};
