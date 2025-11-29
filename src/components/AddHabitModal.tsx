import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HABIT_CATEGORIES = [
  { name: 'Health', icon: '💪', color: 'var(--success)' },
  { name: 'Productivity', icon: '⚡', color: 'var(--primary)' },
  { name: 'Mindfulness', icon: '🧘', color: 'var(--accent)' },
  { name: 'Learning', icon: '📚', color: 'var(--warning)' },
  { name: 'Fitness', icon: '🏃', color: 'var(--error)' },
  { name: 'Other', icon: '🎯', color: 'var(--text-secondary)' }
];

const HABIT_SUGGESTIONS = [
  'Drink 8 glasses of water',
  'Exercise for 30 minutes',
  'Read for 20 minutes',
  'Meditate',
  'Write in journal',
  'Practice gratitude',
  'Learn something new',
  'Get 8 hours of sleep'
];

export const AddHabitModal: React.FC<AddHabitModalProps> = ({ isOpen, onClose }) => {
  const { addHabit } = useApp();
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [category, setCategory] = useState('Health');

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addHabit({
      title: title.trim(),
      frequency,
    });
    
    // Reset form
    setTitle('');
    setFrequency('daily');
    setCategory('Health');
    onClose();
  };

  const useSuggestion = (suggestion: string) => {
    setTitle(suggestion);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 1001,
          padding: '0 1rem',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        <div className="glass-card" style={{ padding: '2rem' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem'
          }}>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <Sparkles size={28} style={{ color: 'var(--primary)' }} />
              New Habit
            </h2>
            <button
              onClick={onClose}
              className="btn-icon"
              style={{ flexShrink: 0 }}
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Habit Name */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}>
                Habit Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What habit do you want to build?"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--glass-border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all var(--transition-base)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--glass-border)';
                  e.target.style.boxShadow = 'none';
                }}
                autoFocus
              />
            </div>

            {/* Quick Suggestions */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-secondary)'
              }}>
                Quick Ideas
              </label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                {HABIT_SUGGESTIONS.slice(0, 4).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => useSuggestion(suggestion)}
                    style={{
                      padding: '0.5rem 0.875rem',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--glass-border)',
                      backgroundColor: 'var(--glass-bg)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--glass-bg)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}>
                Category
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem'
              }}>
                {HABIT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: category === cat.name
                        ? `2px solid ${cat.color}`
                        : '2px solid var(--glass-border)',
                      backgroundColor: category === cat.name
                        ? `${cat.color}15`
                        : 'var(--glass-bg)',
                      color: category === cat.name ? cat.color : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-base)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{cat.icon}</span>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}>
                Frequency
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {(['daily', 'weekly'] as const).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setFrequency(freq)}
                    style={{
                      flex: 1,
                      padding: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      border: frequency === freq
                        ? '2px solid var(--primary)'
                        : '2px solid var(--glass-border)',
                      backgroundColor: frequency === freq
                        ? 'rgba(99, 102, 241, 0.1)'
                        : 'var(--glass-bg)',
                      color: frequency === freq ? 'var(--primary)' : 'var(--text-primary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all var(--transition-base)',
                      textTransform: 'capitalize'
                    }}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!title.trim()}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1.05rem',
                opacity: !title.trim() ? 0.5 : 1
              }}
            >
              <Plus size={20} />
              Create Habit
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  );
};
