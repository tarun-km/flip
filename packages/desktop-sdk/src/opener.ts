/**
 * Injectable "opener" so the same adapter runs inside Electron (safer, uses
 * electron.shell — no shell interpreter involved) or headless in the SDK CLI
 * (docs/03-SRS.md FR-D-01: SDK must work without the companion UI).
 */
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

export interface LaunchResult {
  pid: number | undefined;
}

export interface OpenerPort {
  /** Launch a fixed executable identity with a fixed argument template. No shell parsing. */
  launch(exePath: string, args: string[]): Promise<LaunchResult>;
  /** Open a file with its registered OS default handler. */
  openPath(filePath: string): Promise<string | void>;
  /** Open an https URL in the default (or a specific, already-resolved) browser. */
  openExternal(url: string): Promise<void>;
}

/**
 * Plain Node implementation, no Electron dependency. Uses `cmd.exe /c start`
 * only with fully-controlled strings (validated file paths or template-built
 * URLs) — never raw, unescaped user text.
 */
export class NodeOpener implements OpenerPort {
  async launch(exePath: string, args: string[]): Promise<LaunchResult> {
    return new Promise<LaunchResult>((resolve, reject) => {
      const cp = spawn(exePath, args, { detached: true, stdio: 'ignore', windowsHide: false });
      cp.once('error', reject);
      cp.once('spawn', () => {
        cp.unref();
        resolve({ pid: cp.pid });
      });
    });
  }

  async openPath(filePath: string): Promise<void> {
    await execFileP('cmd.exe', ['/c', 'start', '""', filePath]);
  }

  async openExternal(url: string): Promise<void> {
    await execFileP('cmd.exe', ['/c', 'start', '""', url]);
  }
}
