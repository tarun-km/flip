import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

// Bundle our own workspace TS packages (they have no "main" build step); only
// externalize real npm dependencies such as electron/zod.
const WORKSPACE_PACKAGES = ['@klip/contracts', '@klip/desktop-sdk', '@klip/agent-runtime', '@klip/memory'];

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: WORKSPACE_PACKAGES })],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: WORKSPACE_PACKAGES })],
    build: {
      // Electron's sandboxed preload context cannot execute ESM import/export
      // syntax — it must be a single CommonJS file, regardless of the
      // package.json "type": "module" used elsewhere in this app.
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
        output: { format: 'cjs', entryFileNames: '[name].js' },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
});
