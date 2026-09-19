import { useEffect, useRef, useState } from 'react';
import type { CompanionState } from '@klip/contracts';
import './CompanionCharacter.css';

export interface CompanionCharacterProps {
  state: CompanionState;
  speechLevel: number; // 0..1 local TTS amplitude envelope
  inputLevel: number; // 0..1 local microphone level while listening
  reducedMotion: boolean;
}

/**
 * The "advanced pet": an original animated SVG character standing in for the
 * real Rive asset (assets/rive/klip.riv, not yet authored). Uses the exact
 * same state/level contract as riveManifest.ts so swapping in a real .riv
 * later needs no change to callers (docs/07-DESIGN-GUIDEBOOK.md section 5).
 */
export function CompanionCharacter({ state, speechLevel, inputLevel, reducedMotion }: CompanionCharacterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    function onMove(e: PointerEvent) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const proximity = 260;
      const dist = Math.hypot(dx, dy);
      if (dist > proximity) {
        setGaze({ x: 0, y: 0 });
        return;
      }
      setGaze({ x: clamp(dx / proximity, -1, 1), y: clamp(dy / proximity, -1, 1) });
    }
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [reducedMotion]);

  useEffect(() => {
    if (state !== 'idle' || reducedMotion) return;
    let timeout: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      timeout = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 140);
        scheduleBlink();
      }, 3200 + Math.random() * 2600);
    };
    scheduleBlink();
    return () => clearTimeout(timeout);
  }, [state, reducedMotion]);

  const pupilX = gaze.x * 4;
  const pupilY = gaze.y * 3;
  const mouthOpenAmount = state === 'speaking' ? 3 + speechLevel * 13 : 0;

  return (
    <div
      className="klip-character"
      data-state={state}
      data-blink={blinking}
      data-reduced-motion={reducedMotion}
      ref={containerRef}
      style={{ ['--input-level' as string]: inputLevel, ['--speech-level' as string]: speechLevel }}
    >
      <svg viewBox="0 0 160 160" width="100%" height="100%" role="img" aria-label={`KLIP is ${describeState(state)}`}>
        <defs>
          <linearGradient id="klip-body-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#232a33" />
            <stop offset="100%" stopColor="#171b21" />
          </linearGradient>
        </defs>

        <circle className="klip-ring" cx="80" cy="90" r="62" />

        <path className="klip-ear" d="M42 60 L30 24 L58 48 Z" />
        <path className="klip-ear" d="M118 60 L130 24 L102 48 Z" />

        <ellipse className="klip-body" cx="80" cy="92" rx="52" ry="46" />

        <line x1="80" y1="46" x2="80" y2="27" className="klip-antenna-stem" />
        <circle cx="80" cy="23" r="5" className="klip-antenna-gem" />

        <g transform={`translate(${pupilX}, ${pupilY})`}>
          <ellipse className="klip-eye" cx="62" cy="86" rx="9" ry="11" />
          <ellipse className="klip-eye" cx="98" cy="86" rx="9" ry="11" />
          {!blinking && (
            <>
              <circle className="klip-pupil" cx={62 + pupilX * 0.3} cy="87" r="3.6" />
              <circle className="klip-pupil" cx={98 + pupilX * 0.3} cy="87" r="3.6" />
            </>
          )}
        </g>

        <Mouth state={state} openAmount={mouthOpenAmount} />
      </svg>

      {state === 'success' && <div className="klip-sparkles" aria-hidden />}
    </div>
  );
}

function Mouth({ state, openAmount }: { state: CompanionState; openAmount: number }) {
  if (state === 'speaking' && openAmount > 0.5) {
    return <ellipse className="klip-mouth" cx="80" cy="112" rx="12" ry={openAmount} />;
  }
  if (state === 'success') {
    return <path className="klip-mouth-line" d="M64 108 Q80 124 96 108" />;
  }
  if (state === 'error') {
    return <path className="klip-mouth-line" d="M64 116 Q80 104 96 116" />;
  }
  if (state === 'awaiting-approval') {
    return <path className="klip-mouth-line" d="M68 111 L92 111" />;
  }
  return <path className="klip-mouth-line" d="M66 108 Q80 116 94 108" />;
}

function describeState(state: CompanionState): string {
  switch (state) {
    case 'idle': return 'available';
    case 'listening': return 'listening';
    case 'thinking': return 'thinking';
    case 'speaking': return 'speaking';
    case 'acting': return 'performing an action';
    case 'awaiting-approval': return 'waiting for your approval';
    case 'success': return 'finished successfully';
    case 'error': return 'reporting an error';
    default: return state;
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
