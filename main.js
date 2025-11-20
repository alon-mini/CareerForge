const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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