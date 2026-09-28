import React, { useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { syncEngine } from '../sync/syncEngine';
import { journalDB } from '../storage/db';
import { BookOpen, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface MigrationModalProps {
  userId: string;
  onComplete: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({
  userId,
  onComplete,
}) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSuccess, setMigrationSuccess] = useState(false);
  const [migratedCount, setMigratedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleImport = async () => {
    setIsMigrating(true);
    setErrorMessage(null);
    soundEngine.playWaxStamp();

    try {
      const res = await syncEngine.importLocalToCloud(userId);
      if (res.success) {
        setMigratedCount(res.count);
        setMigrationSuccess(true);
        soundEngine.playPaperTurn('right');
        setTimeout(() => {
          onComplete();
        }, 1800);
      } else {
        setErrorMessage(res.error || 'Import failed. Your local data remains safe.');
        setIsMigrating(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setErrorMessage(message);
      setIsMigrating(false);
    }
  };

  const handleStartFresh = async () => {
    soundEngine.playPaperTurn('right');
    // Mark as migrated so we don't prompt again
    journalDB.markMigrated(userId);
    // Fetch user's existing cloud entries (if any) or clean slate
    await syncEngine.syncAllFromCloud(userId);
    onComplete();
  };

  return (
    <div className="antique-modal-backdrop">
      <div 
        className="antique-modal-card" 
        style={{ maxWidth: '480px', textAlign: 'center' }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Emblem */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #D5B766 0%, #B58B3C 70%, #75492B 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            color: '#170D08'
          }}>
            <BookOpen size={22} />
          </div>
        </div>

        <div style={{ 
          fontFamily: 'var(--font-classical)', 
          fontSize: '11px', 
          letterSpacing: '0.22em', 
          color: 'var(--c-brass-antique)', 
          textTransform: 'uppercase' 
        }}>
          Chronicle Found
        </div>

        <h2 style={{ 
          fontFamily: 'Cinzel, Georgia, serif', 
          fontSize: '22px', 
          fontWeight: 700,
          color: 'var(--c-leather-rich)', 
          margin: '6px 0 14px' 
        }}>
          Existing Pages Detected
        </h2>

        <p style={{ 
          fontFamily: 'var(--font-heading)', 
          fontStyle: 'italic', 
          fontSize: '18px', 
          color: '#2A1F17', 
          lineHeight: 1.45,
          marginBottom: '20px' 
        }}>
          Your journal has existing pages on this device. Would you like to import them into your private cloud account?
        </p>

        {migrationSuccess ? (
          <div style={{
            background: 'rgba(74, 107, 83, 0.15)',
            border: '1px solid rgba(74, 107, 83, 0.35)',
            borderRadius: '6px',
            padding: '16px',
            margin: '20px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            color: '#2E5339'
          }}>
            <CheckCircle2 size={22} />
            <span style={{ fontFamily: 'var(--font-classical)', fontSize: '13px', letterSpacing: '0.08em' }}>
              Successfully synchronized {migratedCount} entries to your cloud journal!
            </span>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div style={{
                background: 'rgba(109, 36, 36, 0.1)',
                border: '1px solid rgba(109, 36, 36, 0.3)',
                borderRadius: '6px',
                padding: '10px 14px',
                marginBottom: '16px',
                color: '#5A1818',
                fontSize: '12px'
              }}>
                {errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
              <button
                type="button"
                className="clasp-unlock-btn"
                style={{ width: '100%', justifyContent: 'center', margin: 0 }}
                onClick={handleImport}
                disabled={isMigrating}
              >
                <Sparkles size={16} />
                <span>{isMigrating ? 'Preserving and Uploading...' : 'Import Journal'}</span>
              </button>

              <button
                type="button"
                className="antique-btn"
                style={{ 
                  width: '100%', 
                  justifyContent: 'center', 
                  padding: '10px 20px',
                  background: 'rgba(216, 196, 158, 0.25)',
                  border: '1px solid rgba(181, 139, 60, 0.3)',
                  color: '#75492B'
                }}
                onClick={handleStartFresh}
                disabled={isMigrating}
              >
                <span>Start Fresh</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontFamily: 'var(--font-serif)',
          fontSize: '12px',
          color: '#75492B',
          opacity: 0.85,
          borderTop: '1px solid rgba(181, 139, 60, 0.2)',
          paddingTop: '12px'
        }}>
          <ShieldCheck size={15} color="var(--c-brass-antique)" />
          <span>Your local pages will never be deleted without successful synchronization.</span>
        </div>
      </div>
    </div>
  );
};
