/**
 * Narrow, validated IPC surface (docs/10-API-CONTRACTS.md section 9,
 * docs/09-SECURITY-TRUST.md section 5). No generic invoke/eval/shell bridge —
 * one handler per named, schema-validated operation.
 */
import { ipcMain, type BrowserWindow } from 'electron';
import { newId } from '@klip/contracts';
import {
  SubmitIntentSchema,
  CancelTaskSchema,
  ResolveApprovalSchema,
  SetMicrophoneMutedSchema,
  SetCloudModeSchema,
  ForgetHistorySchema,
} from '@klip/contracts';
import type { KlipAgentRuntime } from '@klip/agent-runtime';

export function registerIpcHandlers(runtime: KlipAgentRuntime, getWindow: () => BrowserWindow | null): void {
  const sessionId = newId();

  ipcMain.handle('klip:submitIntent', async (_evt, raw) => {
    const input = SubmitIntentSchema.parse(raw);
    return runtime.handleIntent(input.text, input.source, sessionId);
  });

  ipcMain.handle('klip:cancelTask', async (_evt, raw) => {
    const input = CancelTaskSchema.parse(raw);
    return runtime.cancelTask(input.taskId);
  });

  ipcMain.handle('klip:resolveApproval', async (_evt, raw) => {
    const input = ResolveApprovalSchema.parse(raw);
    return { acknowledged: await runtime.resolveApproval(input.requestId, input.decision) };
  });

  ipcMain.handle('klip:setMicrophoneMuted', async (_evt, raw) => {
    const input = SetMicrophoneMutedSchema.parse(raw);
    runtime.setMicrophoneMuted(input.muted);
    return { ok: true };
  });

  ipcMain.handle('klip:setCloudMode', async (_evt, raw) => {
    const input = SetCloudModeSchema.parse(raw);
    runtime.setCloudMode(input.mode);
    return { ok: true };
  });

  ipcMain.handle('klip:getHistory', async () => runtime.getHistory());

  ipcMain.handle('klip:forgetHistory', async (_evt, raw) => {
    const input = ForgetHistorySchema.parse(raw ?? {});
    await runtime.forgetHistory(input.scope);
    return { ok: true };
  });

  ipcMain.handle('klip:getUsage', async (_evt, raw) => {
    const day = typeof raw?.day === 'string' ? raw.day : undefined;
    return runtime.getUsage(day);
  });

  ipcMain.handle('klip:getCurrentState', async () => runtime.getCurrentState());

  ipcMain.handle('klip:setHistoryEnabled', async (_evt, raw) => {
    await runtime.memory.setHistoryEnabled(Boolean(raw?.enabled));
    return { enabled: runtime.memory.historyEnabled };
  });

  runtime.on('event', (event) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('klip:event', event);
    }
  });
}
