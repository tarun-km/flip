/**
 * Narrow preload bridge (docs/09-SECURITY-TRUST.md section 5,
 * docs/10-API-CONTRACTS.md section 9). Only these named, validated
 * operations are reachable from the renderer — no generic invoke/eval/shell.
 */
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  submitIntent: (text: string, source: 'voice' | 'text' | 'sdk') => ipcRenderer.invoke('klip:submitIntent', { text, source }),
  cancelTask: (taskId: string) => ipcRenderer.invoke('klip:cancelTask', { taskId }),
  resolveApproval: (requestId: string, decision: 'approve' | 'reject') => ipcRenderer.invoke('klip:resolveApproval', { requestId, decision }),
  setMicrophoneMuted: (muted: boolean) => ipcRenderer.invoke('klip:setMicrophoneMuted', { muted }),
  setCloudMode: (mode: 'local-only' | 'balanced' | 'ask-every-time') => ipcRenderer.invoke('klip:setCloudMode', { mode }),
  getHistory: () => ipcRenderer.invoke('klip:getHistory'),
  forgetHistory: (scope: 'all' | 'conversation' | 'preferences' = 'all') => ipcRenderer.invoke('klip:forgetHistory', { scope }),
  getUsage: (day?: string) => ipcRenderer.invoke('klip:getUsage', { day }),
  getCurrentState: () => ipcRenderer.invoke('klip:getCurrentState'),
  setHistoryEnabled: (enabled: boolean) => ipcRenderer.invoke('klip:setHistoryEnabled', { enabled }),
  setExpanded: (expandedState: boolean) => ipcRenderer.invoke('klip:setExpanded', { expanded: expandedState }),

  onEvent: (callback: (event: unknown) => void) => {
    const listener = (_evt: unknown, payload: unknown) => callback(payload);
    ipcRenderer.on('klip:event', listener);
    return () => ipcRenderer.removeListener('klip:event', listener);
  },
  onExpandedChanged: (callback: (expandedState: boolean) => void) => {
    const listener = (_evt: unknown, payload: boolean) => callback(payload);
    ipcRenderer.on('klip:expanded-changed', listener);
    return () => ipcRenderer.removeListener('klip:expanded-changed', listener);
  },
  onStopRequested: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('klip:stop-requested', listener);
    return () => ipcRenderer.removeListener('klip:stop-requested', listener);
  },
};

contextBridge.exposeInMainWorld('klip', api);

export type KlipBridge = typeof api;
