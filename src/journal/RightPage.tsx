import type { HandwritingStyle, SyncStatus } from '../types/journal';
import { soundEngine } from '../audio/soundEngine';

interface RightPageProps {
  currentDate: string;
  isFuture: boolean;
  entryText: string;
  handwritingStyle: HandwritingStyle;
  streak: number;
  isSaved: boolean;
  syncStatus?: SyncStatus;
  onChangeText: (text: string) => void;
  onOpenStats: () => void;
}

export const RightPage: React.FC<RightPageProps> = ({
  isFuture,
  entryText,
  handwritingStyle,
  streak,
  isSaved,
  syncStatus = 'saved',
  onChangeText,
  onOpenStats,
}) => {
  const fontClass = `font-style-${handwritingStyle}`;

  const getSyncText = () => {
    switch (syncStatus) {
      case 'saving':
        return 'Saving...';
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return 'Synced';
      case 'local_only':
        return 'Saved locally';
      case 'sync_error':
        return 'Sync failed';
      case 'offline':
        return 'Offline';
      case 'saved':
      default:
        return 'Saved';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Sound engine pen scratch on typing characters
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
      soundEngine.playPenScratch();
    }
  };

  if (isFuture) {
    return (
      <div className="page-surface page-right">
        <div className="future-locked-container">
          <div className="locked-flourish">⏳</div>
          <h2 className="locked-title">Not yet.</h2>
          <p className="locked-subtitle">
            Come back when the day has happened.<br />
            This page is patiently waiting for the future to unfold.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-surface page-right">
      {/* Wax Seal Streak Tracker */}
      <div 
        className="streak-wax-seal" 
        onClick={onOpenStats}
        title="Your writing streak — click to view history & statistics"
      >
        <span className="seal-number">{streak}</span>
        <span className="seal-label">DAYS</span>
      </div>

      {/* Ruled Writing Surface */}
      <div className="ruled-paper-layer">
        <textarea
          className={`handwriting-textarea ${fontClass}`}
          value={entryText}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Begin writing today's thoughts here... The ink will hold your words."
          autoFocus
          spellCheck={false}
        />
      </div>

      {/* Subtle Handwritten Auto-Save Indicator */}
      <div 
        className="saved-indicator"
        style={{ opacity: isSaved || syncStatus === 'saving' || syncStatus === 'syncing' ? 0.75 : 0 }}
      >
        {getSyncText()}
      </div>
    </div>
  );
};
