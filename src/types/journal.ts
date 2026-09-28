export type MoodType = 'peaceful' | 'inspired' | 'contemplative' | 'weary' | 'stormy';

export type HandwritingStyle = 'caveat' | 'cedarville' | 'kalam';

export type LampIntensity = 'dim' | 'reading' | 'bright';

export interface JournalEntry {
  date: string; // YYYY-MM-DD
  entryText: string;
  prompt: string;
  mood: MoodType | null;
  gratitude: [string, string, string];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface JournalStats {
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  totalWords: number;
  firstEntryDate: string | null;
  plantStage: 1 | 2 | 3;
}

export type JournalAct = 
  | 'arrival'    // Act I: Closed book on peaceful desk, breathing light
  | 'opening'    // Act II: Clasp releases, cover swings, camera swoops in
  | 'open'       // Act III & IV: Two-page spread for writing & remembering
  | 'closing';   // Act V: Pages settle, book shuts with leather thud

export type SyncStatus = 
  | 'saving'       // "Saving..."
  | 'saved'        // "Saved" (local memory updated)
  | 'local_only'   // "Saved locally" (offline or cloud skipped)
  | 'syncing'      // "Syncing..."
  | 'synced'       // "Synced"
  | 'sync_error'   // "Sync failed"
  | 'offline';     // "Working offline"

export type AuthState = 
  | 'initializing'
  | 'authenticating'
  | 'authenticated'
  | 'unauthenticated'
  | 'signing_out'
  | 'error';

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbJournalEntry {
  id?: string;
  user_id: string;
  entry_date: string;
  content: string;
  prompt: string;
  mood: MoodType | null;
  gratitude_1: string;
  gratitude_2: string;
  gratitude_3: string;
  tags: string[];
  created_at?: string;
  updated_at?: string;
}

