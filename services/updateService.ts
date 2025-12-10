
// Replace this with your actual GitHub "username/repo"
const GITHUB_REPO = "alon-mini/CareerForge"; 

export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  downloadUrl: string;
}

export const updateService = {
  checkForUpdates: async (currentVersion: string): Promise<UpdateInfo> => {
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      
      if (!response.ok) {
        // Repo might be private or rate limited
        return { hasUpdate: false, latestVersion: currentVersion, downloadUrl: '' };
      }

      const data = await response.json();
      const latestTag = data.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present
      
      if (compareVersions(latestTag, currentVersion) > 0) {
        return {
          hasUpdate: true,
          latestVersion: latestTag,
          downloadUrl: data.html_url // Link to the release page
        };
      }

      return { hasUpdate: false, latestVersion: currentVersion, downloadUrl: '' };
    } catch (error) {
      console.error("Failed to check for updates:", error);
      return { hasUpdate: false, latestVersion: currentVersion, downloadUrl: '' };
    }
  }
};

// Helper: Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};
