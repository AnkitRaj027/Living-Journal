import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { JournalAct, JournalEntry, LampIntensity, HandwritingStyle, MoodType } from './types/journal';
import { journalDB, calculateJournalStreak } from './storage/db';
import { getRandomPrompt } from './data/prompts';
import { soundEngine } from './audio/soundEngine';
import { DeskCanvas } from './scene/DeskCanvas';
import { JournalBook } from './journal/JournalBook';
import { CalendarPage } from './journal/CalendarPage';
import { SearchIndex } from './journal/SearchIndex';
import { StatsModal } from './journal/StatsModal';
import { 
  Volume2, 
  VolumeX, 
  Sun, 
  CloudRain, 
  Calendar as CalendarIcon, 
  Search as SearchIcon, 
  BookMarked,
  Sparkles,
  Lock
} from 'lucide-react';

export const App: React.FC = () => {
  // Current local date in YYYY-MM-DD
  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [currentDate, setCurrentDate] = useState<string>(getTodayDateStr);

  // Custom Embossed Journal Title (Option 4)
  const [journalTitle, setJournalTitle] = useState<string>(() => {
    return localStorage.getItem('journal_custom_title') || 'MY JOURNAL';
  });

  const handleUpdateJournalTitle = (newTitle: string) => {
    const sanitized = newTitle.trim().slice(0, 26) || 'MY JOURNAL';
    setJournalTitle(sanitized);
    localStorage.setItem('journal_custom_title', sanitized);
  };

  // Ensure currentDate never exceeds today's date
  useEffect(() => {
    const today = getTodayDateStr();
    if (currentDate > today) {
      setCurrentDate(today);
    }
  }, [currentDate]);

  // Journal Journey Act State
  const [act, setAct] = useState<JournalAct>('arrival');
  
  // Ambient & Environment Settings
  const [lampIntensity, setLampIntensity] = useState<LampIntensity>('reading');
  const [isRaining, setIsRaining] = useState<boolean>(false);
  const [soundActive, setSoundActive] = useState<boolean>(false);
  const [handwritingStyle, setHandwritingStyle] = useState<HandwritingStyle>('caveat');
  
  // Active Entry Data
  const [currentEntry, setCurrentEntry] = useState<JournalEntry>({
    date: getTodayDateStr(),
    entryText: '',
    prompt: getRandomPrompt(),
    mood: null,
    gratitude: ['', '', ''],
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  // Archive & Historical Memory State
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);
  const [nostalgicMemory, setNostalgicMemory] = useState<JournalEntry | null>(null);
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Modals
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return !localStorage.getItem('journal_onboarding_dismissed');
  });

  const saveTimeoutRef = useRef<number | null>(null);
  const isWritingTimeoutRef = useRef<number | null>(null);

  // Load all entries and current entry from IndexedDB
  const refreshEntries = useCallback(async () => {
    const entries = await journalDB.getAllEntries();
    setAllEntries(entries);

    // Load entry for currentDate
    const loaded = await journalDB.getEntry(currentDate);
    if (loaded) {
      setCurrentEntry(loaded);
    } else {
      // New fresh page
      setCurrentEntry({
        date: currentDate,
        entryText: '',
        prompt: getRandomPrompt(),
        mood: null,
        gratitude: ['', '', ''],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    // Check for nostalgic entry exactly 1 year ago
    const yearAgo = await journalDB.getEntryOneYearAgo(currentDate);
    setNostalgicMemory(yearAgo);
  }, [currentDate]);

  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);

  // Calculate Streak & Plant Stage
  const stats = calculateJournalStreak(allEntries);

  // Handle Sound Toggle
  const handleToggleSound = () => {
    const nextState = !soundActive;
    setSoundActive(nextState);
    soundEngine.setEnabled(nextState);
    if (nextState) {
      soundEngine.playClaspClick();
      if (isRaining) {
        soundEngine.startRainAudio();
      }
    } else {
      soundEngine.stopRainAudio();
    }
  };

  // Handle Rain Toggle
  const handleToggleRain = () => {
    const nextRaining = !isRaining;
    setIsRaining(nextRaining);
    if (nextRaining && soundActive) {
      soundEngine.startRainAudio();
    } else {
      soundEngine.stopRainAudio();
    }
  };

  // Handle Lamp Intensity Toggle
  const handleToggleLamp = () => {
    setLampIntensity(prev => {
      if (prev === 'dim') return 'reading';
      if (prev === 'reading') return 'bright';
      return 'dim';
    });
  };

  // Act Transitions
  const handleOpenJournal = () => {
    if (act !== 'arrival') return;
    setAct('opening');
    soundEngine.playClaspClick();
    setTimeout(() => {
      soundEngine.playPaperTurn('right');
      setAct('open');
    }, 1300);
  };

  const handleCloseJournal = () => {
    if (act !== 'open') return;
    setAct('closing');
    soundEngine.playPaperTurn('left');
    setTimeout(() => {
      setAct('arrival');
    }, 1400);
  };

  // Page Turning (Navigation) — Cannot wander into future unwritten days
  const handlePrevDay = () => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setCurrentDate(`${year}-${month}-${day}`);
  };

  const handleNextDay = () => {
    const today = getTodayDateStr();
    if (currentDate >= today) return; // Strictly locked: cannot go forward past today
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const nextDateStr = `${year}-${month}-${day}`;
    if (nextDateStr > today) return;
    setCurrentDate(nextDateStr);
  };

  const handleJumpToDate = (targetDate: string) => {
    const today = getTodayDateStr();
    if (targetDate > today) {
      setCurrentDate(today);
      return;
    }
    setCurrentDate(targetDate);
  };

  // Continuous Auto-Save to IndexedDB
  const triggerAutoSave = (updated: JournalEntry) => {
    setCurrentEntry(updated);
    
    // Trigger writing visual feedback for fountain pen on desk
    setIsWriting(true);
    if (isWritingTimeoutRef.current) clearTimeout(isWritingTimeoutRef.current);
    isWritingTimeoutRef.current = setTimeout(() => setIsWriting(false), 500);

    // Debounced persist
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await journalDB.saveEntry(updated);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2400);
      const entries = await journalDB.getAllEntries();
      setAllEntries(entries);
    }, 600);
  };

  const handleUpdateText = (text: string) => {
    triggerAutoSave({ ...currentEntry, entryText: text });
  };

  const handleUpdateMood = (mood: MoodType) => {
    triggerAutoSave({ ...currentEntry, mood });
  };

  const handleUpdateGratitude = (idx: number, val: string) => {
    const updatedGratitude: [string, string, string] = [...currentEntry.gratitude];
    updatedGratitude[idx] = val;
    triggerAutoSave({ ...currentEntry, gratitude: updatedGratitude });
  };

  const handleShufflePrompt = () => {
    soundEngine.playPaperTurn('right');
    const nextPrompt = getRandomPrompt(currentEntry.prompt);
    triggerAutoSave({ ...currentEntry, prompt: nextPrompt });
  };

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('journal_onboarding_dismissed', 'true');
    handleOpenJournal();
  };

  // Set of dates with recorded memories for the calendar
  const entryDatesSet = new Set(allEntries.map(e => e.date));

  return (
    <div className="journal-app-stage">
      {/* 3D WebGL Canvas for Walnut Desk, Lighting, Plant, Pen and Journal */}
      <DeskCanvas
        act={act}
        lampIntensity={lampIntensity}
        plantStage={stats.plantStage}
        isWriting={isWriting}
        journalTitle={journalTitle}
        onOpenJournal={handleOpenJournal}
        onToggleLamp={handleToggleLamp}
      />

      {/* Atmospheric Rain on Window Reflections */}
      {isRaining && <div className="rain-overlay" />}

      {/* Cinematic Vignette & Film Grain */}
      <div className="cinematic-vignette" />
      <div className="film-grain" />

      {/* Ambient Top Bar */}
      <header className="ambient-topbar">
        <div 
          className="ambient-brand interactive-brand" 
          onClick={() => setShowStats(true)}
          title="Click to customize embossed cover title & view provenance"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <BookMarked size={16} />
          <span>{journalTitle}</span>
          <span style={{ 
            fontFamily: 'var(--font-classical)', 
            fontSize: '9px', 
            letterSpacing: '0.12em', 
            color: 'var(--c-brass-antique)', 
            opacity: 0.85, 
            padding: '2px 5px', 
            borderRadius: '3px', 
            border: '1px solid rgba(181, 139, 60, 0.3)' 
          }}>
            EMBOSSED
          </span>
        </div>

        <div className="ambient-controls">
          {/* Calendar button */}
          <button 
            type="button" 
            className="antique-btn" 
            onClick={() => {
              soundEngine.playPaperTurn('right');
              setShowCalendar(true);
            }}
            title="Open Chronicle of Days (Calendar)"
          >
            <CalendarIcon size={14} />
            <span>Calendar</span>
          </button>

          {/* Search button */}
          <button 
            type="button" 
            className="antique-btn" 
            onClick={() => {
              soundEngine.playPaperTurn('right');
              setShowSearch(true);
            }}
            title="Search memory index & tags"
          >
            <SearchIcon size={14} />
            <span>Search</span>
          </button>

          {/* Lamp brightness toggle */}
          <button 
            type="button" 
            className="antique-btn antique-btn-icon" 
            onClick={() => {
              soundEngine.playLampClick();
              handleToggleLamp();
            }}
            title={`Lamp brightness: ${lampIntensity}`}
          >
            <Sun size={15} />
          </button>

          {/* Rain ambiance toggle */}
          <button 
            type="button" 
            className="antique-btn antique-btn-icon" 
            onClick={handleToggleRain}
            title={isRaining ? 'Clear evening' : 'Rain against the glass'}
            style={{ color: isRaining ? '#99C2EC' : undefined }}
          >
            <CloudRain size={15} />
          </button>

          {/* Web Audio Synthesizer toggle */}
          <button 
            type="button" 
            className="antique-btn antique-btn-icon" 
            onClick={handleToggleSound}
            title={soundActive ? 'Procedural Audio: Enabled' : 'Procedural Audio: Disabled'}
            style={{ color: soundActive ? 'var(--c-brass-glow)' : 'rgba(239, 227, 200, 0.5)' }}
          >
            {soundActive ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </header>

      {/* Act I: Arrival Experience UI Overlay */}
      {act === 'arrival' && (
        <div className="arrival-overlay">
          <p className="arrival-prompt">The desk is quiet. Your thoughts are waiting.</p>
          <button 
            type="button" 
            className="clasp-unlock-btn" 
            onClick={handleOpenJournal}
          >
            <Lock size={15} />
            <span>Open Journal</span>
          </button>
        </div>
      )}

      {/* Act III & IV: Open Two-Page Journal Spread */}
      {act === 'open' && (
        <JournalBook
          currentDate={currentDate}
          entry={currentEntry}
          nostalgicMemory={nostalgicMemory}
          handwritingStyle={handwritingStyle}
          streak={stats.currentStreak}
          isSaved={isSaved}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onJumpToDate={handleJumpToDate}
          onCloseBook={handleCloseJournal}
          onUpdateText={handleUpdateText}
          onUpdatePrompt={(prompt) => triggerAutoSave({ ...currentEntry, prompt })}
          onUpdateMood={handleUpdateMood}
          onUpdateGratitude={handleUpdateGratitude}
          onShufflePrompt={handleShufflePrompt}
          onOpenStats={() => setShowStats(true)}
        />
      )}

      {/* Chronicle of Days Calendar Modal */}
      {showCalendar && (
        <CalendarPage
          currentViewingDate={currentDate}
          entryDates={entryDatesSet}
          onSelectDate={handleJumpToDate}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* Archives & Memory Search Drawer */}
      {showSearch && (
        <SearchIndex
          entries={allEntries}
          onSelectEntry={handleJumpToDate}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Provenance & Stats Modal */}
      {showStats && (
        <StatsModal
          stats={{
            totalEntries: allEntries.length,
            currentStreak: stats.currentStreak,
            longestStreak: stats.longestStreak,
            totalWords: stats.totalWords,
            firstEntryDate: allEntries[allEntries.length - 1]?.date || null,
            plantStage: stats.plantStage
          }}
          journalTitle={journalTitle}
          onUpdateJournalTitle={handleUpdateJournalTitle}
          handwritingStyle={handwritingStyle}
          onChangeHandwriting={setHandwritingStyle}
          onRefreshEntries={refreshEntries}
          onClose={() => setShowStats(false)}
        />
      )}

      {/* First-Time Cinematic Onboarding Modal */}
      {showOnboarding && (
        <div className="antique-modal-backdrop" onClick={dismissOnboarding}>
          <div className="antique-modal-card" style={{ maxWidth: '480px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-classical)', fontSize: '12px', letterSpacing: '0.24em', color: 'var(--c-brass-antique)', textTransform: 'uppercase' }}>
              Welcome to
            </div>
            <h1 style={{ fontFamily: 'var(--font-classical)', fontSize: '28px', color: 'var(--c-leather-rich)', margin: '6px 0 16px' }}>
              The Living Journal
            </h1>
            <p style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: '18px', color: '#2A1F17', lineHeight: 1.5, marginBottom: '24px' }}>
              "A quiet digital world where your days are remembered, and time is given weight."
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', marginBottom: '28px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-classical)', fontSize: '13px', color: 'var(--c-brass-antique)', fontWeight: 700 }}>I.</span>
                <div>
                  <strong style={{ fontFamily: 'var(--font-classical)', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>OPEN</strong>
                  <p style={{ fontSize: '13px', color: '#75492B' }}>Click the brass clasp to unlock your leather-bound journal.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-classical)', fontSize: '13px', color: 'var(--c-brass-antique)', fontWeight: 700 }}>II.</span>
                <div>
                  <strong style={{ fontFamily: 'var(--font-classical)', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>WRITE</strong>
                  <p style={{ fontSize: '13px', color: '#75492B' }}>Reflect on thoughtful prompts, place a wax tone stamp, and write freely into the cream paper.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-classical)', fontSize: '13px', color: 'var(--c-brass-antique)', fontWeight: 700 }}>III.</span>
                <div>
                  <strong style={{ fontFamily: 'var(--font-classical)', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>TURN</strong>
                  <p style={{ fontSize: '13px', color: '#75492B' }}>Drag corners or use arrow keys to wander back through your chronicle of days.</p>
                </div>
              </div>
            </div>

            <button type="button" className="clasp-unlock-btn" style={{ margin: '0 auto' }} onClick={dismissOnboarding}>
              <Sparkles size={15} />
              <span>Begin Your Chronicle</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
