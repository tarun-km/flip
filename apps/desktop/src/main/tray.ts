/**
 * Tray entry (docs/03-SRS.md FR-U-03: hotkey, tray entry, and keyboard
 * navigation must exist).
 */
import { Tray, Menu, nativeImage, type BrowserWindow, app } from 'electron';
import type { KlipAgentRuntime } from '@klip/agent-runtime';

// 16x16 transparent-safe solid dot, generated at runtime so no binary asset is required yet.
function fallbackTrayIcon() {
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const cx = size / 2;
    const cy = size / 2;
    const x = i % size;
    const y = Math.floor(i / size);
    const dist = Math.hypot(x - cx, y - cy);
    const inside = dist < size / 2 - 1;
    buffer[i * 4 + 0] = 0x8e;
    buffer[i * 4 + 1] = 0xd8;
    buffer[i * 4 + 2] = 0xc5;
    buffer[i * 4 + 3] = inside ? 255 : 0;
  }
  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

export function createTray(win: BrowserWindow, runtime: KlipAgentRuntime, toggleExpanded: () => void): Tray {
  const tray = new Tray(fallbackTrayIcon());
  tray.setToolTip('KLIP');

  const rebuildMenu = () => {
    const status = runtime.getCurrentState();
    const menu = Menu.buildFromTemplate([
      { label: 'Show / hide KLIP', click: toggleExpanded },
      { type: 'separator' },
      {
        label: status.microphone === 'muted' ? 'Unmute microphone' : 'Mute microphone',
        click: () => runtime.setMicrophoneMuted(status.microphone !== 'muted'),
      },
      { type: 'separator' },
      { label: 'Quit KLIP', click: () => app.quit() },
    ]);
    tray.setContextMenu(menu);
  };

  rebuildMenu();
  runtime.on('event', (e) => {
    if (e.type === 'companion.state') rebuildMenu();
  });
  tray.on('click', toggleExpanded);

  return tray;
}
