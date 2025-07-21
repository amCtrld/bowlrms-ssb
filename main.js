const { app, BrowserWindow, session, dialog } = require('electron');
const path = require('path');

let splash;
let mainWindow;

function createWindow() {
  // Splash window
  splash = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    icon: path.join(__dirname, 'assets/bowlLogo-3.png'),
  });

  splash.loadFile('renderer/splash.html');

  // Main window
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    icon: path.join(__dirname, 'assets/bowlLogo-3.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // IMPORTANT for security
      contextIsolation: true, // IMPORTANT for security
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadURL('http://192.168.0.101:3000/login');

  // Handle geolocation permission requests
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'geolocation') {
      // Check origin for added security
      if (webContents.getURL().startsWith('http://192.168.0.101:3000')) {
        dialog
          .showMessageBox(mainWindow, {
            type: 'question',
            buttons: ['Allow', 'Deny'],
            defaultId: 0,
            cancelId: 1,
            title: 'Location Access',
            message: 'BowlRMS would like to access your location for weather information.',
          })
          .then((result) => {
            callback(result.response === 0); // 0 is "Allow"
          });
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });

  // Splash screen delay and main app loader
  const waitForMinimumSplash = new Promise((resolve) => setTimeout(resolve, 5000));
  const waitForMainApp = new Promise((resolve) => {
    mainWindow.webContents.on('did-finish-load', resolve);
  });

  Promise.all([waitForMinimumSplash, waitForMainApp]).then(() => {
    splash.close();
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const { autoUpdater } = require('electron-updater')

// Check for updates after the app is ready
app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify()
})

// Optional: update event listeners
autoUpdater.on('update-available', () => {
  console.log('Update available.')
})
autoUpdater.on('update-downloaded', () => {
  console.log('Update downloaded; will install now')
  autoUpdater.quitAndInstall()
})
autoUpdater.on('error', (err) => {
  console.error('Update error:', err)
})
