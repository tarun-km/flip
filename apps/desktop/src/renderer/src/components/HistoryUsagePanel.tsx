import { useEffect } from 'react';
import { useCompanionStore } from '../state/companionStore';

export function HistoryUsagePanel() {
  const history = useCompanionStore((s) => s.history);
  const usage = useCompanionStore((s) => s.usage);
  const historyEnabled = useCompanionStore((s) => s.historyEnabled);
  const setHistory = useCompanionStore((s) => s.setHistory);
  const setUsage = useCompanionStore((s) => s.setUsage);
  const setHistoryEnabled = useCompanionStore((s) => s.setHistoryEnabled);

  useEffect(() => {
    window.klip.getHistory().then(setHistory);
    window.klip.getUsage().then(setUsage);
  }, [setHistory, setUsage]);

  const dollars = (usage.totals.settledMicrousd / 1_000_000).toFixed(4);
  const pending = (usage.totals.reservedMicrousd / 1_000_000).toFixed(4);

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }} data-no-drag>
      <section style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--klip-text-secondary)', margin: '0 0 8px' }}>Usage</h3>
        <div style={{ fontSize: 13, marginBottom: 4 }}>
          Local · {usage.totals.localCount} request(s) · $0.0000
        </div>
        <div style={{ fontSize: 13, marginBottom: 4 }}>
          Cloud · {usage.totals.cloudCount} request(s) · settled ${dollars}
        </div>
        {usage.totals.reservedMicrousd > 0 && <div style={{ fontSize: 12, color: 'var(--klip-attention)' }}>Pending up to ${pending}</div>}
        <div style={{ fontSize: 11, color: 'var(--klip-text-secondary)', marginTop: 4 }}>
          Cloud model calls are $0 in this baseline build — no AWS cognition proxy is deployed yet.
        </div>
      </section>

      <section style={{ marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={historyEnabled}
            onChange={async (e) => {
              await window.klip.setHistoryEnabled(e.target.checked);
              setHistoryEnabled(e.target.checked);
            }}
          />
          Save conversation history locally
        </label>
        <button
          onClick={async () => {
            await window.klip.forgetHistory('all');
            setHistory([]);
          }}
          style={{ marginTop: 8, fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--klip-error)', background: 'transparent', color: 'var(--klip-error)' }}
        >
          Forget all local history
        </button>
      </section>

      <section>
        <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--klip-text-secondary)', margin: '0 0 8px' }}>Recent tasks</h3>
        {!historyEnabled && <div style={{ fontSize: 12, color: 'var(--klip-text-secondary)' }}>History is off — nothing is being saved.</div>}
        {historyEnabled && history.length === 0 && <div style={{ fontSize: 12, color: 'var(--klip-text-secondary)' }}>Nothing yet.</div>}
        {history.map((task) => (
          <div key={task.id} style={{ background: 'var(--klip-raised)', borderRadius: 10, padding: 8, marginBottom: 6, fontSize: 12 }}>
            <div style={{ fontWeight: 600 }}>{task.requestText}</div>
            <div style={{ color: 'var(--klip-text-secondary)', marginTop: 2 }}>
              {task.agent} · {task.route} · {new Date(task.createdAt).toLocaleTimeString()}
            </div>
            {task.actions.map((a) => (
              <div key={a.actionId} style={{ marginTop: 4, fontSize: 11, color: a.status === 'verified' ? 'var(--klip-accent)' : a.status === 'unknown' ? 'var(--klip-attention)' : 'var(--klip-error)' }}>
                {a.adapter} · {a.status}
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
