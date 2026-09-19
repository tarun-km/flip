/**
 * Local policy: allowlists and risk classification.
 * Authoritative source: docs/09-SECURITY-TRUST.md section 2 and 6.
 *
 * H24 baseline scope: only app.open / file.reveal / file.open / file.writeText /
 * browser.search are executable. ui.* actions require the native Windows helper
 * (native/Klip.Windows) and currently return UNSUPPORTED_CAPABILITY.
 */
import os from 'node:os';
import path from 'node:path';
import type { Action, RiskTier } from '@klip/contracts';

export interface AppRegistryEntry {
  id: string;
  label: string;
  /** Executable resolvable on PATH, or an absolute path probed at runtime. */
  candidates: string[];
  /** True if this app id should fall back to the OS default handler when no candidate exists. */
  fallbackToDefault?: boolean;
}

/** Fixed registry of approved executable identities. No model-supplied shell arguments. */
export const APP_REGISTRY: Record<string, AppRegistryEntry> = {
  notepad: { id: 'notepad', label: 'Notepad', candidates: ['notepad.exe'] },
  explorer: { id: 'explorer', label: 'File Explorer', candidates: ['explorer.exe'] },
  calculator: { id: 'calculator', label: 'Calculator', candidates: ['calc.exe'] },
  chrome: {
    id: 'chrome',
    label: 'Chrome',
    candidates: [
      'C\\:/Program Files/Google/Chrome/Application/chrome.exe'.replace('\\:', ':'),
      'C\\:/Program Files (x86)/Google/Chrome/Application/chrome.exe'.replace('\\:', ':'),
      path.join(os.homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe'),
    ],
    fallbackToDefault: true,
  },
};

/** Known safe roots. Requests must canonicalize into one of these. */
export function folderRegistry(): Record<string, string> {
  const home = os.homedir();
  return {
    downloads: path.join(home, 'Downloads'),
    documents: path.join(home, 'Documents'),
    desktop: path.join(home, 'Desktop'),
    pictures: path.join(home, 'Pictures'),
    klip: path.join(home, 'Documents', 'Klip'),
  };
}

export const SAFE_OPEN_EXTENSIONS = new Set([
  '.txt', '.md', '.csv', '.json', '.log',
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp',
  '.pdf', '.docx', '.xlsx', '.pptx',
]);

export const BLOCKED_EXECUTABLE_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.ps1', '.vbs', '.vbe', '.js', '.jse',
  '.msi', '.msp', '.scr', '.jar', '.com', '.reg', '.hta', '.wsf', '.wsh',
]);

export const PARTIAL_DOWNLOAD_EXTENSIONS = new Set(['.crdownload', '.part', '.tmp', '.download']);

export function isSafeToOpen(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SAFE_OPEN_EXTENSIONS.has(ext) && !BLOCKED_EXECUTABLE_EXTENSIONS.has(ext);
}

export function isBlockedExecutable(filePath: string): boolean {
  return BLOCKED_EXECUTABLE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/**
 * Classify effect, not method name (docs/09 section 2). Only the actions this
 * baseline can execute are covered; ui.* falls through to R2 pending real
 * semantic classification once the native helper exists.
 */
export function classifyRisk(action: Action): RiskTier {
  switch (action.kind) {
    case 'app.open':
    case 'file.reveal':
    case 'browser.search':
      return 'R2';
    case 'file.open':
      return 'R2';
    case 'file.writeText':
      return action.expectedSha256 === null ? 'R2' : 'R3';
    case 'ui.invoke':
    case 'ui.type':
    case 'ui.key':
    case 'ui.scroll':
      return 'R2';
    default:
      return 'R4';
  }
}

export function requiresApproval(action: Action): boolean {
  return classifyRisk(action) === 'R3';
}
