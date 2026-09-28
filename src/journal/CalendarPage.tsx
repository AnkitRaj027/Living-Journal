import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface CalendarPageProps {
  currentViewingDate: string;
  entryDates: Set<string>;
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  currentViewingDate,
  entryDates,
  onSelectDate,
  onClose,
}) => {
  const [viewYear, setViewYear] = useState(() => new Date(currentViewingDate).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date(currentViewingDate).getMonth());

  // Reliable local today string (YYYY-MM-DD)
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const todayDay = today.getDate();
  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;

  const isFutureMonth = viewYear > currentYear || (viewYear === currentYear && viewMonth >= currentMonth);

  const handlePrevMonth = () => {
    soundEngine.playPaperTurn('left');
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isFutureMonth) return;
    soundEngine.playPaperTurn('right');
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Generate calendar days
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long' });

  const days = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const handleDayClick = (day: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const targetDate = `${viewYear}-${formattedMonth}-${formattedDay}`;

    if (targetDate > todayStr) {
      soundEngine.playClaspClick();
      return; // Future date is locked
    }

    soundEngine.playPaperTurn('right');
    onSelectDate(targetDate);
    onClose();
  };

  return (
    <div className="antique-modal-backdrop" onClick={onClose}>
      <div className="antique-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {/* Vintage Calendar Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ 
            fontFamily: 'var(--font-classical)', 
            fontSize: '11px', 
            letterSpacing: '0.24em', 
            color: 'var(--c-brass-antique)', 
            textTransform: 'uppercase' 
          }}>
            Chronicle of Days
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '24px', 
            marginTop: '8px' 
          }}>
            <button 
              type="button" 
              className="antique-btn antique-btn-icon" 
              onClick={handlePrevMonth}
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <h2 style={{ 
              fontFamily: 'var(--font-serif)', 
              fontSize: '24px', 
              color: 'var(--c-leather-rich)', 
              fontWeight: 700 
            }}>
              {monthName} {viewYear}
            </h2>
            <button 
              type="button" 
              className="antique-btn antique-btn-icon" 
              onClick={handleNextMonth}
              disabled={isFutureMonth}
              style={isFutureMonth ? { opacity: 0.25, cursor: 'not-allowed', pointerEvents: 'none' } : undefined}
              title={isFutureMonth ? "Future months are not yet chronicleable" : "Next Month"}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          textAlign: 'center', 
          marginBottom: '10px',
          fontFamily: 'var(--font-classical)',
          fontSize: '11px',
          letterSpacing: '0.12em',
          color: 'var(--c-leather-warm)'
        }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '8px', 
          textAlign: 'center' 
        }}>
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} style={{ height: '48px' }} />;
            }

            const formattedMonth = String(viewMonth + 1).padStart(2, '0');
            const formattedDay = String(day).padStart(2, '0');
            const dateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;

            const hasEntry = entryDates.has(dateStr);
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            const isCurrentViewing = dateStr === currentViewingDate;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDayClick(day)}
                disabled={isFuture}
                style={{
                  height: '48px',
                  background: isCurrentViewing 
                    ? 'rgba(181, 139, 60, 0.28)' 
                    : isToday 
                    ? 'rgba(216, 196, 158, 0.45)' 
                    : 'transparent',
                  border: isCurrentViewing 
                    ? '1px solid var(--c-brass-antique)' 
                    : isToday
                    ? '1px solid rgba(181, 139, 60, 0.45)'
                    : '1px solid rgba(181, 139, 60, 0.15)',
                  borderRadius: '6px',
                  cursor: isFuture ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isFuture ? 0.22 : 1,
                  fontFamily: 'var(--font-serif)',
                  fontSize: '15px',
                  color: isFuture ? '#888' : isToday ? 'var(--c-leather-rich)' : 'var(--c-ink-charcoal)'
                }}
                title={isFuture ? 'Future day — unwritten and locked' : hasEntry ? 'Contains journal memory' : 'Empty past day'}
              >
                <span>{day}</span>
                {/* Organic Ink Stamp Dot on written days */}
                {hasEntry && (
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--c-wax-crimson)',
                    marginTop: '2px',
                    boxShadow: '0 0 4px rgba(109, 36, 36, 0.6)'
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
