import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useCompanionStore } from '../state/companionStore';
import { ShortcutCapture } from './ShortcutCapture';

interface KeyStatus {
  anthropic: boolean;
  openai: boolean;
  encryptionAvailable: boolean;
}

export function SettingsTab() {
  const historyEnabled = useCompanionStore((s) => s.historyEnabled);
  const setHistoryEnabled = useCompanionStore((s) => s.setHistoryEnabled);
  const setHistory = useCompanionStore((s) => s.setHistory);

  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [shortcut, setShortcut] = useState<string>('');
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    window.klip.getKeyStatus().then(setKeyStatus);
    window.klip.getShortcut().then((s: { accelerator: string }) => setShortcut(s.accelerator));
  }, []);

  const saveKey = async () => {
    if (!keyInput.trim()) return;
    setSavingKey(true);
    const status = await window.klip.setApiKey('anthropic', keyInput.trim());
    setKeyStatus(status);
    setKeyInput('');
    setSavingKey(false);
  };

  const deleteKey = async () => {
    const status = await window.klip.deleteApiKey('anthropic');
    setKeyStatus(status);
  };

  return (
    <div style={{ padding: 14, overflowY: 'auto', height: '100%' }} data-no-drag>
      <Card title="Reasoning provider" tone="teal">
        <p style={styles.p}>
          Open-ended conversation calls Anthropic directly with a key you provide — stored{' '}
          {keyStatus?.encryptionAvailable ? 'encrypted (Windows DPAPI via Electron safeStorage)' : 'in plain base64 (no OS keychain available on this machine)'}
          . This bypasses the metered AWS proxy described in the docs; see{' '}
          <code style={styles.code}>packages/agent-runtime/src/agents/anthropicCognitionPort.ts</code>.
        </p>
        {keyStatus?.anthropic ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusDot ok /> <span style={{ fontSize: 12 }}>Anthropic key configured</span>
            <button onClick={deleteKey} style={styles.dangerButtonSmall}>
              Remove
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-ant-…"
              style={styles.input}
            />
            <button onClick={saveKey} disabled={savingKey || !keyInput.trim()} style={styles.primaryButtonSmall}>
              Save
            </button>
          </div>
        )}
      </Card>

      <Card title="Hotkey" tone="amber">
        <p style={styles.p}>Expand or collapse KLIP from anywhere, even minimized.</p>
        {capturing ? (
          <ShortcutCapture
            onSave={async (accelerator) => {
              const result = await window.klip.setShortcut(accelerator);
              if (result.accelerator) setShortcut(result.accelerator);
              setCapturing(false);
            }}
            onCancel={() => setCapturing(false)}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <kbd style={styles.kbd}>{shortcut.split('+').join(' + ')}</kbd>
            <button onClick={() => setCapturing(true)} style={styles.primaryButtonSmall}>
              Change
            </button>
          </div>
        )}
      </Card>

      <Card title="Privacy" tone="dark">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 10 }}>
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
          style={styles.dangerButtonSmall}
        >
          Forget all local history
        </button>
      </Card>
    </div>
  );
}

function Card({ title, tone, children }: { title: string; tone: 'teal' | 'amber' | 'dark'; children: ReactNode }) {
  const accent = tone === 'teal' ? 'var(--klip-accent)' : tone === 'amber' ? 'var(--klip-attention)' : 'rgba(255,255,255,0.12)';
  return (
    <div style={{ background: 'var(--klip-raised)', border: `1px solid ${accent}33`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: tone === 'dark' ? 'var(--klip-text-primary)' : accent }}>{title}</div>
      {children}
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span style={{ width: 8, height: 8, borderRadius: 999, background: ok ? 'var(--klip-accent)' : 'var(--klip-error)', display: 'inline-block' }} />;
}

const styles: Record<string, CSSProperties> = {
  p: { fontSize: 11.5, color: 'var(--klip-text-secondary)', lineHeight: 1.5, margin: '0 0 10px' },
  code: { background: '#0c0f13', padding: '1px 4px', borderRadius: 4, fontSize: 10.5 },
  input: { flex: 1, background: '#0c0f13', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 8px', color: 'var(--klip-text-primary)', fontSize: 12 },
  primaryButtonSmall: { fontSize: 11, padding: '6px 10px', borderRadius: 8, border: 'none', background: 'var(--klip-accent)', color: '#0c1013', fontWeight: 700 },
  dangerButtonSmall: { fontSize: 11, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--klip-error)', background: 'transparent', color: 'var(--klip-error)' },
  kbd: { fontSize: 11, padding: '6px 10px', borderRadius: 8, background: '#0c0f13', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace' },
};
