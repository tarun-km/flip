/**
 * LocalWindowsAdapter — H24 baseline stand-in for native/Klip.Windows (C#/UIA3).
 *
 * It executes the Priority-1 "typed native operation" tier from
 * docs/02-SYSTEM-ARCHITECTURE.md section 8: app launch, folder/file reveal,
 * safe file open, create/overwrite text with hash verification, and browser
 * search. It does NOT implement UIA (Priority 2) — ui.* actions return
 * UNSUPPORTED_CAPABILITY, honestly, rather than faking a click.
 *
 * A single in-process mutation queue serializes execution, matching
 * maxConcurrentMutations=1 (docs/10-API-CONTRACTS.md).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  newId,
  nowIso,
  type Action,
  type ActionOutcome,
  type ActionRequest,
  type Assertion,
  type Evidence,
  type DesktopSnapshot,
  type ObserveRequest,
  type AppIdentity,
} from '@klip/contracts';
import { APP_REGISTRY, folderRegistry, isSafeToOpen, isBlockedExecutable } from './policy.js';
import { canonicalizeWithinRoots, PathEscapeError } from './paths.js';
import type { OpenerPort } from './opener.js';

const execFileP = promisify(execFile);

async function isProcessRunning(imageName: string): Promise<boolean> {
  try {
    const { stdout } = await execFileP('tasklist', ['/FI', `IMAGENAME eq ${imageName}`, '/FO', 'CSV', '/NH']);
    return stdout.toLowerCase().includes(imageName.toLowerCase());
  } catch {
    return false;
  }
}

async function resolveAppExecutable(appId: string): Promise<{ exe: string; entry: (typeof APP_REGISTRY)[string] } | null> {
  const entry = APP_REGISTRY[appId];
  if (!entry) return null;
  for (const candidate of entry.candidates) {
    if (!candidate.includes(path.sep) && !candidate.includes('/')) {
      // Bare command name resolvable on PATH (e.g. notepad.exe) — trust the registry.
      return { exe: candidate, entry };
    }
    try {
      await fs.access(candidate);
      return { exe: candidate, entry };
    } catch {
      // try next candidate
    }
  }
  return null;
}

export class UnsupportedCapabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedCapabilityError';
  }
}

export class LocalWindowsAdapter {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly opener: OpenerPort) {}

  /** Serialize all mutations through one queue (docs/02-SYSTEM-ARCHITECTURE.md section 8). */
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  async observe(request: ObserveRequest): Promise<DesktopSnapshot> {
    const appId = request.appId ?? 'unknown';
    const entry = APP_REGISTRY[appId];
    const imageName = entry?.candidates.find((c) => c.toLowerCase().endsWith('.exe')) ?? `${appId}.exe`;
    const running = await isProcessRunning(imageName);

    const app: AppIdentity = { appId, pid: -1, processStartedAt: nowIso() };
    return {
      id: newId(),
      revision: 1,
      capturedAt: nowIso(),
      app,
      windowId: appId,
      windowTitle: running ? `${appId} (detected running)` : `${appId} (not detected)`,
      displayId: 'primary',
      windowBounds: { x: 0, y: 0, width: 0, height: 0 },
      focusedElementId: null,
      elements: [],
      truncated: true,
      tier: 'P1',
      invalidated: false,
    };
  }

  async execute(request: ActionRequest): Promise<ActionOutcome> {
    return this.enqueue(() => this.executeNow(request));
  }

  private async executeNow(request: ActionRequest): Promise<ActionOutcome> {
    const startedAt = nowIso();
    try {
      const { evidence, adapter } = await this.dispatch(request.action);
      const evaluated = await this.evaluateAssertions(request.assertions, request.action, evidence);
      const allMatched = evaluated.length > 0 && evaluated.every((e) => e.matched);
      const anyUncertain = evaluated.some((e) => e.summary.startsWith('UNCERTAIN'));

      return {
        actionId: request.id,
        taskId: request.taskId,
        status: anyUncertain ? 'unknown' : allMatched ? 'verified' : evaluated.length === 0 ? 'dispatched' : 'failed',
        executed: anyUncertain ? null : true,
        verified: allMatched && !anyUncertain,
        evidence: evaluated,
        adapter,
        attempts: 1,
        startedAt,
        finishedAt: nowIso(),
      };
    } catch (err) {
      if (err instanceof UnsupportedCapabilityError) {
        return {
          actionId: request.id,
          taskId: request.taskId,
          status: 'refused',
          executed: false,
          verified: false,
          evidence: [],
          error: { code: 'UNSUPPORTED_CAPABILITY', message: err.message, retryable: false },
          adapter: 'native',
          attempts: 1,
          startedAt,
          finishedAt: nowIso(),
        };
      }
      if (err instanceof PathEscapeError) {
        return {
          actionId: request.id,
          taskId: request.taskId,
          status: 'refused',
          executed: false,
          verified: false,
          evidence: [],
          error: { code: 'PERMISSION_DENIED', message: err.message, retryable: false },
          adapter: 'native',
          attempts: 1,
          startedAt,
          finishedAt: nowIso(),
        };
      }
      return {
        actionId: request.id,
        taskId: request.taskId,
        status: 'failed',
        executed: null,
        verified: false,
        evidence: [],
        error: { code: 'INTERNAL', message: err instanceof Error ? err.message : String(err), retryable: false },
        adapter: 'native',
        attempts: 1,
        startedAt,
        finishedAt: nowIso(),
      };
    }
  }

  private async dispatch(action: Action): Promise<{ evidence: Evidence[]; adapter: ActionOutcome['adapter'] }> {
    switch (action.kind) {
      case 'app.open':
        return this.doAppOpen(action.appId);
      case 'file.reveal':
        return this.doFileReveal(action.path);
      case 'file.open':
        return this.doFileOpen(action.path);
      case 'file.writeText':
        return this.doFileWriteText(action.path, action.content, action.expectedSha256);
      case 'browser.search':
        return this.doBrowserSearch(action.engine, action.query);
      case 'ui.invoke':
      case 'ui.type':
      case 'ui.key':
      case 'ui.scroll':
        throw new UnsupportedCapabilityError(
          'UIA control is not available in this baseline build (native/Klip.Windows helper not yet implemented). Only app launch, file reveal/open, text write, and browser search are supported.',
        );
      default:
        throw new UnsupportedCapabilityError(`Unknown action kind: ${(action as Action).kind}`);
    }
  }

  private async doAppOpen(appId: string): Promise<{ evidence: Evidence[]; adapter: ActionOutcome['adapter'] }> {
    const resolved = await resolveAppExecutable(appId);
    if (!resolved) {
      if (APP_REGISTRY[appId]?.fallbackToDefault) {
        throw new UnsupportedCapabilityError(`${appId} was not found on this machine and has no default-handler fallback for a bare launch.`);
      }
      throw new UnsupportedCapabilityError(`"${appId}" is not in the approved app registry.`);
    }
    await this.opener.launch(resolved.exe, []);
    await new Promise((r) => setTimeout(r, 400));
    const imageName = path.basename(resolved.exe);
    const running = await isProcessRunning(imageName);
    return {
      adapter: 'native',
      evidence: [
        {
          source: 'native-api',
          observedAt: nowIso(),
          assertionIndex: -1,
          matched: running,
          summary: running ? `${imageName} is running after launch` : `${imageName} launch issued; process not yet detected`,
        },
      ],
    };
  }

  private async doFileReveal(requestedPath: string): Promise<{ evidence: Evidence[]; adapter: ActionOutcome['adapter'] }> {
    const full = await canonicalizeWithinRoots(requestedPath);
    await fs.stat(full); // throws if missing
    await execFileP('explorer.exe', [`/select,${full}`]).catch(() => undefined); // explorer exits nonzero even on success
    return {
      adapter: 'native',
      evidence: [{ source: 'filesystem', observedAt: nowIso(), assertionIndex: -1, matched: true, summary: `Revealed ${full} in Explorer` }],
    };
  }

  private async doFileOpen(requestedPath: string): Promise<{ evidence: Evidence[]; adapter: ActionOutcome['adapter'] }> {
    const full = await canonicalizeWithinRoots(requestedPath);
    if (isBlockedExecutable(full)) {
      throw new UnsupportedCapabilityError(`Refusing to execute "${full}" via the generic open tool; reveal it instead.`);
    }
    if (!isSafeToOpen(full)) {
      throw new UnsupportedCapabilityError(`"${path.extname(full)}" is not an allowlisted safe-open file type.`);
    }
    await fs.stat(full);
    await this.opener.openPath(full);
    return {
      adapter: 'native',
      evidence: [
        {
          source: 'filesystem',
          observedAt: nowIso(),
          assertionIndex: -1,
          matched: false,
          summary: `UNCERTAIN: OS open request issued for ${full}; confirming the specific document window opened requires the native UIA helper (not yet implemented).`,
        },
      ],
    };
  }

  private async doFileWriteText(
    requestedPath: string,
    content: string,
    expectedSha256: string | null,
  ): Promise<{ evidence: Evidence[]; adapter: ActionOutcome['adapter'] }> {
    const full = await canonicalizeWithinRoots(requestedPath);
    await fs.mkdir(path.dirname(full), { recursive: true });

    let existed = false;
    try {
      const existing = await fs.readFile(full);
      existed = true;
      const existingHash = createHash('sha256').update(existing).digest('hex');
      if (expectedSha256 === null) {
        throw new UnsupportedCapabilityError(`"${full}" already exists; create-only write refused. Use an approved overwrite with the current hash.`);
      }
      if (existingHash !== expectedSha256) {
        throw new UnsupportedCapabilityError(`"${full}" has changed since approval (hash mismatch); refusing overwrite.`);
      }
    } catch (err) {
      if (err instanceof UnsupportedCapabilityError) throw err;
      if (existed) throw err;
      if (expectedSha256 !== null) {
        throw new UnsupportedCapabilityError(`"${full}" does not exist; cannot honor a hash-bound overwrite.`);
      }
      // ENOENT on create-only path is expected.
    }

    await fs.writeFile(full, content, 'utf-8');
    const written = await fs.readFile(full);
    const newHash = createHash('sha256').update(written).digest('hex');
    const roundTrip = written.toString('utf-8') === content;

    return {
      adapter: 'native',
      evidence: [
        {
          source: 'filesystem',
          observedAt: nowIso(),
          assertionIndex: -1,
          matched: roundTrip,
          summary: `Wrote ${full}; sha256=${newHash}; readback ${roundTrip ? 'matches' : 'DOES NOT MATCH'} requested content`,
        },
      ],
    };
  }

  private async doBrowserSearch(engine: 'google' | 'bing', query: string): Promise<{ evidence: Evidence[]; adapter: ActionOutcome['adapter'] }> {
    const base = engine === 'bing' ? 'https://www.bing.com/search?q=' : 'https://www.google.com/search?q=';
    const url = base + encodeURIComponent(query);
    await this.opener.openExternal(url);
    return {
      adapter: 'browser',
      evidence: [
        {
          source: 'browser',
          observedAt: nowIso(),
          assertionIndex: -1,
          matched: false,
          summary: `UNCERTAIN: navigation to ${url} was requested via the OS default browser handler; address-bar readback requires a browser adapter (not yet implemented).`,
        },
      ],
    };
  }

  private async evaluateAssertions(assertions: Assertion[], action: Action, dispatchEvidence: Evidence[]): Promise<Evidence[]> {
    if (assertions.length === 0) return dispatchEvidence;
    const out: Evidence[] = [];
    for (let i = 0; i < assertions.length; i++) {
      const a = assertions[i];
      out.push(await this.evaluateOne(a, i, action));
    }
    return out;
  }

  private async evaluateOne(assertion: Assertion, index: number, action: Action): Promise<Evidence> {
    const observedAt = nowIso();
    switch (assertion.kind) {
      case 'window.exists': {
        const entry = APP_REGISTRY[assertion.appId];
        const imageName = entry?.candidates.find((c) => c.toLowerCase().endsWith('.exe')) ?? `${assertion.appId}.exe`;
        const running = await isProcessRunning(imageName);
        return { source: 'native-api', observedAt, assertionIndex: index, matched: running, summary: running ? `${imageName} running` : `${imageName} not detected` };
      }
      case 'file.sha256Equals': {
        try {
          const buf = await fs.readFile(assertion.path);
          const hash = createHash('sha256').update(buf).digest('hex');
          return { source: 'filesystem', observedAt, assertionIndex: index, matched: hash === assertion.sha256, summary: `sha256=${hash}` };
        } catch (e) {
          return { source: 'filesystem', observedAt, assertionIndex: index, matched: false, summary: `could not read file: ${String(e)}` };
        }
      }
      case 'file.opened': {
        try {
          await fs.stat(assertion.path);
        } catch {
          return { source: 'filesystem', observedAt, assertionIndex: index, matched: false, summary: 'file does not exist' };
        }
        return {
          source: 'filesystem',
          observedAt,
          assertionIndex: index,
          matched: false,
          summary: 'UNCERTAIN: file exists but window-level open confirmation requires the native UIA helper',
        };
      }
      case 'element.exists':
      case 'element.valueEquals':
        return { source: 'uia', observedAt, assertionIndex: index, matched: false, summary: 'UIA not implemented in this baseline build' };
      case 'browser.urlEquals':
        return { source: 'browser', observedAt, assertionIndex: index, matched: false, summary: 'Browser address-bar readback not implemented in this baseline build' };
      default:
        return { source: 'native-api', observedAt, assertionIndex: index, matched: false, summary: 'Unrecognized assertion kind' };
    }
  }
}

export { folderRegistry };
