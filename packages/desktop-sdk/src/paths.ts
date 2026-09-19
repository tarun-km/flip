/**
 * Path canonicalization and the "latest download" resolver.
 * Authoritative source: docs/09-SECURITY-TRUST.md section 6, docs/04-SDD.md section 6.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { folderRegistry, PARTIAL_DOWNLOAD_EXTENSIONS, BLOCKED_EXECUTABLE_EXTENSIONS } from './policy.js';

export class PathEscapeError extends Error {
  constructor(requested: string) {
    super(`Path escapes allowed roots: ${requested}`);
    this.name = 'PathEscapeError';
  }
}

/** Resolve a path and verify it stays within one of the known safe roots. Throws on escape. */
export async function canonicalizeWithinRoots(requestedPath: string): Promise<string> {
  const roots = Object.values(folderRegistry()).map((r) => path.resolve(r));
  const resolved = path.resolve(requestedPath);

  // Verify against realpath when the target exists, to defend against reparse points/symlinks
  // escaping the root. New (not-yet-created) files are checked by resolved path only.
  let checkPath = resolved;
  try {
    checkPath = await fs.realpath(resolved);
  } catch {
    // Does not exist yet (e.g. create-only write target) — fall back to lexical resolution.
  }

  const normalized = checkPath.toLowerCase();
  const inRoot = roots.some((root) => {
    const r = root.toLowerCase();
    return normalized === r || normalized.startsWith(r + path.sep);
  });

  if (!inRoot) {
    throw new PathEscapeError(requestedPath);
  }
  return resolved;
}

export interface DownloadCandidate {
  path: string;
  name: string;
  mtimeMs: number;
  size: number;
  supported: boolean;
  blockedExecutable: boolean;
}

/**
 * Newest completed, non-partial file in Downloads. Filesystem mtime is an
 * operational definition of "completed," not universal proof (docs/04-SDD.md section 6).
 */
export async function findLatestDownload(): Promise<DownloadCandidate | null> {
  const dir = folderRegistry().downloads;
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }

  const candidates: DownloadCandidate[] = [];
  for (const name of entries) {
    const ext = path.extname(name).toLowerCase();
    if (PARTIAL_DOWNLOAD_EXTENSIONS.has(ext)) continue;
    const full = path.join(dir, name);
    let st;
    try {
      st = await fs.stat(full);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    candidates.push({
      path: full,
      name,
      mtimeMs: st.mtimeMs,
      size: st.size,
      supported: !BLOCKED_EXECUTABLE_EXTENSIONS.has(ext),
      blockedExecutable: BLOCKED_EXECUTABLE_EXTENSIONS.has(ext),
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0];
}
