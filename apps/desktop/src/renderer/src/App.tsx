import { useCompanionStore } from './state/companionStore';
import { useKlipBridge } from './hooks/useKlipBridge';
import { CompanionPill } from './components/CompanionPill';
import { Companion } from './components/Companion';
import { StatusBadges } from './components/StatusBadges';
import { ConversationPanel } from './components/ConversationPanel';
import { HistoryUsagePanel } from './components/HistoryUsagePanel';
import { SettingsTab } from './components/SettingsTab';
import { ApprovalModal } from './components/ApprovalModal';

export default function App() {
  const { submit, resolveApproval, bridgeAvailable } = useKlipBridge();
  const status = useCompanionStore((s) => s.status);
  const storeExpanded = useCompanionStore((s) => s.expanded);
  const setStoreExpanded = useCompanionStore((s) => s.setExpanded);
  const pendingApproval = useCompanionStore((s) => s.pendingApproval);
  const activeView = useCompanionStore((s) => s.activeView);
  const setActiveView = useCompanionStore((s) => s.setActiveView);

  // Outside the real Electron window (e.g. a plain browser preview of the Vite
  // dev server) there is no main process to own expand/collapse, so drive it
  // from local state instead of failing on a missing bridge call.
  const expanded = storeExpanded;
  const setExpanded = (value: boolean) => {
    if (bridgeAvailable) window.klip.setExpanded(value);
    setStoreExpanded(value);
  };
  const toggleMute = () => {
    if (bridgeAvailable) window.klip.setMicrophoneMuted(status.microphone !== 'muted');
  };

  const banner = !bridgeAvailable ? (
    <div style={{ fontSize: 10, textAlign: 'center', padding: '4px 8px', background: 'var(--klip-attention)', color: '#1a1400' }}>
      Preview only — not connected to the Electron app (no IPC bridge here)
    </div>
  ) : null;

  if (!expanded) {
    return (
      <div className="klip-app">
        {banner}
        <CompanionPill status={status} onToggleExpand={() => setExpanded(true)} />
      </div>
    );
  }

  return (
    <div className="klip-app" style={{ position: 'relative' }}>
      {banner}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'var(--klip-bg)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--klip-radius)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }} data-no-drag>
          <div style={{ width: 36, height: 36, flexShrink: 0 }}>
            <Companion state={status.state} speechLevel={status.speechLevel} inputLevel={0} reducedMotion={false} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 500, fontFamily: 'var(--klip-font-display)', letterSpacing: 0.3 }}>KLIP</div>
            <StatusBadges status={status} />
          </div>
          <button
            onClick={() => setExpanded(false)}
            aria-label="Collapse KLIP"
            style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--klip-text-secondary)' }}
          >
            ×
          </button>
        </header>

        <nav style={{ display: 'flex', gap: 4, padding: '8px 12px 0' }} data-no-drag>
          <TabButton active={activeView === 'conversation'} onClick={() => setActiveView('conversation')} label="Chat" />
          <TabButton active={activeView === 'history'} onClick={() => setActiveView('history')} label="Dashboard" />
          <TabButton active={activeView === 'settings'} onClick={() => setActiveView('settings')} label="Settings" />
        </nav>

        <div style={{ flex: 1, minHeight: 0 }}>
          {activeView === 'conversation' && <ConversationPanel onSubmit={submit} muted={status.microphone === 'muted'} onToggleMute={toggleMute} />}
          {activeView === 'history' && <HistoryUsagePanel />}
          {activeView === 'settings' && <SettingsTab />}
        </div>
      </div>

      {pendingApproval && <ApprovalModal request={pendingApproval} onResolve={(decision) => resolveApproval(pendingApproval.id, decision)} />}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        padding: '6px 4px 10px',
        borderRadius: 0,
        border: 'none',
        borderBottom: active ? '2px solid var(--klip-accent)' : '2px solid transparent',
        background: 'transparent',
        color: active ? 'var(--klip-text-primary)' : 'var(--klip-text-secondary)',
        marginRight: 14,
      }}
    >
      {label}
    </button>
  );
}
