import { Companion } from './Companion';
import type { CompanionStatus } from '@klip/contracts';

export interface CompanionPillProps {
  status: CompanionStatus;
  onToggleExpand: () => void;
}

export function CompanionPill({ status, onToggleExpand }: CompanionPillProps) {
  return (
    <button
      onClick={onToggleExpand}
      data-no-drag
      aria-label="Expand KLIP"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        height: '100%',
        padding: '4px 12px 4px 4px',
        background: 'var(--klip-bg)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 999,
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        color: 'var(--klip-text-primary)',
      }}
    >
      <div style={{ width: 44, height: 44, flexShrink: 0 }}>
        <Companion state={status.state} speechLevel={status.speechLevel} inputLevel={0} reducedMotion={false} />
      </div>
      <div style={{ textAlign: 'left', overflow: 'hidden' }}>
        <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>KLIP</div>
        <div style={{ fontSize: 11, color: 'var(--klip-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {shortLabel(status)}
        </div>
      </div>
    </button>
  );
}

function shortLabel(status: CompanionStatus): string {
  if (status.microphone === 'muted') return 'Muted';
  switch (status.state) {
    case 'idle': return 'Ready';
    case 'listening': return 'Listening…';
    case 'thinking': return 'Thinking…';
    case 'speaking': return 'Speaking…';
    case 'acting': return 'Working…';
    case 'awaiting-approval': return 'Needs approval';
    case 'success': return 'Done';
    case 'error': return 'Error';
    default: return '';
  }
}
