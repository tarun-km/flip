import { useEffect, useState } from 'react';

export interface ShortcutCaptureProps {
  onSave: (accelerator: string) => void;
  onCancel: () => void;
}

const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'OS', 'ContextMenu']);

/**
 * Adapted from pango07/flicky (MIT) —
 * https://github.com/pango07/flicky/blob/master/src/renderer/components/panel/ShortcutCapture.tsx
 */
function normalizeKey(key: string, code: string): string | null {
  if (MODIFIER_KEYS.has(key)) return null;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
  if (key === ' ' || code === 'Space') return 'Space';
  if (key === 'Escape') return null;
  if (key === 'Enter' || key === 'Return') return 'Return';
  if (key === 'ArrowUp') return 'Up';
  if (key === 'ArrowDown') return 'Down';
  if (key === 'ArrowLeft') return 'Left';
  if (key === 'ArrowRight') return 'Right';
  if (key === 'Tab') return 'Tab';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

/** Global hotkey is suspended while capturing so keys reach the renderer instead of firing the old shortcut. */
export function ShortcutCapture({ onSave, onCancel }: ShortcutCaptureProps) {
  const [preview, setPreview] = useState<string[]>([]);
  const [hasValid, setHasValid] = useState(false);

  useEffect(() => {
    window.klip.suspendShortcut();
    return () => {
      window.klip.resumeShortcut();
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('CommandOrControl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Meta');

      const mainKey = normalizeKey(e.key, e.code);
      if (!mainKey) {
        setPreview(parts);
        setHasValid(false);
        return;
      }
      parts.push(mainKey);
      setPreview(parts);
      setHasValid(e.ctrlKey || e.altKey || e.shiftKey || e.metaKey);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onCancel]);

  const accelerator = preview.join('+');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          flex: 1,
          fontSize: 11,
          padding: '6px 8px',
          borderRadius: 8,
          background: '#0c0f13',
          border: '1px solid var(--klip-accent)',
          color: 'var(--klip-text-primary)',
          fontFamily: 'monospace',
        }}
      >
        {preview.length ? preview.join(' + ') : 'press keys…'}
      </div>
      <button
        onClick={() => hasValid && onSave(accelerator)}
        disabled={!hasValid}
        style={{ fontSize: 11, padding: '6px 10px', borderRadius: 8, border: 'none', background: 'var(--klip-accent)', color: '#0c1013', opacity: hasValid ? 1 : 0.5 }}
      >
        Save
      </button>
      <button onClick={onCancel} style={{ fontSize: 11, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--klip-text-secondary)' }}>
        Cancel
      </button>
    </div>
  );
}
