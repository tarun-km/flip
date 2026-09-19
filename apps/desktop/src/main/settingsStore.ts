/**
 * Small local settings file (non-sensitive): custom hotkey, active cognition
 * provider. Separate from keyStore.ts (encrypted secrets) and
 * @klip/memory (task/usage history) — this is UI/behavior preference only.
 */
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export interface KlipSettings {
  expandAccelerator: string;
}

const DEFAULTS: KlipSettings = {
  expandAccelerator: 'CommandOrControl+Shift+K',
};

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'klip-settings.json');
}

export function loadSettings(): KlipSettings {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath(), 'utf-8'));
    return { ...DEFAULTS, ...raw };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: KlipSettings): void {
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
}
