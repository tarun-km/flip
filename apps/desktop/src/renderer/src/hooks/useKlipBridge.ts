import { useCallback, useEffect, useRef } from 'react';
import { useCompanionStore } from '../state/companionStore';
import { speak, stopSpeaking } from '../lib/voice';
import type { ApprovalRequest, CompanionStatus } from '@klip/contracts';

interface RuntimeEvent {
  type: string;
  taskId?: string;
  payload: unknown;
}

/** True only inside the real Electron window — the preload bridge is never present in a plain browser tab. */
export function isKlipBridgeAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean((window as { klip?: unknown }).klip);
}

export function useKlipBridge() {
  const setStatus = useCompanionStore((s) => s.setStatus);
  const setExpanded = useCompanionStore((s) => s.setExpanded);
  const pushTranscript = useCompanionStore((s) => s.pushTranscript);
  const setPendingApproval = useCompanionStore((s) => s.setPendingApproval);
  const speechLevelRef = useRef(0);
  const available = isKlipBridgeAvailable();

  useEffect(() => {
    if (!available) return;
    window.klip.getCurrentState().then((status: CompanionStatus) => setStatus(status));

    const offEvent = window.klip.onEvent((raw: unknown) => {
      const event = raw as RuntimeEvent;
      if (event.type === 'companion.state') {
        setStatus(event.payload as CompanionStatus);
      } else if (event.type === 'approval.requested') {
        setPendingApproval(event.payload as ApprovalRequest);
      } else if (event.type === 'error') {
        const payload = event.payload as { message: string };
        pushTranscript({ role: 'klip', text: `Error: ${payload.message}` });
      }
    });

    const offExpanded = window.klip.onExpandedChanged((expanded: boolean) => setExpanded(expanded));
    const offStop = window.klip.onStopRequested(() => stopSpeaking());

    return () => {
      offEvent();
      offExpanded();
      offStop();
    };
  }, [available, setStatus, setExpanded, pushTranscript, setPendingApproval]);

  const submit = useCallback(
    async (text: string, source: 'voice' | 'text' = 'text') => {
      pushTranscript({ role: 'user', text });
      if (!available) {
        pushTranscript({ role: 'klip', text: "I'm not connected — this preview is running in a plain browser tab, not the Electron app. Launch KLIP normally (npm run dev) to use it." });
        return null;
      }
      const result = await window.klip.submitIntent(text, source);
      pushTranscript({ role: 'klip', text: result.responseText });
      speak(
        result.responseText,
        (level) => {
          speechLevelRef.current = level;
          setStatus({ ...useCompanionStore.getState().status, speechLevel: level });
        },
        () => {
          setStatus({ ...useCompanionStore.getState().status, speechLevel: 0 });
        },
      );
      return result;
    },
    [pushTranscript, setStatus],
  );

  const resolveApproval = useCallback(
    async (requestId: string, decision: 'approve' | 'reject') => {
      if (!available) return;
      await window.klip.resolveApproval(requestId, decision);
      setPendingApproval(null);
    },
    [available, setPendingApproval],
  );

  return { submit, resolveApproval, bridgeAvailable: available };
}
