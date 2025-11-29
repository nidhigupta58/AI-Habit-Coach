import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const MOODS = [
  { id: 'Happy', icon: '😊', emoji: '😊', bgColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', label: 'Happy' },
  { id: 'Focused', icon: '⚡', emoji: '⚡', bgColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', label: 'Focused' },
  { id: 'Tired', icon: '😴', emoji: '😴', bgColor: 'rgba(107, 114, 128, 0.15)', color: 'var(--text-secondary)', label: 'Tired' },
  { id: 'Stressed', icon: '😰', emoji: '😰', bgColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', label: 'Stressed' },
] as const;

interface MoodSelectorProps {
  onMoodSelected?: () => void;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({ onMoodSelected }) => {
  const { addMoodEntry } = useApp();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  const handleMoodClick = (moodId: string) => {
    setSelectedMood(moodId);
    setShowNote(true);
  };

  const handleSaveMood = () => {
    if (!selectedMood) return;

    addMoodEntry({
      date: new Date().toISOString(),
      mood: selectedMood as any,
      source: 'manual',
      note: note || undefined
    });
    
    // Reset and navigate
    setTimeout(() => {
      setSelectedMood(null);
      setNote('');
      setShowNote(false);
      if (onMoodSelected) {
        onMoodSelected();
      }
    }, 800);
  };

  return (
    <div className="glass-card">
      <h3 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        marginBottom: '1.5rem',
        textAlign: 'center',
        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        How are you feeling?
      </h3>
      
      {/* Mood buttons grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1rem',
        marginBottom: showNote ? '1.5rem' : '0'
      }}>
        {MOODS.map((mood) => {
          const isSelected = selectedMood === mood.id;
          
          return (
            <button
              key={mood.id}
              onClick={() => handleMoodClick(mood.id)}
              className="mood-button"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1.5rem 1rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: isSelected ? mood.bgColor : 'var(--glass-bg)',
                border: isSelected 
                  ? `2px solid ${mood.color}` 
                  : '2px solid var(--glass-border)',
                color: isSelected ? mood.color : 'var(--text-primary)',
                transition: 'all var(--transition-base)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  color: mood.color,
                  animation: 'scaleIn 0.3s ease-out'
                }}>
                  <CheckCircle size={20} fill="currentColor" />
                </div>
              )}

              {/* Emoji */}
              <div style={{
                fontSize: '3rem',
                lineHeight: 1,
                filter: isSelected ? 'none' : 'grayscale(0.3)',
                transition: 'all var(--transition-base)',
                transform: isSelected ? 'scale(1.1)' : 'scale(1)'
              }}>
                {mood.emoji}
              </div>
              
              {/* Label */}
              <span style={{
                fontWeight: 600,
                fontSize: '1rem',
                transition: 'all var(--transition-base)'
              }}>
                {mood.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Optional note input */}
      {showNote && selectedMood && (
        <div className="animate-slide-up" style={{ marginTop: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.75rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--text-secondary)'
          }}>
            Add a note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's on your mind?"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              resize: 'vertical',
              minHeight: '80px',
              outline: 'none',
              transition: 'all var(--transition-base)',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--primary)';
              e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--glass-border)';
              e.target.style.boxShadow = 'none';
            }}
          />
          
          <button
            onClick={handleSaveMood}
            className="btn btn-primary"
            style={{
              width: '100%',
              marginTop: '1rem'
            }}
          >
            Save Mood
          </button>
        </div>
      )}

      <style>{`
        .mood-button:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.2);
        }

        .mood-button:active {
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};
