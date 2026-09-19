# assets/rive — klip.riv not yet authored

Expected asset per
[`07-DESIGN-GUIDEBOOK.md`](../../0.%20documentation/07-DESIGN-GUIDEBOOK.md)
section 5: `klip.riv`, artboard `KlipCompanion`, state machine `KlipState`,
with inputs `state` (0–7), `speechLevel`, `inputLevel`, `gazeX`, `gazeY`,
`reducedMotion`, and a `blink` trigger — pinned in
`apps/desktop/src/renderer/src/lib/riveManifest.ts`.

`apps/desktop/src/renderer/src/components/Companion.tsx` already probes for
this file at runtime and will switch from the animated SVG fallback
(`CompanionCharacter.tsx`) to the real Rive asset automatically the moment a
`klip.riv` matching this contract is placed here and copied into
`apps/desktop/src/renderer/klip.riv` (Vite serves files from the renderer
root as static assets).
