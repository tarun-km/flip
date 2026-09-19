import { useEffect, type ReactNode } from 'react';
import { useCompanionStore } from '../state/companionStore';

export function HistoryUsagePanel() {
  const history = useCompanionStore((s) => s.history);
  const usage = useCompanionStore((s) => s.usage);
  const historyEnabled = useCompanionStore((s) => s.historyEnabled);
  const setHistory = useCompanionStore((s) => s.setHistory);
  const setUsage = useCompanionStore((s) => s.setUsage);

  useEffect(() => {
    window.klip.getHistory().then(setHistory);
    window.klip.getUsage().then(setUsage);
  }, [setHistory, setUsage]);

  const dollars = (usage.totals.settledMicrousd / 1_000_000).toFixed(4);
  const pending = (usage.totals.reservedMicrousd / 1_000_000).toFixed(4);
  const verifiedCount = history.reduce((n, t) => n + t.actions.filter((a) => a.status === 'verified').length, 0);
  const unknownCount = history.reduce((n, t) => n + t.actions.filter((a) => a.status === 'unknown').length, 0);

  return (
    <div style={{ padding: 14, overflowY: 'auto', height: '100%' }} data-no-drag>
      <SectionLabel>Today</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <StatTile tone="teal" big={usage.totals.localCount} label="Local requests" sub="$0.0000 · zero cloud calls" />
        <StatTile tone="amber" big={usage.totals.cloudCount} label="Cloud requests" sub={`settled $${dollars}`} />
        <StatTile tone="dark" big={verifiedCount} label="Verified actions" sub="fresh evidence, no guessing" />
        <StatTile tone="dark" big={unknownCount} label="Unknown outcomes" sub="never silently retried" />
      </div>

      {usage.totals.reservedMicrousd > 0 && (
        <div style={{ fontSize: 12, color: 'var(--klip-attention)', marginBottom: 12 }}>Pending up to ${pending}</div>
      )}
      <div style={{ fontSize: 11, color: 'var(--klip-text-secondary)', marginBottom: 18 }}>
        Cloud calls here go directly to Anthropic (see Settings) — the metered AWS proxy from the docs isn't deployed yet.
      </div>

      <SectionLabel>Recent tasks</SectionLabel>
      {!historyEnabled && (
        <div style={{ fontSize: 12, color: 'var(--klip-text-secondary)', background: 'var(--klip-raised)', borderRadius: 12, padding: 10 }}>
          History is off — nothing is being saved. Turn it on in Settings.
        </div>
      )}
      {historyEnabled && history.length === 0 && <div style={{ fontSize: 12, color: 'var(--klip-text-secondary)' }}>Nothing yet — try a command in Chat.</div>}
      {history.map((task) => (
        <div
          key={task.id}
          style={{
            background: 'var(--klip-raised)',
            borderRadius: 12,
            padding: 10,
            marginBottom: 8,
            fontSize: 12,
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div style={{ fontWeight: 600 }}>{task.requestText}</div>
          <div style={{ color: 'var(--klip-text-secondary)', marginTop: 2, fontSize: 11 }}>
            {task.agent} · {task.route} · {new Date(task.createdAt).toLocaleTimeString()}
          </div>
          {task.actions.map((a) => (
            <div
              key={a.actionId}
              style={{
                marginTop: 4,
                fontSize: 11,
                color: a.status === 'verified' ? 'var(--klip-accent)' : a.status === 'unknown' ? 'var(--klip-attention)' : 'var(--klip-error)',
              }}
            >
              {a.adapter} · {a.status}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--klip-text-secondary)', margin: '0 0 8px' }}>{children}</h3>;
}

function StatTile({ tone, big, label, sub }: { tone: 'teal' | 'amber' | 'dark'; big: number; label: string; sub: string }) {
  const background = tone === 'teal' ? 'var(--klip-bento-teal)' : tone === 'amber' ? 'var(--klip-bento-amber)' : 'var(--klip-raised)';
  const color = tone === 'dark' ? 'var(--klip-text-primary)' : 'var(--klip-bento-ink)';
  return (
    <div
      style={{
        background,
        color,
        borderRadius: 16,
        padding: '14px 14px 12px',
        boxShadow: tone === 'dark' ? 'none' : 'var(--klip-card-shadow)',
        minHeight: 82,
      }}
    >
      <div style={{ fontFamily: 'var(--klip-font-display)', fontSize: 28, lineHeight: 1, fontWeight: 500 }}>{big}</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 6 }}>{label}</div>
      <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{sub}</div>
    </div>
  );
}
