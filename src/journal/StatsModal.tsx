import React, { useRef, useState } from 'react';
import type { JournalStats, HandwritingStyle } from '../types/journal';
import { journalDB } from '../storage/db';
import { soundEngine } from '../audio/soundEngine';
import { Flame, BookOpen, PenTool, Download, Upload, Printer, X, ShieldCheck, Sparkles, Check } from 'lucide-react';

interface StatsModalProps {
  stats: JournalStats;
  journalTitle: string;
  onUpdateJournalTitle: (title: string) => void;
  handwritingStyle: HandwritingStyle;
  onChangeHandwriting: (style: HandwritingStyle) => void;
  onRefreshEntries: () => void;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  stats,
  journalTitle,
  onUpdateJournalTitle,
  handwritingStyle,
  onChangeHandwriting,
  onRefreshEntries,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [titleInput, setTitleInput] = useState(journalTitle);
  const [embossedSaved, setEmbossedSaved] = useState(false);

  const handleApplyTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;
    soundEngine.playWaxStamp();
    onUpdateJournalTitle(titleInput);
    setEmbossedSaved(true);
    setTimeout(() => setEmbossedSaved(false), 2600);
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

  const handlePrint = () => {
    window.print();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const count = await journalDB.importBackupJSON(text);
      soundEngine.playWaxStamp();
      alert(`Restored ${count} journal memories successfully!`);
      onRefreshEntries();
      onClose();
    } catch (err) {
      alert(`Failed to import backup: ${err instanceof Error ? err.message : 'Invalid JSON file'}`);
    }
  };

  return (
    <div className="antique-modal-backdrop" onClick={onClose}>
      <div className="antique-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{ 
            fontFamily: 'var(--font-classical)', 
            fontSize: '11px', 
            letterSpacing: '0.24em', 
            color: 'var(--c-brass-antique)', 
            textTransform: 'uppercase' 
          }}>
            Heirloom Chronicle
          </div>
          <h2 style={{ 
            fontFamily: 'var(--font-serif)', 
            fontSize: '24px', 
            color: 'var(--c-leather-rich)', 
            marginTop: '4px' 
          }}>
            Journal Provenance & Memory
          </h2>
        </div>

        {/* Statistics Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '12px', 
          marginBottom: '24px' 
        }}>
          <div style={{ 
            background: 'rgba(216, 196, 158, 0.3)', 
            border: '1px solid rgba(181, 139, 60, 0.25)', 
            borderRadius: '6px', 
            padding: '12px', 
            textAlign: 'center' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--c-wax-crimson)', marginBottom: '4px' }}>
              <Flame size={20} />
            </div>
            <div style={{ fontFamily: 'var(--font-classical)', fontSize: '20px', fontWeight: 700 }}>
              {stats.currentStreak}
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '11px', color: '#75492B' }}>
              Day Streak
            </div>
          </div>

          <div style={{ 
            background: 'rgba(216, 196, 158, 0.3)', 
            border: '1px solid rgba(181, 139, 60, 0.25)', 
            borderRadius: '6px', 
            padding: '12px', 
            textAlign: 'center' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--c-brass-antique)', marginBottom: '4px' }}>
              <BookOpen size={20} />
            </div>
            <div style={{ fontFamily: 'var(--font-classical)', fontSize: '20px', fontWeight: 700 }}>
              {stats.totalEntries}
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '11px', color: '#75492B' }}>
              Written Pages
            </div>
          </div>

          <div style={{ 
            background: 'rgba(216, 196, 158, 0.3)', 
            border: '1px solid rgba(181, 139, 60, 0.25)', 
            borderRadius: '6px', 
            padding: '12px', 
            textAlign: 'center' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--c-leather-rich)', marginBottom: '4px' }}>
              <PenTool size={20} />
            </div>
            <div style={{ fontFamily: 'var(--font-classical)', fontSize: '20px', fontWeight: 700 }}>
              {stats.totalWords}
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '11px', color: '#75492B' }}>
              Total Words
            </div>
          </div>
        </div>

        {/* Plant Status Meaning */}
        <div style={{ 
          background: 'rgba(74, 107, 83, 0.1)', 
          borderLeft: '3px solid #4A6B53', 
          padding: '12px 16px', 
          borderRadius: '0 6px 6px 0',
          marginBottom: '24px'
        }}>
          <div style={{ 
            fontFamily: 'var(--font-classical)', 
            fontSize: '11px', 
            color: '#4A6B53', 
            letterSpacing: '0.12em',
            textTransform: 'uppercase'
          }}>
            The Desk Plant
          </div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: '#2A1F17', marginTop: '2px' }}>
            {stats.plantStage === 1 && "Stage 1: A tender young sprout emerging from the soil. Keep writing to nurture it."}
            {stats.plantStage === 2 && "Stage 2: Four delicate green leaves unfurling in the lamp's light. Consistency takes root."}
            {stats.plantStage === 3 && "Stage 3: Flourishing foliage with a morning bloom. Your dedication has brought life to the desk."}
          </p>
        </div>

        {/* Custom Embossed Title / Initials on 3D Leather Cover (Option 4) */}
        <div style={{ 
          background: 'rgba(56, 32, 20, 0.08)',
          border: '1px solid rgba(181, 139, 60, 0.35)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '10px' 
          }}>
            <div style={{ 
              fontFamily: 'var(--font-classical)', 
              fontSize: '11px', 
              color: 'var(--c-brass-antique)', 
              letterSpacing: '0.14em', 
              textTransform: 'uppercase' 
            }}>
              Embossed Cover Inscription
            </div>
            {embossedSaved && (
              <span style={{ 
                fontFamily: 'var(--font-classical)', 
                fontSize: '11px', 
                color: '#2e7d32', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px' 
              }}>
                <Check size={13} />
                Debossed onto 3D Leather Cover
              </span>
            )}
          </div>

          {/* Live Gold Foil Debossed Preview Plaque */}
          <div style={{
            background: '#382014',
            border: '2px solid rgba(181, 139, 60, 0.65)',
            borderRadius: '6px',
            padding: '14px',
            textAlign: 'center',
            marginBottom: '12px',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8), 0 3px 8px rgba(0,0,0,0.25)',
            position: 'relative',
          }}>
            <div style={{
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: '17px',
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: '#D5B766',
              textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(213, 183, 102, 0.45)',
              textTransform: 'uppercase'
            }}>
              {(titleInput || 'MY JOURNAL').trim()}
            </div>
            <div style={{
              width: '90px',
              height: '1px',
              background: 'rgba(213, 183, 102, 0.6)',
              margin: '6px auto 0'
            }} />
          </div>

          {/* Input & Action Form */}
          <form onSubmit={handleApplyTitle} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value.slice(0, 26))}
              placeholder="e.g. ELEANOR'S CHRONICLE, A.V., MY JOURNAL"
              style={{
                flex: 1,
                padding: '9px 12px',
                background: 'rgba(216, 196, 158, 0.45)',
                border: '1px solid var(--c-brass-antique)',
                borderRadius: '5px',
                fontFamily: 'Cinzel, serif',
                fontSize: '13px',
                letterSpacing: '0.08em',
                color: 'var(--c-leather-rich)',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              className="antique-btn"
              style={{
                background: 'linear-gradient(135deg, rgba(181, 139, 60, 0.25), rgba(138, 98, 43, 0.35))',
                border: '1px solid var(--c-brass-antique)',
                color: 'var(--c-leather-rich)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <Sparkles size={13} />
              <span>Emboss into Leather</span>
            </button>
          </form>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '11px', color: '#75492B', opacity: 0.8, marginTop: '6px', marginBottom: 0 }}>
            Updates the gold foil inscription stamped directly onto the 3D leather journal cover in real time.
          </p>
        </div>

        {/* Handwriting Style Selection */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            fontFamily: 'var(--font-classical)', 
            fontSize: '11px', 
            color: 'var(--c-brass-antique)', 
            letterSpacing: '0.14em', 
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            Handwriting Script Style
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { id: 'caveat' as HandwritingStyle, name: 'Casual Script', preview: 'Caveat' },
              { id: 'cedarville' as HandwritingStyle, name: 'Vintage Cursive', preview: 'Cedarville' },
              { id: 'kalam' as HandwritingStyle, name: 'Organic Ink', preview: 'Kalam' }
            ].map(style => (
              <button
                key={style.id}
                type="button"
                onClick={() => {
                  soundEngine.playPenScratch();
                  onChangeHandwriting(style.id);
                }}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: handwritingStyle === style.id ? '2px solid var(--c-brass-antique)' : '1px solid rgba(181, 139, 60, 0.2)',
                  background: handwritingStyle === style.id ? 'rgba(181, 139, 60, 0.18)' : 'transparent',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', fontWeight: 600 }}>
                  {style.name}
                </div>
                <div className={`font-style-${style.id}`} style={{ fontSize: '16px', color: '#75492B', marginTop: '4px' }}>
                  The living journal
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Export & Backup Actions */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            fontFamily: 'var(--font-classical)', 
            fontSize: '11px', 
            color: 'var(--c-brass-antique)', 
            letterSpacing: '0.14em', 
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            Archive & Safeguard
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button 
              type="button" 
              className="antique-btn" 
              onClick={handleExportJSON}
              title="Download full JSON backup"
            >
              <Download size={14} />
              <span>Export JSON Backup</span>
            </button>
            <button 
              type="button" 
              className="antique-btn" 
              onClick={handleExportTXT}
              title="Download plain text archive"
            >
              <Download size={14} />
              <span>Export Text File</span>
            </button>
            <button 
              type="button" 
              className="antique-btn" 
              onClick={handlePrint}
              title="Print formatted journal view"
            >
              <Printer size={14} />
              <span>Print Page</span>
            </button>
            <button 
              type="button" 
              className="antique-btn" 
              onClick={() => fileInputRef.current?.click()}
              title="Restore from JSON backup"
            >
              <Upload size={14} />
              <span>Restore Backup</span>
            </button>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".json" 
              style={{ display: 'none' }} 
              onChange={handleImportFile} 
            />
          </div>
        </div>

        {/* Privacy Assurance */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          fontSize: '12px', 
          fontFamily: 'var(--font-serif)', 
          color: '#75492B',
          opacity: 0.85,
          borderTop: '1px solid rgba(181, 139, 60, 0.2)',
          paddingTop: '12px'
        }}>
          <ShieldCheck size={16} color="var(--c-brass-antique)" />
          <span>
            Strict Local Privacy: No server, no tracking. Your thoughts never leave this browser unless you export them.
          </span>
        </div>
      </div>
    </div>
  );
};
