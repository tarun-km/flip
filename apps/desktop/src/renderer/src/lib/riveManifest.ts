/**
 * Pinned Rive asset contract (docs/07-DESIGN-GUIDEBOOK.md section 5).
 * Asset: assets/rive/klip.riv, artboard KlipCompanion, state machine KlipState.
 * No .riv asset ships in this baseline — CompanionCharacter falls back to a
 * readable animated SVG using this same numeric mapping, so dropping in a
 * real asset later is a swap, not a rewrite.
 */
import type { CompanionState } from '@klip/contracts';

export const RIVE_ASSET_PATH = './klip.riv';
export const RIVE_ARTBOARD = 'KlipCompanion';
export const RIVE_STATE_MACHINE = 'KlipState';

export const RIVE_STATE_NUMBER: Record<CompanionState, number> = {
  idle: 0,
  listening: 1,
  thinking: 2,
  speaking: 3,
  acting: 4,
  'awaiting-approval': 5,
  success: 6,
  error: 7,
};

export const RIVE_INPUTS = {
  state: 'state',
  speechLevel: 'speechLevel',
  inputLevel: 'inputLevel',
  gazeX: 'gazeX',
  gazeY: 'gazeY',
  reducedMotion: 'reducedMotion',
  blink: 'blink',
} as const;
