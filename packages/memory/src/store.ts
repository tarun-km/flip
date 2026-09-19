/**
 * MemoryStore — local history/preferences/usage repository.
 *
 * Baseline build note (honesty per docs/04-SDD.md section 8 and
 * docs/09-SECURITY-TRUST.md section 8): this is a single plaintext JSON file,
 * not the SQLite + AES-GCM/DPAPI-encrypted design described in the docs.
 * Structural shape mirrors the documented schema so migrating to real SQLite +
 * DPAPI-wrapped envelopes later does not require a data-model rewrite.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { HistoryTaskEntry, PreferenceRecord, UsageRecord, Id } from '@klip/contracts';
import { newId, nowIso } from '@klip/contracts';

interface StoreShape {
  historyEnabled: boolean;
  tasks: HistoryTaskEntry[];
  preferences: PreferenceRecord[];
  usage: UsageRecord[];
}

const EMPTY_STORE: StoreShape = { historyEnabled: false, tasks: [], preferences: [], usage: [] };

export class MemoryStore {
  private data: StoreShape = structuredClone(EMPTY_STORE);
  private writeQueue: Promise<unknown> = Promise.resolve();
  private readonly filePath: string;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'klip-store.json');
  }

  async init(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      this.data = { ...structuredClone(EMPTY_STORE), ...JSON.parse(raw) };
    } catch {
      await this.persist();
    }
  }

  private async persist(): Promise<void> {
    const json = JSON.stringify(this.data, null, 2);
    this.writeQueue = this.writeQueue.then(() => fs.writeFile(this.filePath, json, 'utf-8'));
    await this.writeQueue;
  }

  get historyEnabled(): boolean {
    return this.data.historyEnabled;
  }

  async setHistoryEnabled(enabled: boolean): Promise<void> {
    this.data.historyEnabled = enabled;
    await this.persist();
  }

  async recordTask(entry: HistoryTaskEntry): Promise<void> {
    if (!this.data.historyEnabled) return;
    const idx = this.data.tasks.findIndex((t) => t.id === entry.id);
    if (idx >= 0) this.data.tasks[idx] = entry;
    else this.data.tasks.unshift(entry);
    this.data.tasks = this.data.tasks.slice(0, 200);
    await this.persist();
  }

  listHistory(limit = 50): HistoryTaskEntry[] {
    return this.data.tasks.slice(0, limit);
  }

  async forgetHistory(scope: 'all' | 'conversation' | 'preferences' = 'all'): Promise<void> {
    if (scope === 'all' || scope === 'conversation') this.data.tasks = [];
    if (scope === 'all' || scope === 'preferences') this.data.preferences = [];
    await this.persist();
  }

  async setPreference(scope: string, key: string, value: string, source: 'explicit' | 'inferred' = 'explicit'): Promise<PreferenceRecord> {
    const existing = this.data.preferences.find((p) => p.scope === scope && p.key === key);
    const record: PreferenceRecord = existing
      ? { ...existing, value, updatedAt: nowIso(), evidenceCount: existing.evidenceCount + 1 }
      : { id: newId(), scope, key, value, source, evidenceCount: 1, updatedAt: nowIso() };
    const idx = this.data.preferences.findIndex((p) => p.id === record.id);
    if (idx >= 0) this.data.preferences[idx] = record;
    else this.data.preferences.push(record);
    await this.persist();
    return record;
  }

  getPreference(scope: string, key: string): PreferenceRecord | undefined {
    return this.data.preferences.find((p) => p.scope === scope && p.key === key);
  }

  listPreferences(): PreferenceRecord[] {
    return this.data.preferences;
  }

  async deletePreference(id: Id): Promise<void> {
    this.data.preferences = this.data.preferences.filter((p) => p.id !== id);
    await this.persist();
  }

  async recordUsage(record: UsageRecord): Promise<void> {
    this.data.usage.push(record);
    this.data.usage = this.data.usage.slice(-2000);
    await this.persist();
  }

  listUsage(day?: string): UsageRecord[] {
    if (!day) return this.data.usage;
    return this.data.usage.filter((u) => u.createdAt.startsWith(day));
  }

  usageTotals(day?: string): { settledMicrousd: number; reservedMicrousd: number; localCount: number; cloudCount: number } {
    const rows = this.listUsage(day);
    let settledMicrousd = 0;
    let reservedMicrousd = 0;
    let localCount = 0;
    let cloudCount = 0;
    for (const r of rows) {
      if (r.provider !== 'none' && r.provider !== 'local') {
        cloudCount++;
        if (r.state === 'settled') settledMicrousd += r.estimatedCostMicrousd ?? 0;
        if (r.state === 'reserved') reservedMicrousd += r.reservedMicrousd;
      } else {
        localCount++;
      }
    }
    return { settledMicrousd, reservedMicrousd, localCount, cloudCount };
  }
}
