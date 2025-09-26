const { app, BrowserWindow, session, dialog, ipcMain } = require('electron');
const path = require('path');

let splash;
let mainWindow;
let connectionAttempts = 0;
const maxAttempts = 3;
const connectionTimeout = 15000; // 15 seconds per attempt
let isConnected = false;
let retryTimer;

// Function to update splash screen message
function updateSplashMessage(message) {
  if (splash && !splash.isDestroyed()) {
    splash.webContents.executeJavaScript(`
      if (document.querySelector('.connection-status')) {
        document.querySelector('.connection-status').textContent = '${message}';
      }
    `);
  }
}

// Function to handle connection attempt
function attemptConnection() {
  connectionAttempts++;
  
  if (connectionAttempts === 1) {
    updateSplashMessage('Connecting to Bowl Cloud...');
  } else {
    updateSplashMessage(`Retrying to connect (${connectionAttempts}/${maxAttempts})...`);
  }

  // Create a timeout promise for this connection attempt
  const connectionTimeoutPromise = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, connectionTimeout);

    // Clear timeout if connection succeeds
    mainWindow.webContents.once('did-finish-load', () => {
      clearTimeout(timeoutId);
      isConnected = true;
      resolve();
    });

    // Handle connection failures
    mainWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
      clearTimeout(timeoutId);
      reject(new Error(`Connection failed: ${errorDescription}`));
    });
  });

  return connectionTimeoutPromise;
}

// Function to retry connection
function retryConnection() {
  if (connectionAttempts < maxAttempts) {
    retryTimer = setTimeout(() => {
      mainWindow.reload();
      attemptConnection().catch(handleConnectionError);
    }, 2000); // Wait 2 seconds before retry
  } else {
    // Max attempts reached
    updateSplashMessage('Check your connection and try again');
    
    // Show retry button after 3 seconds
    setTimeout(() => {
      if (splash && !splash.isDestroyed()) {
        splash.webContents.executeJavaScript(`
          if (document.querySelector('.retry-section')) {
            document.querySelector('.retry-section').style.display = 'block';
          }
        `);
      }
    }, 3000);
  }
}

// Function to handle connection errors
function handleConnectionError(error) {
  console.error('Connection error:', error);
  
  if (!isConnected) {
    retryConnection();
  }
}

// Cleanup function
function cleanup() {
  if (retryTimer) {
    clearTimeout(retryTimer);
  }
}

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

  mainWindow.loadURL('https://beta.bowlrms.com/login'); // switch to bowlrms.com after bet

  // Handle geolocation permission requests
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'geolocation') {
      // Check origin for added security
      if (webContents.getURL().startsWith('https://beta.bowlrms.com')) {
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

  // Connection status management
  // Start initial connection attempt
  const waitForMinimumSplash = new Promise((resolve) => setTimeout(resolve, 5000));
  const waitForMainApp = attemptConnection().catch(handleConnectionError);

  Promise.all([waitForMinimumSplash, waitForMainApp]).then(() => {
    if (isConnected) {
      updateSplashMessage('Connected! Loading BowlRMS...');
      setTimeout(() => {
        splash.close();
        mainWindow.show();
      }, 1000);
    }
  }).catch(() => {
    // This catch handles the case where connection fails but minimum splash time is met
    console.log('Main app failed to load within minimum splash time');
  });
}

// Handle app closing events
app.on('before-quit', cleanup);

// Handle retry connection from splash screen
ipcMain.on('retry-connection', () => {
  // Reset connection attempts and try again
  connectionAttempts = 0;
  isConnected = false;
  
  if (splash && !splash.isDestroyed()) {
    // Update splash message and hide retry button
    splash.webContents.executeJavaScript(`
      if (document.querySelector('.connection-status')) {
        document.querySelector('.connection-status').textContent = 'Reconnecting...';
      }
      if (document.querySelector('.retry-section')) {
        document.querySelector('.retry-section').style.display = 'none';
      }
    `);
  }
  
  // Restart the connection process
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.reload();
    attemptConnection().catch(handleConnectionError);
  }
});

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
