import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { JournalAct, JournalEntry, LampIntensity, HandwritingStyle, MoodType, SyncStatus } from './types/journal';
import { journalDB, calculateJournalStreak } from './storage/db';
import { getRandomPrompt } from './data/prompts';
import { soundEngine } from './audio/soundEngine';
import { DeskCanvas } from './scene/DeskCanvas';
import { JournalBook } from './journal/JournalBook';
import { CalendarPage } from './journal/CalendarPage';
import { SearchIndex } from './journal/SearchIndex';
import { StatsModal } from './journal/StatsModal';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AuthModal } from './auth/AuthModal';
import { MigrationModal } from './auth/MigrationModal';
import { AccountMenu } from './journal/AccountMenu';
import { syncEngine } from './sync/syncEngine';
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

const JournalInnerApp: React.FC = () => {
  const { user, profile, authState } = useAuth();

  // Current local date in YYYY-MM-DD
  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [currentDate, setCurrentDate] = useState<string>(getTodayDateStr);

  // Custom Embossed Journal Title
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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');

  // Modals
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAccountMenu, setShowAccountMenu] = useState<boolean>(false);
  const [showMigrationModal, setShowMigrationModal] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return !localStorage.getItem('journal_onboarding_dismissed');
  });

  const saveTimeoutRef = useRef<number | null>(null);
  const isWritingTimeoutRef = useRef<number | null>(null);

  // Subscribe to sync status changes from sync engine
  useEffect(() => {
    const unsub = syncEngine.subscribeStatus((status) => {
      setSyncStatus(status);
    });
    return unsub;
  }, []);

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

  // When user is authenticated, check for migration and sync with Supabase cloud
  useEffect(() => {
    if (user && authState === 'authenticated') {
      journalDB.hasUnmigratedEntries(user.id).then((hasUnmigrated) => {
        if (hasUnmigrated) {
          setShowMigrationModal(true);
        } else {
          syncEngine.syncAllFromCloud(user.id).then((cloudEntries) => {
            setAllEntries(cloudEntries);
            refreshEntries();
          });
        }
      });
    }
  }, [user, authState, refreshEntries]);

  const previousUserRef = useRef<string | null>(null);

  // Only close open journal when user actively signs out from a session
  useEffect(() => {
    if (previousUserRef.current && !user) {
      if (act === 'open') {
        setAct('arrival');
      }
      refreshEntries();
    }
    previousUserRef.current = user ? user.id : null;
  }, [user, act, refreshEntries]);

  // Calculate Streak & Plant Stage from actual journal entries (consistent across all devices)
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
    if (currentDate >= today) return;
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

  // Continuous Debounced Auto-Save to Local Cache and Supabase Cloud
  const triggerAutoSave = (updated: JournalEntry) => {
    setCurrentEntry(updated);
    
    // Fountain pen writing feedback
    setIsWriting(true);
    if (isWritingTimeoutRef.current) clearTimeout(isWritingTimeoutRef.current);
    isWritingTimeoutRef.current = setTimeout(() => setIsWriting(false), 500);

    setSyncStatus('saving');

    // Debounced persist (~750ms)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      // 1. Instant local persistence
      await journalDB.saveEntry(updated);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2400);

      // 2. Push to Supabase if authenticated
      if (user?.id) {
        await syncEngine.pushEntry(updated, user.id);
      } else {
        setSyncStatus('local_only');
      }

      const entries = await journalDB.getAllEntries();
      setAllEntries(entries);
    }, 750);
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

  const userInitial = (profile?.displayName || user?.email || 'J')[0].toUpperCase();

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
          {/* Subtle Account Button / Google Sign In */}
          {user ? (
            <button
              type="button"
              className="antique-btn user-account-btn"
              onClick={() => {
                soundEngine.playPaperTurn('right');
                setShowAccountMenu(true);
              }}
              title={`Author: ${profile?.displayName || user.email} — Click for Cloud Sync & Settings`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                border: '1px solid rgba(181, 139, 60, 0.35)'
              }}
            >
              {profile?.avatarUrl ? (
                <img 
                  src={profile.avatarUrl} 
                  alt="" 
                  style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'var(--c-brass-antique)',
                  color: '#170D08',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}>
                  {userInitial}
                </span>
              )}
              <span style={{
                maxWidth: '90px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '12px'
              }}>
                {profile?.displayName?.split(' ')[0] || user.email?.split('@')[0]}
              </span>
              {/* Subtle Sync Indicator Dot */}
              <span 
                className={`sync-status-dot dot-${syncStatus}`}
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: syncStatus === 'synced' 
                    ? '#4CAF50' 
                    : syncStatus === 'syncing' || syncStatus === 'saving' 
                    ? '#FFC107' 
                    : syncStatus === 'offline' 
                    ? '#9E9E9E' 
                    : '#B58B3C',
                  boxShadow: syncStatus === 'synced' ? '0 0 6px rgba(76, 175, 80, 0.8)' : undefined
                }}
              />
            </button>
          ) : (
            <button
              type="button"
              className="antique-btn"
              onClick={() => {
                soundEngine.playClaspClick();
                setShowAuthModal(true);
              }}
              title="Sign in with Google to access your journal from any device"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Lock size={13} />
              <span>Sign In</span>
            </button>
          )}

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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <button 
              type="button" 
              className="clasp-unlock-btn" 
              onClick={handleOpenJournal}
            >
              <Sparkles size={16} />
              <span>Open Journal</span>
            </button>
            {(!user || authState === 'unauthenticated') && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClaspClick();
                  setShowAuthModal(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--c-brass-antique)',
                  fontFamily: 'var(--font-classical)',
                  fontSize: '11px',
                  letterSpacing: '0.14em',
                  cursor: 'pointer',
                  opacity: 0.85,
                  padding: '4px 8px',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Lock size={12} />
                <span>Sign in with Google to sync</span>
              </button>
            )}
          </div>
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
          syncStatus={syncStatus}
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

      {/* Journal-Themed Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        journalTitle={journalTitle}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Local Storage Migration Modal */}
      {showMigrationModal && user && (
        <MigrationModal
          userId={user.id}
          onComplete={() => {
            setShowMigrationModal(false);
            refreshEntries();
          }}
        />
      )}

      {/* Account & Synchronization Control */}
      <AccountMenu
        isOpen={showAccountMenu}
        syncStatus={syncStatus}
        onClose={() => setShowAccountMenu(false)}
        onRefreshEntries={refreshEntries}
      />

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

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <JournalInnerApp />
    </AuthProvider>
  );
};

export default App;
