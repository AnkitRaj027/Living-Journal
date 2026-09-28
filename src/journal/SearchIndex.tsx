import React, { useState, useMemo } from 'react';
import type { JournalEntry } from '../types/journal';
import { soundEngine } from '../audio/soundEngine';
import { Search as SearchIcon, Tag, Calendar, X } from 'lucide-react';

interface SearchIndexProps {
  entries: JournalEntry[];
  onSelectEntry: (date: string) => void;
  onClose: () => void;
}

export const SearchIndex: React.FC<SearchIndexProps> = ({
  entries,
  onSelectEntry,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags across entries
  const allTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => {
      (e.tags || []).forEach(t => set.add(t));
    });
    return Array.from(set).sort();
  }, [entries]);

  // Filter entries based on search and tag
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      // Tag filter
      if (selectedTag && !(e.tags || []).includes(selectedTag)) {
        return false;
      }
      // Text search
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchText = (e.entryText || '').toLowerCase().includes(term);
      const matchPrompt = (e.prompt || '').toLowerCase().includes(term);
      const matchDate = (e.date || '').toLowerCase().includes(term);
      const matchGratitude = (e.gratitude || []).some(g => g.toLowerCase().includes(term));
      const matchTags = (e.tags || []).some(t => t.toLowerCase().includes(term));

      return matchText || matchPrompt || matchDate || matchGratitude || matchTags;
    });
  }, [entries, searchTerm, selectedTag]);

  const handleEntryClick = (date: string) => {
    soundEngine.playPaperTurn('right');
    onSelectEntry(date);
    onClose();
  };

  return (
    <div className="antique-modal-backdrop" onClick={onClose}>
      <div className="antique-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {/* Index Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ 
            fontFamily: 'var(--font-classical)', 
            fontSize: '11px', 
            letterSpacing: '0.24em', 
            color: 'var(--c-brass-antique)', 
            textTransform: 'uppercase' 
          }}>
            Archives & Memory Index
          </div>
          <h2 style={{ 
            fontFamily: 'var(--font-serif)', 
            fontSize: '22px', 
            color: 'var(--c-leather-rich)', 
            marginTop: '4px' 
          }}>
            Search Past Echoes
          </h2>
        </div>

        {/* Search Input Box */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          background: 'rgba(216, 196, 158, 0.35)',
          border: '1px solid var(--c-brass-antique)',
          borderRadius: '6px',
          padding: '10px 14px',
          marginBottom: '16px'
        }}>
          <SearchIcon size={18} color="var(--c-leather-rich)" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keywords, thoughts, gratitude..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-serif)',
              fontSize: '15px',
              color: 'var(--c-ink-charcoal)'
            }}
            autoFocus
          />
          {searchTerm && (
            <button 
              type="button" 
              onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#75492B' }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Tags Row */}
        {allTags.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '11px', 
              fontFamily: 'var(--font-classical)', 
              color: 'var(--c-brass-antique)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.12em',
              marginBottom: '8px'
            }}>
              <Tag size={12} />
              <span>Tags in Journal</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-serif)',
                  cursor: 'pointer',
                  border: selectedTag === null ? '1px solid var(--c-brass-antique)' : '1px solid rgba(181, 139, 60, 0.2)',
                  background: selectedTag === null ? 'rgba(181, 139, 60, 0.25)' : 'transparent',
                  color: 'var(--c-ink-charcoal)'
                }}
              >
                All
              </button>
              {allTags.map((tag: string) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-serif)',
                    cursor: 'pointer',
                    border: selectedTag === tag ? '1px solid var(--c-brass-antique)' : '1px solid rgba(181, 139, 60, 0.2)',
                    background: selectedTag === tag ? 'rgba(181, 139, 60, 0.25)' : 'transparent',
                    color: 'var(--c-ink-charcoal)'
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
          {filteredEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#75492B', fontStyle: 'italic' }}>
              No memories found matching that inquiry.
            </div>
          ) : (
            filteredEntries.map((entry: JournalEntry) => (
              <div
                key={entry.date}
                onClick={() => handleEntryClick(entry.date)}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(239, 227, 200, 0.45)',
                  border: '1px solid rgba(181, 139, 60, 0.2)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 227, 200, 0.85)';
                  e.currentTarget.style.borderColor = 'var(--c-brass-antique)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 227, 200, 0.45)';
                  e.currentTarget.style.borderColor = 'rgba(181, 139, 60, 0.2)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ 
                    fontFamily: 'var(--font-classical)', 
                    fontSize: '13px', 
                    fontWeight: 700, 
                    color: 'var(--c-leather-rich)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Calendar size={13} />
                    {entry.date}
                  </span>
                  {entry.mood && (
                    <span style={{ 
                      fontSize: '11px', 
                      fontFamily: 'var(--font-serif)', 
                      fontStyle: 'italic', 
                      color: '#75492B' 
                    }}>
                      Tone: {entry.mood}
                    </span>
                  )}
                </div>
                <p style={{ 
                  fontFamily: 'var(--font-handwriting-caveat)', 
                  fontSize: '17px', 
                  color: 'var(--c-ink-charcoal)',
                  lineHeight: '1.4',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {entry.entryText || 'No writing on this page...'}
                </p>
                {entry.tags && entry.tags.length > 0 && (
                  <div style={{ marginTop: '6px', display: 'flex', gap: '4px' }}>
                    {entry.tags.map((t: string) => (
                      <span key={t} style={{ fontSize: '11px', color: 'var(--c-brass-antique)', fontFamily: 'monospace' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
