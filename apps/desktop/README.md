# @klip/desktop

Electron companion: frameless, transparent, always-on-top pill anchored to
the bottom-right work area, expanding into a conversation/history panel, with
an animated character (Rive-ready, SVG fallback shipped).

## Run

```bash
npm install
npm run dev --workspace=@klip/desktop
```

## Known baseline simplifications (tracked, not hidden)

- **Agent runtime location:** `KlipAgentRuntime` runs inside the Electron
  main process, not a separate Node utility process
  ([`02-SYSTEM-ARCHITECTURE.md`](../../0.%20documentation/02-SYSTEM-ARCHITECTURE.md)
  section 4 calls for the split). Fine for a single-user desktop baseline;
  revisit before claiming full process-isolation guarantees.
- **No native helper:** see `native/Klip.Windows/README.md`. Only
  app-launch / file-reveal / file-open / file-writeText / browser-search are
  real; `ui.*` UIA actions return `UNSUPPORTED_CAPABILITY` honestly.
- **No cloud:** see `cloud/cognition/README.md`. Open-ended conversation
  says so instead of fabricating an answer.
- **Voice:** Web Speech API, not the local sherpa-onnx pipeline — see the
  header comment in `src/renderer/src/lib/voice.ts`. Push-to-talk and text
  input are the reliable path.
- **Storage:** plaintext JSON via `@klip/memory`, not the AES-GCM/DPAPI +
  SQLite design in `04-SDD.md` section 8.
- **Rive:** no `.riv` asset is bundled; `Companion.tsx` falls back to an
  original animated SVG character with the same state contract.
