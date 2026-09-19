/**
 * Pill/panel window management (docs/07-DESIGN-GUIDEBOOK.md section 2).
 * Anchors bottom-right of the active display's work area; clamps on
 * scaling/monitor changes; frameless, transparent, always-on-top.
 */
import { BrowserWindow, screen } from 'electron';

export const PILL_SIZE = { width: 160, height: 56 };
export const PANEL_SIZE = { width: 380, height: 480 };
const EDGE_GAP = 16;

function targetDisplay() {
  const cursor = screen.getCursorScreenPoint();
  return screen.getDisplayNearestPoint(cursor) ?? screen.getPrimaryDisplay();
}

function bottomRightPosition(size: { width: number; height: number }) {
  const { workArea } = targetDisplay();
  const x = workArea.x + workArea.width - size.width - EDGE_GAP;
  const y = workArea.y + workArea.height - size.height - EDGE_GAP;
  return { x: Math.round(x), y: Math.round(y) };
}

export function createCompanionWindow(preloadPath: string, rendererUrl: string | null, rendererFile: string | null): BrowserWindow {
  const pos = bottomRightPosition(PILL_SIZE);
  const win = new BrowserWindow({
    width: PILL_SIZE.width,
    height: PILL_SIZE.height,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    hasShadow: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (rendererUrl) {
    win.loadURL(rendererUrl);
  } else if (rendererFile) {
    win.loadFile(rendererFile);
  }

  win.once('ready-to-show', () => win.show());

  screen.on('display-metrics-changed', () => resizeAndReposition(win, win.getBounds().width > PILL_SIZE.width + 20));
  screen.on('display-added', () => resizeAndReposition(win, win.getBounds().width > PILL_SIZE.width + 20));
  screen.on('display-removed', () => resizeAndReposition(win, win.getBounds().width > PILL_SIZE.width + 20));

  return win;
}

export function resizeAndReposition(win: BrowserWindow, expanded: boolean): void {
  const size = expanded ? PANEL_SIZE : PILL_SIZE;
  const pos = bottomRightPosition(size);
  win.setBounds({ x: pos.x, y: pos.y, width: size.width, height: size.height }, false);
}
