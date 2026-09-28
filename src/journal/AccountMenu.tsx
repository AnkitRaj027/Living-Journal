import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { syncEngine } from '../sync/syncEngine';
import { journalDB } from '../storage/db';
import { soundEngine } from '../audio/soundEngine';
import type { SyncStatus } from '../types/journal';
import { 
  X, 
  Download, 
  LogOut, 
  RefreshCw, 
  ShieldCheck, 
  CloudCheck, 
  CloudOff, 
  Check 
} from 'lucide-react';

interface AccountMenuProps {
  isOpen: boolean;
  syncStatus: SyncStatus;
  onClose: () => void;
  onRefreshEntries: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  isOpen,
  syncStatus,
  onClose,
  onRefreshEntries,
}) => {
  const { user, profile, signOut } = useAuth();
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    setSyncFeedback(null);
    soundEngine.playPaperTurn('right');
    try {
      await syncEngine.syncAllFromCloud(user.id);
      onRefreshEntries();
      setSyncFeedback('All entries up to date.');
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch {
      setSyncFeedback('Sync failed. Changes remain in local storage.');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleExportJSON = async () => {
    soundEngine.playPaperTurn('right');
    const jsonStr = await journalDB.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `living_journal_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTXT = async () => {
    soundEngine.playPaperTurn('right');
    const txtStr = await journalDB.exportPlainText();
    const blob = new Blob([txtStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `living_journal_notes_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSignOut = async () => {
    soundEngine.playLampClick();
    onClose();
    await signOut();
  };

  // Sync status label & icon
  const getSyncStatusDisplay = () => {
    switch (syncStatus) {
      case 'synced':
        return { label: 'Synced with Cloud', color: '#2E7D32', icon: <CloudCheck size={16} /> };
      case 'syncing':
      case 'saving':
        return { label: 'Synchronizing...', color: 'var(--c-brass-antique)', icon: <RefreshCw size={16} className="spinning-icon" /> };
      case 'local_only':
      case 'saved':
        return { label: 'Saved Locally', color: '#75492B', icon: <Check size={16} /> };
      case 'offline':
        return { label: 'Working Offline', color: '#888888', icon: <CloudOff size={16} /> };
      case 'sync_error':
        return { label: 'Sync Paused (Retrying)', color: '#8B2525', icon: <CloudOff size={16} /> };
      default:
        return { label: 'Ready', color: '#75492B', icon: <Check size={16} /> };
    }
  };

  const syncDisplay = getSyncStatusDisplay();
  const initials = (profile?.displayName || user.email || 'J')
    .split(' ')
    .map(s => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="antique-modal-backdrop" onClick={onClose}>
      <div 
        className="antique-modal-card" 
        style={{ maxWidth: '420px', padding: '30px 34px' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        {/* Account Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ 
            fontFamily: 'var(--font-classical)', 
            fontSize: '10px', 
            letterSpacing: '0.24em', 
            color: 'var(--c-brass-antique)', 
            textTransform: 'uppercase' 
          }}>
            Author Provenance
          </div>
          <h2 style={{ 
            fontFamily: 'Cinzel, Georgia, serif', 
            fontSize: '20px', 
            color: 'var(--c-leather-rich)', 
            marginTop: '2px' 
          }}>
            Account & Archive
          </h2>
        </div>

        {/* User Card */}
        <div style={{
          background: 'rgba(216, 196, 158, 0.35)',
          border: '1px solid rgba(181, 139, 60, 0.3)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '20px'
        }}>
          {profile?.avatarUrl ? (
            <img 
              src={profile.avatarUrl} 
              alt={profile.displayName || 'Author'} 
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                border: '2px solid var(--c-brass-antique)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #D5B766 0%, #B58B3C 70%, #75492B 100%)',
              color: '#170D08',
              fontFamily: 'var(--font-classical)',
              fontWeight: 700,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
            }}>
              {initials}
            </div>
          )}

          <div style={{ overflow: 'hidden' }}>
            <div style={{ 
              fontFamily: 'var(--font-serif)', 
              fontWeight: 700, 
              fontSize: '16px', 
              color: 'var(--c-leather-rich)',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden'
            }}>
              {profile?.displayName || 'Journal Author'}
            </div>
            <div style={{ 
              fontFamily: 'var(--font-serif)', 
              fontSize: '12px', 
              color: '#75492B',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden'
            }}>
              {user.email}
            </div>
            <div style={{ 
              fontSize: '10px', 
              fontFamily: 'var(--font-classical)', 
              color: 'var(--c-brass-antique)', 
              letterSpacing: '0.08em',
              marginTop: '2px'
            }}>
              GOOGLE AUTHENTICATED
            </div>
          </div>
        </div>

        {/* Cloud Sync Status Section */}
        <div style={{
          borderTop: '1px solid rgba(181, 139, 60, 0.25)',
          paddingTop: '14px',
          marginBottom: '18px'
        }}>
          <div style={{ 
            fontFamily: 'var(--font-classical)', 
            fontSize: '10px', 
            letterSpacing: '0.14em', 
            color: 'var(--c-brass-antique)', 
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            Cloud Synchronization
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: syncDisplay.color, fontSize: '13px', fontWeight: 600 }}>
              {syncDisplay.icon}
              <span>{syncDisplay.label}</span>
            </div>

            <button
              type="button"
              className="antique-btn"
              onClick={handleManualSync}
              disabled={isManualSyncing}
              style={{ padding: '6px 12px', fontSize: '12px' }}
              title="Force sync with Supabase cloud"
            >
              <RefreshCw size={12} className={isManualSyncing ? 'spinning-icon' : ''} />
              <span>{isManualSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {syncFeedback && (
            <div style={{ fontSize: '12px', color: '#2E7D32', fontStyle: 'italic', marginBottom: '8px' }}>
              {syncFeedback}
            </div>
          )}
        </div>

        {/* Archive & Export Section */}
        <div style={{
          borderTop: '1px solid rgba(181, 139, 60, 0.25)',
          paddingTop: '14px',
          marginBottom: '20px'
        }}>
          <div style={{ 
            fontFamily: 'var(--font-classical)', 
            fontSize: '10px', 
            letterSpacing: '0.14em', 
            color: 'var(--c-brass-antique)', 
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            Personal Export
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="antique-btn"
              onClick={handleExportJSON}
              style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '8px 10px' }}
              title="Export complete JSON backup of your personal entries"
            >
              <Download size={13} />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              className="antique-btn"
              onClick={handleExportTXT}
              style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '8px 10px' }}
              title="Export formatted text chronicle"
            >
              <Download size={13} />
              <span>Export Text</span>
            </button>
          </div>
        </div>

        {/* Sign Out Button */}
        <div style={{
          borderTop: '1px solid rgba(181, 139, 60, 0.25)',
          paddingTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#75492B' }}>
            <ShieldCheck size={14} color="var(--c-brass-antique)" />
            <span>Private & Encrypted</span>
          </div>

          <button
            type="button"
            className="antique-btn"
            onClick={handleSignOut}
            style={{
              background: 'rgba(109, 36, 36, 0.1)',
              borderColor: 'rgba(109, 36, 36, 0.3)',
              color: '#8B2525'
            }}
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
