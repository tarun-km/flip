/**
 * Encrypted local API key storage.
 *
 * Adapted from pango07/flicky (MIT) — https://github.com/pango07/flicky
 * src/main/services/key-store.ts, src/main/services/fs-util.ts. Credit to
 * that project for the safeStorage + atomic-write pattern.
 *
 * Keys are encrypted at rest via Electron's safeStorage, which on Windows is
 * backed by DPAPI (docs/09-SECURITY-TRUST.md section 8's "user-scoped DPAPI
 * key envelope" requirement — this satisfies it for API keys specifically,
 * though the rest of local storage is still plaintext JSON per
 * packages/memory's README notes). On a machine without an OS keychain
 * (safeStorage unavailable), values fall back to plain base64 with a visible
 * tag rather than being silently unprotected.
 */
import { app, safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export type ApiKeyName = 'anthropic' | 'openai';

const ENC_PREFIX = 'enc:';
const PLAIN_PREFIX = 'plain:';

interface KeyFile {
  encryptedKeys: Record<string, string>;
}

function keyFilePath(): string {
  return path.join(app.getPath('userData'), 'klip-keys.json');
}

/** Crash-safe write: temp file + fsync + atomic rename. */
function writeFileAtomic(filePath: string, data: string): void {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.${path.basename(filePath)}.tmp.${process.pid}.${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  const fd = fs.openSync(tmp, 'w', 0o600);
  try {
    fs.writeSync(fd, data, 0, 'utf-8');
    try {
      fs.fsyncSync(fd);
    } catch {
      /* not all filesystems support fsync */
    }
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, filePath);
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    /* best-effort on platforms without POSIX chmod semantics */
  }
}

function readKeyFile(): KeyFile {
  try {
    return JSON.parse(fs.readFileSync(keyFilePath(), 'utf-8')) as KeyFile;
  } catch {
    return { encryptedKeys: {} };
  }
}

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function setApiKey(name: ApiKeyName, plaintext: string): void {
  const data = readKeyFile();
  if (!plaintext) {
    delete data.encryptedKeys[name];
    writeFileAtomic(keyFilePath(), JSON.stringify(data, null, 2));
    return;
  }
  data.encryptedKeys[name] = safeStorage.isEncryptionAvailable()
    ? `${ENC_PREFIX}${safeStorage.encryptString(plaintext).toString('base64')}`
    : `${PLAIN_PREFIX}${Buffer.from(plaintext).toString('base64')}`;
  writeFileAtomic(keyFilePath(), JSON.stringify(data, null, 2));
}

export function getApiKey(name: ApiKeyName): string | null {
  const blob = readKeyFile().encryptedKeys[name];
  if (!blob) return null;
  try {
    if (blob.startsWith(ENC_PREFIX)) {
      return safeStorage.decryptString(Buffer.from(blob.slice(ENC_PREFIX.length), 'base64'));
    }
    if (blob.startsWith(PLAIN_PREFIX)) {
      return Buffer.from(blob.slice(PLAIN_PREFIX.length), 'base64').toString('utf-8');
    }
  } catch {
    return null;
  }
  return null;
}

export function hasApiKey(name: ApiKeyName): boolean {
  return Boolean(readKeyFile().encryptedKeys[name]);
}

export function deleteApiKey(name: ApiKeyName): void {
  setApiKey(name, '');
}

export function getKeyStatus(): Record<ApiKeyName, boolean> {
  return { anthropic: hasApiKey('anthropic'), openai: hasApiKey('openai') };
}
