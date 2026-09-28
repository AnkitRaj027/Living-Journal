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
