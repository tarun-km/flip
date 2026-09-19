import { useEffect, useState } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import type { CompanionState } from '@klip/contracts';
import { RIVE_ASSET_PATH, RIVE_ARTBOARD, RIVE_STATE_MACHINE, RIVE_STATE_NUMBER, RIVE_INPUTS } from '../lib/riveManifest';
import { CompanionCharacter } from './CompanionCharacter';

export interface CompanionProps {
  state: CompanionState;
  speechLevel: number;
  inputLevel: number;
  reducedMotion: boolean;
}

/**
 * Tries the real Rive asset first; renders the animated SVG fallback when it
 * is missing or fails to load (docs/07-DESIGN-GUIDEBOOK.md section 5: "A
 * missing Rive asset falls back to readable static state; do not show a
 * frozen 'working' character indefinitely"). No .riv ships in this baseline
 * build — drop assets/rive/klip.riv in and this switches over automatically.
 */
export function Companion(props: CompanionProps) {
  const [assetAvailable, setAssetAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(RIVE_ASSET_PATH, { method: 'HEAD' })
      .then((res) => {
        // The Vite dev server's SPA fallback returns 200 text/html for any
        // unmatched path, so a bare res.ok check would false-positive on a
        // missing .riv file. Require a non-HTML response too.
        const contentType = res.headers.get('content-type') ?? '';
        const ok = res.ok && !contentType.includes('text/html');
        if (!cancelled) setAssetAvailable(ok);
      })
      .catch(() => !cancelled && setAssetAvailable(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (assetAvailable) {
    return <RiveCompanion {...props} />;
  }
  return <CompanionCharacter {...props} />;
}

function RiveCompanion({ state, speechLevel, inputLevel, reducedMotion }: CompanionProps) {
  const { rive, RiveComponent } = useRive({
    src: RIVE_ASSET_PATH,
    artboard: RIVE_ARTBOARD,
    stateMachines: RIVE_STATE_MACHINE,
    autoplay: true,
  });

  const stateInput = useStateMachineInput(rive, RIVE_STATE_MACHINE, RIVE_INPUTS.state);
  const speechInput = useStateMachineInput(rive, RIVE_STATE_MACHINE, RIVE_INPUTS.speechLevel);
  const inputLevelInput = useStateMachineInput(rive, RIVE_STATE_MACHINE, RIVE_INPUTS.inputLevel);
  const reducedMotionInput = useStateMachineInput(rive, RIVE_STATE_MACHINE, RIVE_INPUTS.reducedMotion);

  useEffect(() => {
    if (stateInput) stateInput.value = RIVE_STATE_NUMBER[state];
  }, [stateInput, state]);
  useEffect(() => {
    if (speechInput) speechInput.value = speechLevel;
  }, [speechInput, speechLevel]);
  useEffect(() => {
    if (inputLevelInput) inputLevelInput.value = inputLevel;
  }, [inputLevelInput, inputLevel]);
  useEffect(() => {
    if (reducedMotionInput) reducedMotionInput.value = reducedMotion;
  }, [reducedMotionInput, reducedMotion]);

  return <RiveComponent aria-label={`KLIP is ${state}`} />;
}
