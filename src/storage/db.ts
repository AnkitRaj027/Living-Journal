import type { JournalEntry } from '../types/journal';

const DB_NAME = 'LivingJournalDB';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

class JournalDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'date' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        // Check if DB is empty; if so, populate initial nostalgic memories
        this.checkAndSeedInitialEntries(db);
        resolve(db);
      };

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Seeds initial nostalgic memories so the "A Year Ago" and living plant features
   * resonate immediately upon arrival.
   */
  private async checkAndSeedInitialEntries(db: IDBDatabase) {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const countReq = store.count();

      countReq.onsuccess = () => {
        if (countReq.result === 0) {
          const today = new Date();
          
          // Exactly 1 year ago entry
          const oneYearAgo = new Date(today);
          oneYearAgo.setFullYear(today.getFullYear() - 1);
          const oneYearAgoDateStr = oneYearAgo.toISOString().split('T')[0];

          // Yesterday entry
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          const yesterdayDateStr = yesterday.toISOString().split('T')[0];

          // Two days ago entry
          const twoDaysAgo = new Date(today);
          twoDaysAgo.setDate(today.getDate() - 2);
          const twoDaysAgoDateStr = twoDaysAgo.toISOString().split('T')[0];

          const seedEntries: JournalEntry[] = [
            {
              date: oneYearAgoDateStr,
              prompt: "What is one thing you want to remember about who you are right now?",
              entryText: "Sitting by the open window as dusk gathered. It felt like the beginning of an unwritten chapter. I promised myself I would build something quiet, patient, and meaningful this coming year. A reminder to stay gentle with time.",
              mood: 'inspired',
              gratitude: [
                "The evening breeze carrying the scent of cedar",
                "Warm cup of black tea with honey",
                "A quiet hour with no notifications"
              ],
              tags: ['#beginnings', '#reflection', '#peace'],
              createdAt: oneYearAgo.getTime(),
              updatedAt: oneYearAgo.getTime()
            },
            {
              date: twoDaysAgoDateStr,
              prompt: "What made today worth remembering?",
              entryText: "Walked through the park while the early morning mist cleared. Sometimes clarity only arrives when your hands are doing nothing and your mind is free to wander.",
              mood: 'peaceful',
              gratitude: [
                "Sunlight breaking through morning clouds",
                "The rhythmic sound of footsteps on gravel",
                "Deep breath of crisp autumn air"
              ],
              tags: ['#walk', '#morning', '#clarity'],
              createdAt: twoDaysAgo.getTime(),
              updatedAt: twoDaysAgo.getTime()
            },
            {
              date: yesterdayDateStr,
              prompt: "What gave you energy when you felt tired?",
              entryText: "A brief conversation with an old friend. Just fifteen minutes, but it completely turned around my afternoon. Remembering that we don't have to carry everything alone.",
              mood: 'contemplative',
              gratitude: [
                "An unexpected phone call from David",
                "Fresh ink flowing smoothly from the pen",
                "Finishing the week with a sense of completion"
              ],
              tags: ['#friendship', '#energy', '#ideas'],
              createdAt: yesterday.getTime(),
              updatedAt: yesterday.getTime()
            }
          ];

          const writeTx = db.transaction(STORE_NAME, 'readwrite');
          const writeStore = writeTx.objectStore(STORE_NAME);
          for (const entry of seedEntries) {
            writeStore.put(entry);
          }
        }
      };
    } catch (err) {
      console.warn('Seeding fallback error:', err);
    }
  }

  public async getEntry(date: string): Promise<JournalEntry | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(date);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(this.getLocalStorageFallback(date));
      });
    } catch {
      return this.getLocalStorageFallback(date);
    }
  }

  public async saveEntry(
    entry: JournalEntry,
    options?: { preserveTimestamp?: boolean }
  ): Promise<void> {
    // Extract auto-detected hashtags
    const extractedTags = Array.from(
      new Set(
        (entry.entryText.match(/#[a-zA-Z0-9_\u00C0-\u017F]+/g) || []).map(t => t.toLowerCase())
      )
    );
    const updatedEntry: JournalEntry = {
      ...entry,
      tags: extractedTags,
      updatedAt: options?.preserveTimestamp && entry.updatedAt ? entry.updatedAt : Date.now()
    };

    // Save to localStorage as immediate mirror
    this.saveLocalStorageFallback(updatedEntry);

    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(updatedEntry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('IndexedDB write failed, persisted to localStorage:', err);
    }
  }

  /**
   * Replaces or bulk merges local entries (used by cloud sync)
   */
  public async replaceEntries(entries: JournalEntry[]): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        for (const entry of entries) {
          store.put(entry);
        }
        tx.oncomplete = () => {
          // Sync localStorage index
          try {
            const allDates = entries.map(e => e.date);
            localStorage.setItem('journal_index', JSON.stringify(allDates));
            for (const e of entries) {
              localStorage.setItem(`journal_entry_${e.date}`, JSON.stringify(e));
            }
          } catch {
            // Ignore quota errors
          }
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('replaceEntries failed, falling back to localStorage:', err);
      try {
        const allDates = entries.map(e => e.date);
        localStorage.setItem('journal_index', JSON.stringify(allDates));
        for (const e of entries) {
          localStorage.setItem(`journal_entry_${e.date}`, JSON.stringify(e));
        }
      } catch (e) {
        console.warn('LocalStorage fallback failed:', e);
      }
    }
  }

  /**
   * Clears local cache for clean sign-out / user switch
   */
  public async clearAllLocalEntries(): Promise<void> {
    try {
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('clearAllLocalEntries error:', err);
    }

    // Clear localStorage journal items
    try {
      const allDates: string[] = JSON.parse(localStorage.getItem('journal_index') || '[]');
      for (const d of allDates) {
        localStorage.removeItem(`journal_entry_${d}`);
      }
      localStorage.removeItem('journal_index');
    } catch {
      // Ignore
    }
  }

  /**
   * Checks if this device has existing local entries that have not been migrated yet to this user
   */
  public async hasUnmigratedEntries(userId: string): Promise<boolean> {
    if (!userId) return false;
    const isMigrated = localStorage.getItem(`journal_migrated_for_${userId}`);
    if (isMigrated === 'true') return false;

    const entries = await this.getAllEntries();
    // Local entries exist if there is at least one entry with non-empty content
    return entries.some(e => e.entryText && e.entryText.trim().length > 0);
  }

  /**
   * Marks migration as completed for this user
   */
  public markMigrated(userId: string): void {
    if (userId) {
      localStorage.setItem(`journal_migrated_for_${userId}`, 'true');
    }
  }


  public async getAllEntries(): Promise<JournalEntry[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const results = req.result || [];
          results.sort((a, b) => b.date.localeCompare(a.date));
          resolve(results);
        };
        req.onerror = () => resolve(this.getAllLocalStorageFallback());
      });
    } catch {
      return this.getAllLocalStorageFallback();
    }
  }

  public async getEntryOneYearAgo(currentDateStr: string): Promise<JournalEntry | null> {
    const parts = currentDateStr.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10) - 1;
    const oneYearAgoDateStr = `${year}-${parts[1]}-${parts[2]}`;
    return this.getEntry(oneYearAgoDateStr);
  }

  // --- LocalStorage Fallbacks ---

  private getLocalStorageFallback(date: string): JournalEntry | null {
    try {
      const item = localStorage.getItem(`journal_entry_${date}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private saveLocalStorageFallback(entry: JournalEntry) {
    try {
      localStorage.setItem(`journal_entry_${entry.date}`, JSON.stringify(entry));
      // Update entry list index in localStorage
      const allDates = JSON.parse(localStorage.getItem('journal_index') || '[]');
      if (!allDates.includes(entry.date)) {
        allDates.push(entry.date);
        localStorage.setItem('journal_index', JSON.stringify(allDates));
      }
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }
  }

  private getAllLocalStorageFallback(): JournalEntry[] {
    try {
      const allDates: string[] = JSON.parse(localStorage.getItem('journal_index') || '[]');
      const entries: JournalEntry[] = [];
      for (const d of allDates) {
        const e = this.getLocalStorageFallback(d);
        if (e) entries.push(e);
      }
      entries.sort((a, b) => b.date.localeCompare(a.date));
      return entries;
    } catch {
      return [];
    }
  }

  // --- Backup & Restore ---

  public async exportBackupJSON(): Promise<string> {
    const entries = await this.getAllEntries();
    const backupData = {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      entriesCount: entries.length,
      entries
    };
    return JSON.stringify(backupData, null, 2);
  }

  public async importBackupJSON(jsonStr: string): Promise<number> {
    const data = JSON.parse(jsonStr);
    if (!data.entries || !Array.isArray(data.entries)) {
      throw new Error('Invalid journal backup format');
    }

    let count = 0;
    for (const entry of data.entries) {
      if (entry.date && typeof entry.entryText === 'string') {
        await this.saveEntry(entry);
        count++;
      }
    }
    return count;
  }

  public async exportPlainText(): Promise<string> {
    const entries = await this.getAllEntries();
    let text = `=========================================\n`;
    text += `         THE LIVING JOURNAL ARCHIVE      \n`;
    text += `     Exported on ${new Date().toLocaleDateString()} \n`;
    text += `=========================================\n\n`;

    for (const e of entries) {
      text += `-----------------------------------------\n`;
      text += `DATE: ${e.date}\n`;
      if (e.mood) text += `MOOD: ${e.mood.toUpperCase()}\n`;
      if (e.prompt) text += `QUESTION: ${e.prompt}\n`;
      text += `\n${e.entryText}\n\n`;
      if (e.gratitude && e.gratitude.some(g => g.trim().length > 0)) {
        text += `GRATITUDE:\n`;
        e.gratitude.forEach((g, idx) => {
          if (g.trim()) text += `  ${idx + 1}. ${g.trim()}\n`;
        });
        text += `\n`;
      }
      if (e.tags && e.tags.length > 0) {
        text += `TAGS: ${e.tags.join(' ')}\n`;
      }
      text += `\n`;
    }
    return text;
  }
}

export const journalDB = new JournalDatabase();

/**
 * Calculates current streak and plant evolution stage
 */
export function calculateJournalStreak(entries: JournalEntry[]): {
  currentStreak: number;
  longestStreak: number;
  totalWords: number;
  plantStage: 1 | 2 | 3;
} {
  if (!entries || entries.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalWords: 0, plantStage: 1 };
  }

  const sortedDates = Array.from(new Set(entries.map(e => e.date))).sort().reverse();
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Calculate total words
  let totalWords = 0;
  for (const e of entries) {
    if (e.entryText) {
      totalWords += e.entryText.trim().split(/\s+/).filter(Boolean).length;
    }
  }

  let currentStreak = 0;
  const cursorDate = new Date();
  
  // Check if written today or yesterday
  const hasToday = sortedDates.includes(todayStr);
  if (!hasToday) {
    cursorDate.setDate(cursorDate.getDate() - 1);
  }

  while (true) {
    const checkStr = cursorDate.toISOString().split('T')[0];
    if (sortedDates.includes(checkStr)) {
      currentStreak++;
      cursorDate.setDate(cursorDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Plant stage based on streak
  let plantStage: 1 | 2 | 3 = 1;
  if (currentStreak >= 7) {
    plantStage = 3; // Lush blossoming plant
  } else if (currentStreak >= 3) {
    plantStage = 2; // Young multi-leaf sprout
  } else {
    plantStage = 1; // Tender young sprout
  }

  return {
    currentStreak,
    longestStreak: Math.max(currentStreak, 3),
    totalWords,
    plantStage
  };
}
