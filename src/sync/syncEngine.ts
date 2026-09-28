import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { journalDB } from '../storage/db';
import type { JournalEntry, SyncStatus, DbJournalEntry } from '../types/journal';

class CloudSyncEngine {
  private syncStatusListeners: Set<(status: SyncStatus) => void> = new Set();
  private currentStatus: SyncStatus = 'saved';
  private syncQueue: Set<string> = new Set(); // Dates of entries pending cloud sync
  private isSyncing = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      this.loadPendingQueue();
    }
  }

  public subscribeStatus(listener: (status: SyncStatus) => void): () => void {
    this.syncStatusListeners.add(listener);
    listener(this.currentStatus);
    return () => {
      this.syncStatusListeners.delete(listener);
    };
  }

  public getStatus(): SyncStatus {
    return this.currentStatus;
  }

  private setStatus(status: SyncStatus) {
    this.currentStatus = status;
    this.syncStatusListeners.forEach(fn => fn(status));
  }

  private handleOnline() {
    this.isOnline = true;
    this.setStatus('syncing');
    // Flush pending queue when connection returns
    this.flushPendingQueue();
  }

  private handleOffline() {
    this.isOnline = false;
    this.setStatus('offline');
  }

  private loadPendingQueue() {
    try {
      const saved = localStorage.getItem('journal_pending_sync_dates');
      if (saved) {
        const dates: string[] = JSON.parse(saved);
        dates.forEach(d => this.syncQueue.add(d));
      }
    } catch {
      // Ignore
    }
  }

  private savePendingQueue() {
    try {
      localStorage.setItem('journal_pending_sync_dates', JSON.stringify(Array.from(this.syncQueue)));
    } catch {
      // Ignore
    }
  }

  /**
   * Converts local JournalEntry to database format
   */
  private entryToDbFormat(entry: JournalEntry, userId: string): DbJournalEntry {
    return {
      user_id: userId,
      entry_date: entry.date,
      content: entry.entryText || '',
      prompt: entry.prompt || '',
      mood: entry.mood || null,
      gratitude_1: entry.gratitude?.[0] || '',
      gratitude_2: entry.gratitude?.[1] || '',
      gratitude_3: entry.gratitude?.[2] || '',
      tags: entry.tags || [],
      updated_at: new Date(entry.updatedAt).toISOString(),
    };
  }

  /**
   * Converts database format to local JournalEntry
   */
  private dbFormatToEntry(row: DbJournalEntry): JournalEntry {
    const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : Date.now();
    const createdAt = row.created_at ? new Date(row.created_at).getTime() : updatedAt;

    return {
      date: row.entry_date,
      entryText: row.content || '',
      prompt: row.prompt || '',
      mood: row.mood || null,
      gratitude: [
        row.gratitude_1 || '',
        row.gratitude_2 || '',
        row.gratitude_3 || '',
      ],
      tags: row.tags || [],
      createdAt,
      updatedAt,
    };
  }

  /**
   * Syncs a single entry to Supabase (debounced by caller)
   */
  public async pushEntry(entry: JournalEntry, userId: string | null): Promise<void> {
    if (!userId || !isSupabaseConfigured) {
      this.setStatus('local_only');
      return;
    }

    if (!this.isOnline) {
      this.syncQueue.add(entry.date);
      this.savePendingQueue();
      this.setStatus('local_only');
      return;
    }

    try {
      this.setStatus('syncing');

      // First check remote updated_at for conflict avoidance
      const { data: remoteRow, error: checkError } = await supabase
        .from('journal_entries')
        .select('updated_at')
        .eq('user_id', userId)
        .eq('entry_date', entry.date)
        .maybeSingle();

      if (!checkError && remoteRow?.updated_at) {
        const remoteTime = new Date(remoteRow.updated_at).getTime();
        // If remote is strictly newer than our local version, do not overwrite!
        if (remoteTime > entry.updatedAt) {
          console.info('Remote entry is newer. Preserving remote version.');
          // Pull remote entry and update local cache
          const { data: fullRemote } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', userId)
            .eq('entry_date', entry.date)
            .single();

          if (fullRemote) {
            const merged = this.dbFormatToEntry(fullRemote as DbJournalEntry);
            await journalDB.saveEntry(merged, { preserveTimestamp: true });
          }
          this.setStatus('synced');
          return;
        }
      }

      // Upsert to Supabase
      const payload = this.entryToDbFormat(entry, userId);
      const { error } = await supabase
        .from('journal_entries')
        .upsert(payload, { onConflict: 'user_id,entry_date' });

      if (error) {
        throw error;
      }

      this.syncQueue.delete(entry.date);
      this.savePendingQueue();
      this.setStatus('synced');
    } catch {
      // Graceful sync failure fallback
      this.syncQueue.add(entry.date);
      this.savePendingQueue();
      this.setStatus('sync_error');
    }
  }

  /**
   * Pulls all entries from Supabase for this user and merges with local cache
   */
  public async syncAllFromCloud(userId: string): Promise<JournalEntry[]> {
    if (!userId || !isSupabaseConfigured) {
      return journalDB.getAllEntries();
    }

    if (!this.isOnline) {
      this.setStatus('offline');
      return journalDB.getAllEntries();
    }

    this.setStatus('syncing');
    this.isSyncing = true;

    try {
      // 1. Fetch all cloud entries for user
      const { data: remoteEntries, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });

      if (error) {
        throw error;
      }

      const remoteList = (remoteEntries || []).map(r => this.dbFormatToEntry(r as DbJournalEntry));
      const localEntries = await journalDB.getAllEntries();

      // Build map of remote entries by date
      const remoteMap = new Map<string, JournalEntry>();
      for (const r of remoteList) {
        remoteMap.set(r.date, r);
      }

      // 2. Deterministic conflict merge
      const mergedMap = new Map<string, JournalEntry>();
      const entriesToUpload: JournalEntry[] = [];

      // Process local entries
      for (const local of localEntries) {
        const remote = remoteMap.get(local.date);
        if (!remote) {
          // Exists locally only; if local has real text, queue for upload
          mergedMap.set(local.date, local);
          if (local.entryText?.trim()) {
            entriesToUpload.push(local);
          }
        } else {
          // Compare timestamps (last-write-wins)
          if (local.updatedAt > remote.updatedAt) {
            mergedMap.set(local.date, local);
            entriesToUpload.push(local);
          } else {
            mergedMap.set(local.date, remote);
          }
        }
      }

      // Add remote entries that do not exist locally
      for (const remote of remoteList) {
        if (!mergedMap.has(remote.date)) {
          mergedMap.set(remote.date, remote);
        }
      }

      const mergedList = Array.from(mergedMap.values());
      mergedList.sort((a, b) => b.date.localeCompare(a.date));

      // 3. Atomically write to local cache
      await journalDB.replaceEntries(mergedList);

      // 4. Upload any local-ahead entries in background
      if (entriesToUpload.length > 0) {
        for (const entry of entriesToUpload) {
          try {
            await supabase
              .from('journal_entries')
              .upsert(this.entryToDbFormat(entry, userId), { onConflict: 'user_id,entry_date' });
          } catch {
            this.syncQueue.add(entry.date);
          }
        }
      }

      this.setStatus('synced');
      return mergedList;
    } catch {
      this.setStatus('sync_error');
      return journalDB.getAllEntries();
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Imports local entries to user's cloud journal
   */
  public async importLocalToCloud(userId: string): Promise<{ success: boolean; count: number; error?: string }> {
    if (!userId || !isSupabaseConfigured) {
      return { success: false, count: 0, error: 'Supabase is not configured' };
    }

    try {
      this.setStatus('syncing');
      const localEntries = await journalDB.getAllEntries();
      const validEntries = localEntries.filter(e => e.date && (e.entryText?.trim() || e.prompt));

      let imported = 0;
      for (const entry of validEntries) {
        const payload = this.entryToDbFormat(entry, userId);
        const { error } = await supabase
          .from('journal_entries')
          .upsert(payload, { onConflict: 'user_id,entry_date' });

        if (!error) {
          imported++;
        }
      }

      // Mark migration complete in localStorage
      journalDB.markMigrated(userId);
      this.setStatus('synced');
      return { success: true, count: imported };
    } catch (err: unknown) {
      this.setStatus('sync_error');
      const message = err instanceof Error ? err.message : 'Import failed';
      return { success: false, count: 0, error: message };
    }
  }

  /**
   * Flushes any entries stored in the pending queue
   */
  private async flushPendingQueue() {
    if (this.syncQueue.size === 0 || this.isSyncing) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dates = Array.from(this.syncQueue);
      for (const d of dates) {
        const entry = await journalDB.getEntry(d);
        if (entry) {
          await this.pushEntry(entry, user.id);
        }
      }
    } catch {
      // Will retry on next online event
    }
  }
}

export const syncEngine = new CloudSyncEngine();
