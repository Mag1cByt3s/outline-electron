const { app, BrowserWindow, protocol, ipcMain, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Enable smooth scrolling and better rendering
app.commandLine.appendSwitch('enable-smooth-scrolling');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

let mainWindow;
let isQuitting = false;

const configDir = path.join(os.homedir(), '.config', 'outline-electron');
const configPath = path.join(configDir, 'config.json');

// Register outline:// as a privileged scheme before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'outline', privileges: { secure: true, standard: true } }
]);

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  return {};
}

function saveConfig(config) {
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const existing = loadConfig();
    const merged = { ...existing, ...config };
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

function saveWindowState() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  const isMaximized = mainWindow.isMaximized();
  saveConfig({
    windowState: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized
    }
  });
}

function createWindow() {
  const config = loadConfig();
  const windowState = config.windowState || { width: 1200, height: 800 };

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width || 1200,
    height: windowState.height || 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Save window state on resize/move
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);

  if (config.instanceUrl) {
    loadOutline(config.instanceUrl);
  } else {
    mainWindow.loadFile('setup.html');
  }

  // Handle URL submission from setup page
  ipcMain.on('set-instance-url', (event, url) => {
    // Ensure URL has https:// prefix
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    // Remove trailing slash
    url = url.replace(/\/+$/, '');

    saveConfig({ instanceUrl: url });
    loadOutline(url);
  });
}

function loadOutline(instanceUrl) {
  mainWindow.loadURL(instanceUrl);

  // Inject smooth scrolling CSS
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      *, *::before, *::after {
        scroll-behavior: smooth !important;
      }
      ::-webkit-scrollbar {
        width: 10px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(128, 128, 128, 0.5);
        border-radius: 5px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(128, 128, 128, 0.7);
      }
    `);
  });

  // Handle outline:// URLs by converting to https://
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('outline://')) {
      event.preventDefault();
      const httpsUrl = url.replace('outline://', 'https://');
      mainWindow.loadURL(httpsUrl);
    }
  });

  // Handle new window requests (popups) with outline:// protocol
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('outline://')) {
      const httpsUrl = url.replace('outline://', 'https://');
      mainWindow.loadURL(httpsUrl);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

// Register as handler for outline:// protocol (for OS-level handling)
app.setAsDefaultProtocolClient('outline');

// Handle outline:// URLs opened from outside the app (Linux/Windows)
app.on('second-instance', (event, commandLine) => {
  const url = commandLine.find(arg => arg.startsWith('outline://'));
  if (url && mainWindow) {
    const httpsUrl = url.replace('outline://', 'https://');
    mainWindow.loadURL(httpsUrl);
    mainWindow.focus();
  }
});

// Handle outline:// URLs opened from outside the app (macOS)
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (url.startsWith('outline://') && mainWindow) {
    const httpsUrl = url.replace('outline://', 'https://');
    mainWindow.loadURL(httpsUrl);
  }
});

app.whenReady().then(() => {
  createWindow();

  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Change Instance',
          click: () => {
            const config = loadConfig();
            delete config.instanceUrl;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            mainWindow.loadFile('setup.html');
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find in Page',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.executeJavaScript(`
              (function() {
                let searchBar = document.getElementById('electron-find-bar');
                if (searchBar) {
                  searchBar.style.display = searchBar.style.display === 'none' ? 'flex' : 'none';
                  if (searchBar.style.display === 'flex') {
                    searchBar.querySelector('input').focus();
                    searchBar.querySelector('input').select();
                  }
                  return;
                }

                searchBar = document.createElement('div');
                searchBar.id = 'electron-find-bar';
                searchBar.innerHTML = \`
                  <input type="text" placeholder="Find in page..." style="flex:1;padding:6px 10px;border:1px solid #444;border-radius:4px;background:#1a1a2e;color:#fff;outline:none;">
                  <span id="electron-find-count" style="color:#888;font-size:12px;min-width:60px;text-align:center;">0/0</span>
                  <button id="electron-find-prev" style="padding:4px 8px;background:#333;color:#fff;border:none;border-radius:4px;cursor:pointer;">▲</button>
                  <button id="electron-find-next" style="padding:4px 8px;background:#333;color:#fff;border:none;border-radius:4px;cursor:pointer;">▼</button>
                  <button id="electron-find-close" style="padding:4px 8px;background:#333;color:#fff;border:none;border-radius:4px;cursor:pointer;">✕</button>
                \`;
                searchBar.style.cssText = 'position:fixed;top:0;left:0;right:0;display:flex;align-items:center;gap:8px;padding:8px 12px;background:#16162a;border-bottom:1px solid #333;z-index:999999;font-family:system-ui;';
                document.body.prepend(searchBar);

                const input = searchBar.querySelector('input');
                const countEl = document.getElementById('electron-find-count');
                let currentMatch = 0;
                let totalMatches = 0;

                input.focus();

                input.addEventListener('keydown', (e) => {
                  if (e.key === 'Escape') {
                    searchBar.style.display = 'none';
                    window.getSelection().removeAllRanges();
                  } else if (e.key === 'Enter') {
                    if (e.shiftKey) {
                      document.getElementById('electron-find-prev').click();
                    } else {
                      document.getElementById('electron-find-next').click();
                    }
                  }
                });

                input.addEventListener('input', () => {
                  window.find(input.value, false, false, true, false, false, false);
                  currentMatch = input.value ? 1 : 0;
                  countEl.textContent = input.value ? '1/?' : '0/0';
                });

                document.getElementById('electron-find-next').addEventListener('click', () => {
                  window.find(input.value, false, false, true, false, false, false);
                });

                document.getElementById('electron-find-prev').addEventListener('click', () => {
                  window.find(input.value, false, true, true, false, false, false);
                });

                document.getElementById('electron-find-close').addEventListener('click', () => {
                  searchBar.style.display = 'none';
                  window.getSelection().removeAllRanges();
                });
              })();
            `);
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'zoomIn', accelerator: 'CmdOrCtrl+=' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => {
            if (mainWindow.webContents.canGoBack()) {
              mainWindow.webContents.goBack();
            }
          }
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => {
            if (mainWindow.webContents.canGoForward()) {
              mainWindow.webContents.goForward();
            }
          }
        }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
