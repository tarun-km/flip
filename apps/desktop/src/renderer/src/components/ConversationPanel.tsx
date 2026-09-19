import { useRef, useState } from 'react';
import { useCompanionStore } from '../state/companionStore';
import { isVoiceInputSupported, PushToTalkSession } from '../lib/voice';

export interface ConversationPanelProps {
  onSubmit: (text: string, source: 'voice' | 'text') => Promise<unknown>;
  muted: boolean;
  onToggleMute: () => void;
}

export function ConversationPanel({ onSubmit, muted, onToggleMute }: ConversationPanelProps) {
  const transcript = useCompanionStore((s) => s.transcript);
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceWarning, setVoiceWarning] = useState<string | null>(null);
  const sessionRef = useRef<PushToTalkSession | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text: string, source: 'voice' | 'text' = 'text') => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setDraft('');
    await onSubmit(trimmed, source);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }));
  };

  const startPushToTalk = () => {
    if (muted) return;
    if (!isVoiceInputSupported()) {
      setVoiceWarning('Voice input is not available in this build; use text input.');
      return;
    }
    setVoiceWarning('Voice uses your browser engine’s speech service (not the local pipeline yet) — see docs/02 §5.');
    const session = new PushToTalkSession();
    sessionRef.current = session;
    setListening(true);
    session.start(
      (text, isFinal) => {
        if (isFinal) {
          setListening(false);
          send(text, 'voice');
        }
      },
      (message) => {
        setListening(false);
        setVoiceWarning(message);
      },
    );
  };

  const stopPushToTalk = () => {
    sessionRef.current?.stop();
    setListening(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }} data-no-drag>
        {transcript.length === 0 && (
          <div style={{ color: 'var(--klip-text-secondary)', fontSize: 13, marginTop: 12 }}>
            Say "help" or type a command — try <em>"open Notepad"</em>, <em>"open downloads"</em>, or <em>"search google for weather"</em>.
          </div>
        )}
        {transcript.map((entry) => (
          <div
            key={entry.id}
            style={{
              alignSelf: entry.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: entry.role === 'user' ? 'var(--klip-accent)' : 'var(--klip-raised)',
              color: entry.role === 'user' ? '#0c1013' : 'var(--klip-text-primary)',
              padding: '8px 12px',
              borderRadius: 14,
              fontSize: 13,
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
            }}
          >
            {entry.text}
          </div>
        ))}
      </div>

      {voiceWarning && (
        <div style={{ fontSize: 10, color: 'var(--klip-text-secondary)', padding: '0 12px 4px' }} data-no-drag>
          {voiceWarning}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft, 'text');
        }}
        style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}
        data-no-drag
      >
        <button
          type="button"
          onClick={onToggleMute}
          title={muted ? 'Unmute microphone' : 'Mute microphone'}
          aria-pressed={muted}
          style={{
            width: 32,
            height: 36,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent',
            color: muted ? 'var(--klip-attention)' : 'var(--klip-text-secondary)',
            flexShrink: 0,
          }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <button
          type="button"
          disabled={muted}
          onMouseDown={startPushToTalk}
          onMouseUp={stopPushToTalk}
          onMouseLeave={() => listening && stopPushToTalk()}
          title={muted ? 'Microphone muted' : 'Hold to talk'}
          aria-pressed={listening}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            background: listening ? 'var(--klip-accent)' : 'var(--klip-raised)',
            color: muted ? 'var(--klip-text-secondary)' : listening ? '#0c1013' : 'var(--klip-text-primary)',
            flexShrink: 0,
            opacity: muted ? 0.5 : 1,
          }}
        >
          🎙️
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a command…"
          aria-label="Message KLIP"
          style={{
            flex: 1,
            background: 'var(--klip-raised)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '0 10px',
            color: 'var(--klip-text-primary)',
            fontSize: 13,
          }}
        />
        <button
          type="submit"
          style={{ padding: '0 14px', borderRadius: 10, border: 'none', background: 'var(--klip-accent)', color: '#0c1013', fontWeight: 700, fontSize: 13 }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
