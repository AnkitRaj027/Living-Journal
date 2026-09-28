import type { MoodType, JournalEntry } from '../types/journal';
import { MOODS } from '../data/moods';
import { soundEngine } from '../audio/soundEngine';
import { Sparkles, History } from 'lucide-react';

interface LeftPageProps {
  currentDate: string; // YYYY-MM-DD
  prompt: string;
  mood: MoodType | null;
  gratitude: [string, string, string];
  nostalgicMemory: JournalEntry | null;
  onShufflePrompt: () => void;
  onSelectMood: (mood: MoodType) => void;
  onChangeGratitude: (index: number, value: string) => void;
  onJumpToDate: (date: string) => void;
}

export const LeftPage: React.FC<LeftPageProps> = ({
  currentDate,
  prompt,
  mood,
  gratitude,
  nostalgicMemory,
  onShufflePrompt,
  onSelectMood,
  onChangeGratitude,
  onJumpToDate,
}) => {
  // Format the date into classical presentation
  const dateObj = new Date(currentDate + 'T00:00:00');
  const dayNumber = dateObj.getDate();
  const monthName = dateObj.toLocaleString('default', { month: 'long' });
  const year = dateObj.getFullYear();
  const weekday = dateObj.toLocaleString('default', { weekday: 'long' });

  const handleMoodClick = (selectedMood: MoodType) => {
    soundEngine.playWaxStamp();
    onSelectMood(selectedMood);
  };

  return (
    <div className="page-surface page-left">
      {/* Date Classical Typography */}
      <div className="date-header">
        <div className="date-day-number">{dayNumber}</div>
        <div className="date-month-year">{monthName} {year}</div>
        <div className="date-weekday">{weekday}</div>
      </div>

      {/* Daily Reflective Question */}
      <div className="daily-question-card">
        <div className="question-label">
          <span>Question of the Day</span>
          <button 
            type="button" 
            className="shuffle-prompt-btn" 
            onClick={onShufflePrompt}
            title="Reflect on another question"
          >
            <Sparkles size={13} />
            <span>Another</span>
          </button>
        </div>
        <p className="question-text">"{prompt}"</p>
      </div>

      {/* Tactile Mood Wax Seals */}
      <div className="mood-section">
        <div className="mood-title">Tone of the Day</div>
        <div className="mood-stamps-row">
          {MOODS.map((m) => {
            const isSelected = mood === m.id;
            return (
              <button
                key={m.id}
                type="button"
                className={`mood-stamp-button ${isSelected ? 'selected' : ''}`}
                onClick={() => handleMoodClick(m.id)}
                title={`${m.label} — ${m.sublabel}`}
              >
                <div 
                  className="mood-wax-seal"
                  style={{ 
                    backgroundColor: m.sealColor,
                    color: m.textColor 
                  }}
                >
                  {m.symbol}
                </div>
                <span className="mood-label-text">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Three Things I'm Grateful For */}
      <div className="gratitude-section">
        <div className="gratitude-title">Three Gifts of Today</div>
        {[0, 1, 2].map((idx) => (
          <div key={idx} className="gratitude-line">
            <span className="gratitude-num">{idx + 1}.</span>
            <input
              type="text"
              className="gratitude-input"
              value={gratitude[idx] || ''}
              onChange={(e) => onChangeGratitude(idx, e.target.value)}
              placeholder="A simple grace..."
            />
          </div>
        ))}
      </div>

      {/* "A Year Ago Today..." Nostalgic Memory Card */}
      {nostalgicMemory && (
        <div 
          className="memory-card-nostalgia"
          onClick={() => onJumpToDate(nostalgicMemory.date)}
          title="Click to turn to this entry from a year ago"
        >
          <div className="memory-card-title">
            <span>A year ago today...</span>
            <History size={14} />
          </div>
          <div className="memory-card-snippet">
            "{nostalgicMemory.entryText.slice(0, 75)}..."
          </div>
        </div>
      )}
    </div>
  );
};
