/**
 * Deterministic local command grammar (docs/06-ADAPTIVE-INTELLIGENCE.md section 2,
 * docs/04-SDD.md section 7). Recognized commands never touch the model provider.
 * Unrecognized input is NOT forced into the nearest supported command — it
 * falls through to the supervisor/conversation agent.
 */
import type { Action } from '@klip/contracts';
import { APP_REGISTRY, folderRegistry } from '@klip/desktop-sdk';
import path from 'node:path';

export type RouterMatch =
  | { kind: 'greeting' }
  | { kind: 'help' }
  | { kind: 'mute'; muted: boolean }
  | { kind: 'cancel' }
  | { kind: 'usage' }
  | { kind: 'open-app'; appId: string }
  | { kind: 'open-folder'; folderId: string; path: string }
  | { kind: 'latest-download' }
  | { kind: 'browser-search'; engine: 'google' | 'bing'; query: string }
  | { kind: 'write-note'; content: string }
  | { kind: 'clarify'; question: string };

const APP_ALIASES: Record<string, string> = {
  notepad: 'notepad',
  explorer: 'explorer',
  'file explorer': 'explorer',
  files: 'explorer',
  calculator: 'calculator',
  calc: 'calculator',
  chrome: 'chrome',
  'google chrome': 'chrome',
};

const FOLDER_ALIASES = ['downloads', 'documents', 'desktop', 'pictures'] as const;

export class LocalRouter {
  route(rawText: string): RouterMatch | null {
    const text = rawText.trim().toLowerCase().replace(/^hey klip[, ]*/i, '').replace(/[.!?]+$/, '');
    if (!text) return null;

    if (/^(hi|hello|hey|what'?s up|yo)\b/.test(text)) return { kind: 'greeting' };
    if (/^(help|what can you do)\b/.test(text)) return { kind: 'help' };
    if (/^mute\b/.test(text)) return { kind: 'mute', muted: true };
    if (/^unmute\b/.test(text)) return { kind: 'mute', muted: false };
    if (/^(cancel|stop)\b/.test(text)) return { kind: 'cancel' };
    if (/what did (you|i) spend|show (my )?(usage|spending)|what'?s my (usage|spend)/.test(text)) return { kind: 'usage' };

    const latestDownload = /latest download|newest download/.test(text);
    if (latestDownload) return { kind: 'latest-download' };

    const openApp = text.match(/^open (my )?([a-z ]+?)\s*$/);
    if (openApp) {
      const name = openApp[2].trim();
      const appId = APP_ALIASES[name];
      if (appId) return { kind: 'open-app', appId };
    }

    const openFolder = text.match(/^(open|show|reveal) (my )?([a-z]+)\s*(folder)?\s*$/);
    if (openFolder) {
      const folderName = openFolder[3];
      if ((FOLDER_ALIASES as readonly string[]).includes(folderName)) {
        const roots = folderRegistry();
        return { kind: 'open-folder', folderId: folderName, path: (roots as Record<string, string>)[folderName] };
      }
    }

    const search = text.match(/^search(?: (google|bing))? for (.+)$/);
    if (search) {
      return { kind: 'browser-search', engine: (search[1] as 'google' | 'bing') ?? 'google', query: search[2] };
    }

    const draft = text.match(/replace the draft (?:text|note) with ['"](.+)['"]$/) ?? text.match(/^(?:write|set) (?:the )?(?:draft|note) to ['"](.+)['"]$/);
    if (draft) return { kind: 'write-note', content: draft[1] };

    if (/^(create|open) (a )?(new )?(draft )?note$/.test(text)) return { kind: 'write-note', content: 'Draft note created by KLIP.' };

    // "open the latest thing" style ambiguity — ask rather than guess (docs/06 section 2).
    if (/^open (my )?(latest|newest) (thing|file|item)$/.test(text)) {
      return { kind: 'clarify', question: 'Do you mean your latest download, or a specific folder?' };
    }

    return null;
  }

  knownAppIds(): string[] {
    return Object.keys(APP_REGISTRY);
  }
}

export function noteDraftPath(): string {
  return path.join(folderRegistry().klip, 'draft.txt');
}

export function draftNoteAction(content: string, expectedSha256: string | null): Action {
  return { kind: 'file.writeText', path: noteDraftPath(), content, expectedSha256 };
}
