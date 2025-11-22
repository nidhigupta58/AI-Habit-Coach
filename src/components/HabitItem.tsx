import * as React from 'react';
import { Check, Flame, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Habit } from '../context/AppContext';

interface HabitItemProps {
  habit: Habit;
}

export const HabitItem: React.FC<HabitItemProps> = ({ habit }) => {
  const { toggleHabitCompletion, deleteHabit } = useApp();
  
  const today = new Date().toISOString().split('T')[0];
  const isCompletedToday = habit.completedDates.includes(today);

  const handleToggle = () => {
    toggleHabitCompletion(habit.id, today);
  };

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={handleToggle}
          style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '50%',
            border: `2px solid ${isCompletedToday ? 'var(--success)' : 'var(--surface-hover)'}`,
            backgroundColor: isCompletedToday ? 'var(--success)' : 'transparent',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
        >
          {isCompletedToday && <Check size={20} />}
        </button>
        
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{habit.title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <Flame size={16} color={habit.streak > 0 ? 'var(--warning)' : 'currentColor'} />
            <span>{habit.streak} day streak</span>
          </div>
        </div>
      </div>

      <button 
        onClick={() => deleteHabit(habit.id)}
        style={{ 
          color: 'var(--text-secondary)', 
          padding: '0.5rem', 
          borderRadius: '0.5rem',
          backgroundColor: 'transparent',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};
