const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Allowed for local desktop apps without complex preload
    },
    icon: path.join(__dirname, 'icon.png') // Optional: assumes icon exists, otherwise defaults
  });

  // In production, this would load the built index.html.
  // For this setup, we load the local index.html
  win.loadFile('index.html');
  
  // Remove menu for a cleaner look
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});