import { create } from 'zustand';
import type { ApprovalRequest, CompanionStatus, HistoryTaskEntry, UsageRecord } from '@klip/contracts';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'klip';
  text: string;
  createdAt: string;
}

interface CompanionStoreState {
  status: CompanionStatus;
  expanded: boolean;
  transcript: TranscriptEntry[];
  pendingApproval: ApprovalRequest | null;
  history: HistoryTaskEntry[];
  usage: { rows: UsageRecord[]; totals: { settledMicrousd: number; reservedMicrousd: number; localCount: number; cloudCount: number } };
  historyEnabled: boolean;
  activeView: 'conversation' | 'history' | 'settings';

  setStatus: (status: CompanionStatus) => void;
  setExpanded: (expanded: boolean) => void;
  pushTranscript: (entry: Omit<TranscriptEntry, 'id' | 'createdAt'>) => void;
  setPendingApproval: (req: ApprovalRequest | null) => void;
  setHistory: (history: HistoryTaskEntry[]) => void;
  setUsage: (usage: CompanionStoreState['usage']) => void;
  setHistoryEnabled: (enabled: boolean) => void;
  setActiveView: (view: 'conversation' | 'history' | 'settings') => void;
}

export const useCompanionStore = create<CompanionStoreState>((set) => ({
  status: { state: 'idle', connectivity: 'online', microphone: 'armed', cloud: 'disabled', speechLevel: 0 },
  expanded: false,
  transcript: [],
  pendingApproval: null,
  history: [],
  usage: { rows: [], totals: { settledMicrousd: 0, reservedMicrousd: 0, localCount: 0, cloudCount: 0 } },
  historyEnabled: false,
  activeView: 'conversation',

  setStatus: (status) => set({ status }),
  setExpanded: (expanded) => set({ expanded }),
  pushTranscript: (entry) =>
    set((s) => ({
      transcript: [...s.transcript, { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, createdAt: new Date().toISOString() }].slice(-100),
    })),
  setPendingApproval: (req) => set({ pendingApproval: req }),
  setHistory: (history) => set({ history }),
  setUsage: (usage) => set({ usage }),
  setHistoryEnabled: (historyEnabled) => set({ historyEnabled }),
  setActiveView: (activeView) => set({ activeView }),
}));
