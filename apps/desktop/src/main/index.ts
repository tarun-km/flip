/**
 * Electron main process — the trusted broker (docs/02-SYSTEM-ARCHITECTURE.md
 * section 4). Owns window/tray lifecycle, IPC validation, hotkeys, and hosts
 * the local agent runtime.
 *
 * Baseline simplification: the agent runtime runs in this process rather
 * than a separate Node utility process (tracked follow-up — see
 * apps/desktop/README.md).
 */
import { app, globalShortcut, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KlipAgentRuntime } from '@klip/agent-runtime';
import { SetExpandedSchema } from '@klip/contracts';
import { createCompanionWindow, resizeAndReposition } from './window.js';
import { registerIpcHandlers } from './ipc.js';
import { createTray } from './tray.js';
import { ElectronOpener } from './electronOpener.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let expanded = false;

app.whenReady().then(async () => {
  const runtime = new KlipAgentRuntime({
    dataDir: path.join(app.getPath('userData'), 'klip-data'),
    opener: new ElectronOpener(),
  });
  await runtime.init();

  const preloadPath = path.join(__dirname, '../preload/index.js');
  const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
  const rendererFile = path.join(__dirname, '../renderer/index.html');

  const win = createCompanionWindow(preloadPath, devServerUrl ?? null, devServerUrl ? null : rendererFile);

  if (devServerUrl) {
    win.webContents.on('console-message', (_evt, level, message, line, sourceId) => {
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
    });
    win.webContents.on('did-fail-load', (_evt, code, description) => {
      console.log(`[renderer] did-fail-load ${code} ${description}`);
    });
    win.webContents.openDevTools({ mode: 'detach' });
  }

  registerIpcHandlers(runtime, () => win);

  const toggleExpanded = () => {
    expanded = !expanded;
    resizeAndReposition(win, expanded);
    win.webContents.send('klip:expanded-changed', expanded);
    if (expanded) win.focus();
  };

  ipcMain.handle('klip:setExpanded', async (_evt, raw) => {
    const input = SetExpandedSchema.parse(raw);
    expanded = input.expanded;
    resizeAndReposition(win, expanded);
    return { expanded };
  });

  createTray(win, runtime, toggleExpanded);

  // Global hotkey toggles the panel even when collapsed (docs/03-SRS.md FR-U-03).
  globalShortcut.register('CommandOrControl+Shift+K', toggleExpanded);
  // Explicit stop control reachable even when the panel is collapsed (docs/09 section 10).
  globalShortcut.register('CommandOrControl+Shift+Escape', () => {
    win.webContents.send('klip:stop-requested');
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
