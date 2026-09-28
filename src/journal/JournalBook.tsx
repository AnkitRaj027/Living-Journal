import React, { useEffect, useRef, useState } from 'react';
import type { JournalEntry, MoodType, HandwritingStyle } from '../types/journal';
import { LeftPage } from './LeftPage';
import { RightPage } from './RightPage';
import { soundEngine } from '../audio/soundEngine';
import { ChevronLeft, ChevronRight, XCircle, BookOpen } from 'lucide-react';

interface JournalBookProps {
  currentDate: string;
  entry: JournalEntry;
  nostalgicMemory: JournalEntry | null;
  handwritingStyle: HandwritingStyle;
  streak: number;
  isSaved: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onJumpToDate: (date: string) => void;
  onCloseBook: () => void;
  onUpdateText: (text: string) => void;
  onUpdatePrompt: (prompt: string) => void;
  onUpdateMood: (mood: MoodType) => void;
  onUpdateGratitude: (idx: number, val: string) => void;
  onShufflePrompt: () => void;
  onOpenStats: () => void;
}

export const JournalBook: React.FC<JournalBookProps> = ({
  currentDate,
  entry,
  nostalgicMemory,
  handwritingStyle,
  streak,
  isSaved,
  onPrevDay,
  onNextDay,
  onJumpToDate,
  onCloseBook,
  onUpdateText,
  onUpdateMood,
  onUpdateGratitude,
  onShufflePrompt,
  onOpenStats,
}) => {
  const bookRef = useRef<HTMLDivElement>(null);
  
  // Calculate reliable local today string (YYYY-MM-DD)
  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayDateStr();
  const isFuture = currentDate > todayStr;
  const isAtOrPastToday = currentDate >= todayStr;

  // Active 3D Flipping Leaf State
  const [flippingState, setFlippingState] = useState<'prev' | 'next' | null>(null);

  const handleFlipPrev = () => {
    if (flippingState) return;
    setFlippingState('prev');
    soundEngine.playPaperTurn('left');
    setTimeout(() => {
      onPrevDay();
    }, 280);
    setTimeout(() => {
      setFlippingState(null);
    }, 650);
  };

  const handleFlipNext = () => {
    if (flippingState || isAtOrPastToday) return; // Strict block: cannot go forward past today
    setFlippingState('next');
    soundEngine.playPaperTurn('right');
    setTimeout(() => {
      onNextDay();
    }, 280);
    setTimeout(() => {
      setFlippingState(null);
    }, 650);
  };

  const handleJumpToToday = () => {
    if (flippingState || currentDate === todayStr) return;
    setFlippingState('next');
    soundEngine.playPaperTurn('right');
    setTimeout(() => {
      onJumpToDate(todayStr);
    }, 280);
    setTimeout(() => {
      setFlippingState(null);
    }, 650);
  };

  // Keyboard navigation for page turning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'textarea' || activeTag === 'input') {
        return;
      }

      if (e.key === 'ArrowLeft') {
        handleFlipPrev();
      } else if (e.key === 'ArrowRight' && !isAtOrPastToday) {
        handleFlipNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrevDay, onNextDay, flippingState, isAtOrPastToday]);

  // Touch Swipe for Mobile Navigation
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleFlipPrev();
      } else if (!isAtOrPastToday) {
        handleFlipNext();
      }
    }
    touchStartX.current = null;
  };

  // Format readable navigation date label
  const dateObj = new Date(currentDate + 'T00:00:00');
  const navDateLabel = dateObj.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div 
      ref={bookRef}
      className="open-journal-wrapper interactive"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Leather Casing & Outer Stitched Border */}
      <div className="journal-leather-casing">
        <div className="journal-stitching" />
      </div>

      {/* Hanging Red Silk Ribbon Bookmark (Clicking returns to Today's spread) */}
      <div 
        className="bookmark-ribbon"
        onClick={handleJumpToToday}
        title={currentDate === todayStr ? "You are on today's page" : "Click ribbon to jump to today's entry"}
      />

      {/* Page Turn Trigger - Left Edge */}
      <div 
        className="page-turn-trigger trigger-left"
        onClick={handleFlipPrev}
        title="Turn back one day (or press ← key)"
      >
        <div className="turn-arrow-badge">
          <ChevronLeft size={18} />
        </div>
      </div>

      {/* Corner Hover Lift Peel - Left */}
      <div 
        className="corner-peel corner-peel-left"
        onClick={handleFlipPrev}
        title="Peel page back to yesterday"
      />

      {/* Main Two-Page Spread */}
      <div className="book-spread">
        {/* Left Page (Reflections, Date, Questions, Moods, Gratitude, Nostalgia) */}
        <LeftPage
          currentDate={currentDate}
          prompt={entry.prompt}
          mood={entry.mood}
          gratitude={entry.gratitude}
          nostalgicMemory={nostalgicMemory}
          onShufflePrompt={onShufflePrompt}
          onSelectMood={onUpdateMood}
          onChangeGratitude={onUpdateGratitude}
          onJumpToDate={onJumpToDate}
        />

        {/* Center Valley Spine Real Depth */}
        <div className="book-spine-depth" />

        {/* Right Page (Unbounded Writing Canvas or Locked Future Notice) */}
        <RightPage
          currentDate={currentDate}
          isFuture={isFuture}
          entryText={entry.entryText}
          handwritingStyle={handwritingStyle}
          streak={streak}
          isSaved={isSaved}
          onChangeText={onUpdateText}
          onOpenStats={onOpenStats}
        />
      </div>

      {/* 3D Dynamic Flipping Page Leaf */}
      {flippingState && (
        <div className="flipping-leaf-container">
          <div 
            className={`flipping-leaf ${
              flippingState === 'prev' 
                ? 'flipping-leaf-backward' 
                : 'flipping-leaf-forward'
            }`} 
          />
        </div>
      )}

      {/* Page Turn Trigger - Right Edge (Hidden on or past today) */}
      {!isAtOrPastToday && (
        <div 
          className="page-turn-trigger trigger-right"
          onClick={handleFlipNext}
          title="Turn forward one day (or press → key)"
        >
          <div className="turn-arrow-badge">
            <ChevronRight size={18} />
          </div>
        </div>
      )}

      {/* Corner Hover Lift Peel - Right (Hidden on or past today) */}
      {!isAtOrPastToday && (
        <div 
          className="corner-peel corner-peel-right"
          onClick={handleFlipNext}
          title="Peel page forward to tomorrow"
        />
      )}

      {/* Bottom Page Navigation Bar with Date & Curl Triggers */}
      <div className="journal-nav-bar">
        <button 
          type="button" 
          className="journal-nav-btn"
          onClick={handleFlipPrev}
          title="Turn to previous day"
        >
          <ChevronLeft size={14} />
          <span>Previous Day</span>
        </button>

        <div className="journal-nav-current" title="Currently viewing date">
          {navDateLabel}
        </div>

        <button 
          type="button" 
          className="journal-nav-btn"
          onClick={handleFlipNext}
          disabled={isAtOrPastToday}
          style={isAtOrPastToday ? { opacity: 0.25, cursor: 'not-allowed', pointerEvents: 'none' } : undefined}
          title={isAtOrPastToday ? "Today is the present — you cannot wander into unwritten tomorrows" : "Turn to next day"}
        >
          <span>Next Day</span>
          <ChevronRight size={14} />
        </button>

        {currentDate !== todayStr && (
          <button 
            type="button" 
            className="journal-nav-btn"
            onClick={handleJumpToToday}
            style={{ color: 'var(--c-brass-glow)', borderLeft: '1px solid rgba(181, 139, 60, 0.25)', paddingLeft: '10px' }}
            title="Return to today's active entry"
          >
            <BookOpen size={12} />
            <span>Today</span>
          </button>
        )}

        <button
          type="button"
          className="journal-nav-btn"
          onClick={onCloseBook}
          style={{ color: '#C97D7D', borderLeft: '1px solid rgba(181, 139, 60, 0.25)', paddingLeft: '10px' }}
          title="Rest journal and return to desk"
        >
          <XCircle size={13} />
          <span>Rest Journal</span>
        </button>
      </div>
    </div>
  );
};
