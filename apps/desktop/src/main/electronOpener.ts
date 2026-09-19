/**
 * Electron-backed OpenerPort: uses electron.shell for file/URL opening
 * (no shell interpreter involved), and plain spawn for fixed, allowlisted
 * executable launches (docs/09-SECURITY-TRUST.md section 6).
 */
import { spawn } from 'node:child_process';
import { shell } from 'electron';
import type { LaunchResult, OpenerPort } from '@klip/desktop-sdk';

export class ElectronOpener implements OpenerPort {
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
    const errorMessage = await shell.openPath(filePath);
    if (errorMessage) throw new Error(errorMessage);
  }

  async openExternal(url: string): Promise<void> {
    await shell.openExternal(url);
  }
}
