import React from 'react';
import { Check, Flame, Trash2, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Habit } from '../context/AppContext';

interface HabitItemProps {
  habit: Habit;
}

export const HabitItem: React.FC<HabitItemProps> = ({ habit }) => {
  const { toggleHabitCompletion, deleteHabit } = useApp();
  
  const today = new Date().toISOString().split('T')[0];
  const isCompletedToday = habit.completedDates.includes(today);

  // Calculate completion rate (last 7 days)
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  const completionsLast7Days = habit.completedDates.filter(date => 
    last7Days.includes(date)
  ).length;
  const completionRate = Math.round((completionsLast7Days / 7) * 100);

  const handleToggle = () => {
    toggleHabitCompletion(habit.id, today);
  };

  return (
    <div 
      className="glass-card" 
      style={{ 
        marginBottom: '1rem',
        transition: 'all var(--transition-base)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Progress bar background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: `${completionRate}%`,
        background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.1), rgba(236, 72, 153, 0.1))',
        transition: 'width var(--transition-slow)',
        zIndex: 0
      }} />

      <div style={{ 
        position: 'relative', 
        zIndex: 1,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1 }}>
          {/* Completion checkbox */}
          <button
            onClick={handleToggle}
            className="habit-checkbox"
            style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              border: isCompletedToday 
                ? '3px solid var(--success)' 
                : '3px solid var(--glass-border)',
              backgroundColor: isCompletedToday 
                ? 'var(--success)' 
                : 'transparent',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-base)',
              cursor: 'pointer',
              position: 'relative',
              flexShrink: 0
            }}
          >
            {isCompletedToday && (
              <Check size={24} strokeWidth={3} className="animate-scale-in" />
            )}
          </button>
          
          {/* Habit details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ 
              fontSize: '1.15rem', 
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: 'var(--text-primary)'
            }}>
              {habit.title}
            </h3>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1.5rem',
              flexWrap: 'wrap'
            }}>
              {/* Streak */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                color: habit.streak > 0 ? 'var(--warning)' : 'var(--text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 600
              }}>
                <Flame 
                  size={18} 
                  fill={habit.streak > 0 ? 'currentColor' : 'none'}
                />
                <span>{habit.streak} day{habit.streak !== 1 ? 's' : ''}</span>
              </div>

              {/* Completion rate */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
              }}>
                <Calendar size={18} />
                <span>{completionRate}% this week</span>
              </div>

              {/* Frequency badge */}
              <div style={{
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-secondary)'
              }}>
                {habit.frequency}
              </div>
            </div>
          </div>
        </div>

        {/* Delete button */}
        <button 
          onClick={() => {
            if (confirm(`Delete habit "${habit.title}"?`)) {
              deleteHabit(habit.id);
            }
          }}
          className="btn-icon"
          style={{
            color: 'var(--text-secondary)',
            flexShrink: 0,
            marginLeft: '1rem'
          }}
          title="Delete habit"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <style>{`
        .habit-checkbox:hover {
          transform: scale(1.1);
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
        }

        .habit-checkbox:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
};
