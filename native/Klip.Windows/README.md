# native/Klip.Windows — not yet implemented

This is the planned home of the C#/.NET Windows helper described in
[`04-SDD.md`](../../0.%20documentation/04-SDD.md) section 2: FlaUI/UIA3
accessibility, Win32 input, sherpa-onnx local voice, and DPAPI key handling.

**Current state:** the baseline build does not include this process.
`packages/desktop-sdk` implements a Node-only `LocalWindowsAdapter` that
covers the Priority-1 "typed native operation" tier (launch an allowlisted
app, reveal/open a file, write+verify a text file, browser search) directly
via Node's `child_process`/`fs`. It intentionally does **not** implement
`ui.invoke` / `ui.type` / `ui.key` / `ui.scroll` — those require real UIA3
tree access, which only this helper can provide.

**To build this out:**
1. .NET SDK (LTS) + FlaUI.UIA3, pinned per docs/04-SDD.md section 1.
2. JSON-RPC 2.0 over stdio, matching the `hello` / `desktop.observe` /
   `desktop.find` / `desktop.execute` method contract in
   [`10-API-CONTRACTS.md`](../../0.%20documentation/10-API-CONTRACTS.md)
   section 9.
3. Swap `LocalWindowsAdapter` in `packages/desktop-sdk/src/localAdapter.ts`
   for a transport that talks to this process — `KlipDesktopClient`'s public
   interface does not need to change.
