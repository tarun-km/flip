import type { CompanionStatus } from '@klip/contracts';

export function StatusBadges({ status }: { status: CompanionStatus }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} data-no-drag>
      <Badge label={status.connectivity === 'online' ? 'Online' : 'Offline'} tone={status.connectivity === 'online' ? 'ok' : 'warn'} />
      <Badge
        label={status.microphone === 'muted' ? 'Mic muted' : status.microphone === 'listening' ? 'Listening' : 'Mic armed'}
        tone={status.microphone === 'muted' ? 'warn' : 'ok'}
      />
      <Badge
        label={status.cloud === 'available' ? 'Cloud available' : status.cloud === 'budget-exhausted' ? 'Budget exhausted' : 'Local only'}
        tone={status.cloud === 'available' ? 'ok' : 'neutral'}
      />
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'neutral' }) {
  const color = tone === 'ok' ? 'var(--klip-accent)' : tone === 'warn' ? 'var(--klip-attention)' : 'var(--klip-text-secondary)';
  return (
    <span
      style={{
        fontSize: 11,
        padding: '3px 8px',
        borderRadius: 999,
        border: `1px solid ${color}`,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
