import path from 'node:path';
import { URL, pathToFileURL } from 'node:url';

import { BrowserWindow, app } from 'electron';

let INDEX_PATH: string;
if (app.isPackaged) INDEX_PATH = 'index.html';
else INDEX_PATH = path.join(__dirname, `../browser/index.html`);

function createWindow() {
  const win = new BrowserWindow({
    show: false,
    width: 1600,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      devTools: !app.isPackaged,
    },
  });

  if (!app.isPackaged) win.webContents.openDevTools();

  const filter = { urls: ['*://localhost/*'] };

  win.webContents.session.webRequest.onBeforeRequest(filter, (details, callback) => {
    const requestURL = new URL(details.url);
    // The api will redirect back to '#/login-confirmed' upon Google OIDC login
    if (requestURL.hash.startsWith('#/login-confirmed')) {
      const loginConfirmedURL = pathToFileURL(INDEX_PATH);
      loginConfirmedURL.hash = requestURL.hash;
      win.loadURL(loginConfirmedURL.toString());
    } else {
      callback({ cancel: false });
    }
  });

  win.loadFile(INDEX_PATH);
  win.once('ready-to-show', win.show);
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
