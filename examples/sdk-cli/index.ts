#!/usr/bin/env -S node --experimental-strip-types
/**
 * Independent SDK CLI — proves @klip/desktop-sdk works with no Electron,
 * React, Rive or agent runtime (docs/03-SRS.md FR-D-01, AC-10).
 *
 * Usage:
 *   npm run sdk-cli -- open notepad
 *   npm run sdk-cli -- reveal downloads
 *   npm run sdk-cli -- observe notepad
 */
import { KlipDesktopClient, newActionRequest, folderRegistry } from '../../packages/desktop-sdk/src/index.js';

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  const client = new KlipDesktopClient();
  const hello = await client.connect();
  console.log(`[sdk-cli] connected. protocolMajor=${hello.protocolMajor} capabilities=${hello.capabilities.join(', ')}`);

  if (cmd === 'open' && arg) {
    const req = newActionRequest('cli-task', { kind: 'app.open', appId: arg }, [{ kind: 'window.exists', appId: arg }]);
    const outcome = await client.execute(req);
    console.log('[sdk-cli] outcome:', JSON.stringify(outcome, null, 2));
  } else if (cmd === 'reveal' && arg) {
    const roots = folderRegistry() as Record<string, string>;
    const target = roots[arg] ?? arg;
    const req = newActionRequest('cli-task', { kind: 'file.reveal', path: target });
    const outcome = await client.execute(req);
    console.log('[sdk-cli] outcome:', JSON.stringify(outcome, null, 2));
  } else if (cmd === 'observe' && arg) {
    const snapshot = await client.observe({ appId: arg, fresh: true });
    console.log('[sdk-cli] snapshot:', JSON.stringify(snapshot, null, 2));
  } else {
    console.log('Usage: sdk-cli <open|reveal|observe> <target>');
    console.log('Examples: sdk-cli open notepad | sdk-cli reveal downloads | sdk-cli observe notepad');
  }

  await client.disconnect();
}

main().catch((err) => {
  console.error('[sdk-cli] error:', err);
  process.exitCode = 1;
});
