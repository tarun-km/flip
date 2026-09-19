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
import { KlipAgentRuntime, AnthropicCognitionPort } from '@klip/agent-runtime';
import { SetExpandedSchema, SetApiKeySchema, DeleteApiKeySchema, SetShortcutSchema } from '@klip/contracts';
import { createCompanionWindow, resizeAndReposition } from './window.js';
import { registerIpcHandlers } from './ipc.js';
import { createTray } from './tray.js';
import { ElectronOpener } from './electronOpener.js';
import { getApiKey, setApiKey, deleteApiKey, getKeyStatus, isEncryptionAvailable } from './keyStore.js';
import { loadSettings, saveSettings } from './settingsStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let expanded = false;

app.whenReady().then(async () => {
  const settings = loadSettings();

  const runtime = new KlipAgentRuntime({
    dataDir: path.join(app.getPath('userData'), 'klip-data'),
    opener: new ElectronOpener(),
    // Real reasoning today via a direct Anthropic key, if the user adds one
    // in Settings — falls back to the honest NullCognitionPort otherwise.
    // See packages/agent-runtime/src/agents/anthropicCognitionPort.ts for
    // why this is an interim path, not the docs/08 AWS-metered proxy.
    cognition: new AnthropicCognitionPort({ getApiKey: () => getApiKey('anthropic') }),
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

  // ── API key management (encrypted local storage, see keyStore.ts) ──────
  ipcMain.handle('klip:getKeyStatus', async () => ({ ...getKeyStatus(), encryptionAvailable: isEncryptionAvailable() }));
  ipcMain.handle('klip:setApiKey', async (_evt, raw) => {
    const input = SetApiKeySchema.parse(raw);
    setApiKey(input.name, input.apiKey);
    return { ...getKeyStatus(), encryptionAvailable: isEncryptionAvailable() };
  });
  ipcMain.handle('klip:deleteApiKey', async (_evt, raw) => {
    const input = DeleteApiKeySchema.parse(raw);
    deleteApiKey(input.name);
    return { ...getKeyStatus(), encryptionAvailable: isEncryptionAvailable() };
  });

  // ── Customizable expand/collapse hotkey ─────────────────────────────────
  let currentAccelerator = settings.expandAccelerator;
  const registerExpandHotkey = (accelerator: string) => {
    try {
      globalShortcut.unregister(currentAccelerator);
    } catch {
      /* may already be unregistered */
    }
    const ok = globalShortcut.register(accelerator, toggleExpanded);
    if (ok) {
      currentAccelerator = accelerator;
      saveSettings({ ...loadSettings(), expandAccelerator: accelerator });
    }
    return ok;
  };
  registerExpandHotkey(currentAccelerator);

  ipcMain.handle('klip:getShortcut', async () => ({ accelerator: currentAccelerator }));
  ipcMain.handle('klip:setShortcut', async (_evt, raw) => {
    const input = SetShortcutSchema.parse(raw);
    const ok = registerExpandHotkey(input.accelerator);
    return { ok, accelerator: currentAccelerator };
  });
  ipcMain.handle('klip:suspendShortcut', async () => {
    globalShortcut.unregister(currentAccelerator);
    return { ok: true };
  });
  ipcMain.handle('klip:resumeShortcut', async () => {
    globalShortcut.register(currentAccelerator, toggleExpanded);
    return { ok: true };
  });

  createTray(win, runtime, toggleExpanded);

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
