
const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false, // Hide initially to prevent white flash
    backgroundColor: '#0f172a', // Dark slate match for dark mode
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  win.setMenuBarVisibility(false);

  // F12 Developer Tools Handler
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Only show window when content is ready
  win.once('ready-to-show', () => {
    win.show();
  });
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

// Sync handler to get the User Data path (Roaming/AppData)
ipcMain.on('get-user-data-path', (event) => {
  event.returnValue = app.getPath('userData');
});

/**
 * SECURITY: Encryption Handlers using OS Keychain
 */
ipcMain.on('encrypt-string', (event, plainText) => {
  if (!plainText) {
    event.returnValue = '';
    return;
  }
  
  // Try OS-level encryption first (DPAPI/Keychain)
  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = safeStorage.encryptString(plainText);
      event.returnValue = buffer.toString('base64');
      return;
    } catch (error) {
      console.error("Encryption failed:", error);
    }
  }
  
  // Fallback: Simple obfuscation for environments without keychain access
  event.returnValue = Buffer.from(plainText).toString('base64');
});

ipcMain.on('decrypt-string', (event, encryptedBase64) => {
  if (!encryptedBase64) {
    event.returnValue = '';
    return;
  }

  // 1. Try OS-level decryption
  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = Buffer.from(encryptedBase64, 'base64');
      const decrypted = safeStorage.decryptString(buffer);
      event.returnValue = decrypted;
      return;
    } catch (error) {
      // Decryption failed. This happens if:
      // A) The data was stored using the fallback (base64) method originally.
      // B) The OS keychain changed.
      // We proceed to try the fallback method below.
    }
  }

  // 2. Fallback: Try simple base64 decode
  try {
    event.returnValue = Buffer.from(encryptedBase64, 'base64').toString('utf-8');
  } catch {
    // If it wasn't base64 either, return original (might be legacy plain text handled by renderer)
    event.returnValue = encryptedBase64;
  }
});

// IPC Handler for PDF Generation with Text Layer
ipcMain.handle('export-pdf', async (event, htmlContent, defaultFilename) => {
  let pdfWindow = new BrowserWindow({ 
    show: false, 
    webPreferences: { nodeIntegration: true } 
  });

  try {
    // Load the HTML content directly into the hidden window
    // encoding logic handles special characters
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    // Wait a brief moment for any fonts/styles to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfData = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 } // CSS handles the margins
    });

    // Open the Save Dialog
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: defaultFilename,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, pdfData);
      return true;
    }
    return false;

  } catch (error) {
    console.error("PDF Generation Failed:", error);
    throw error;
  } finally {
    if (pdfWindow) {
      pdfWindow.close();
      pdfWindow = null;
    }
  }
});
