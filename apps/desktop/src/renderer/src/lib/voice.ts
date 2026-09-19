/**
 * Voice I/O — TEMPORARY BASELINE SUBSTITUTE.
 *
 * docs/02-SYSTEM-ARCHITECTURE.md section 5 specifies local wake detection,
 * VAD/STT and TTS via sherpa-onnx inside the C# helper, with raw audio never
 * leaving the device. That native pipeline is not implemented yet.
 *
 * This module uses the Chromium's built-in Web Speech API instead, purely so
 * the companion has *some* working voice loop to demonstrate the UI/state
 * machine end to end. Be explicit with users: browser SpeechRecognition
 * typically sends audio to a cloud speech service — it is NOT the local,
 * zero-upload pipeline the product design promises (docs/09-SECURITY-TRUST.md
 * section 7). Treat this as push-to-talk only, off by default, and keep text
 * input as the reliable path until sherpa-onnx is wired into native/Klip.Windows.
 */

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition as SpeechRecognitionCtor) ?? (w.webkitSpeechRecognition as SpeechRecognitionCtor) ?? null;
}

export function isVoiceInputSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function isVoiceOutputSupported(): boolean {
  return 'speechSynthesis' in window;
}

export class PushToTalkSession {
  private recognition: SpeechRecognitionLike | null = null;

  start(onResult: (text: string, isFinal: boolean) => void, onError: (message: string) => void): boolean {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      onError('This browser build has no SpeechRecognition available; use text input instead.');
      return false;
    }
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      onResult(result[0].transcript, result.isFinal);
    };
    recognition.onerror = (event: any) => onError(String(event?.error ?? 'unknown speech recognition error'));
    recognition.onend = () => {
      this.recognition = null;
    };
    recognition.start();
    this.recognition = recognition;
    return true;
  }

  stop(): void {
    this.recognition?.stop();
    this.recognition = null;
  }
}

/**
 * Speaks text and drives a pseudo speech-level envelope (0..1) for mouth
 * animation. Web Speech does not expose real amplitude, so this is a timed
 * approximation, not phoneme-accurate lip sync (matching the honesty
 * requirement in docs/04-SDD.md section 10 even for the real TTS envelope).
 */
export function speak(text: string, onLevel: (level: number) => void, onDone: () => void): void {
  if (!isVoiceOutputSupported()) {
    onDone();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  let raf = 0;
  let start = 0;

  const tick = (t: number) => {
    if (!start) start = t;
    const level = 0.35 + 0.35 * Math.abs(Math.sin((t - start) / 90)) + 0.15 * Math.random();
    onLevel(Math.min(1, level));
    raf = requestAnimationFrame(tick);
  };

  utterance.onstart = () => {
    raf = requestAnimationFrame(tick);
  };
  utterance.onend = () => {
    cancelAnimationFrame(raf);
    onLevel(0);
    onDone();
  };
  utterance.onerror = () => {
    cancelAnimationFrame(raf);
    onLevel(0);
    onDone();
  };

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  window.speechSynthesis?.cancel();
}
