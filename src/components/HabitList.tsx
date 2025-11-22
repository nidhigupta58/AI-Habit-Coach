import * as React from 'react';
import { useApp } from '../context/AppContext';
import { HabitItem } from './HabitItem';
import { Plus, Target } from 'lucide-react';

interface HabitListProps {
  onAddClick: () => void;
}

export const HabitList: React.FC<HabitListProps> = ({ onAddClick }) => {
  const { habits } = useApp();

  if (habits.length === 0) {
    return (
      <div className="glass-card" style={{ 
        textAlign: 'center', 
        padding: '4rem 2rem',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(236, 72, 153, 0.05))'
      }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          margin: '0 auto 1.5rem',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <Target size={40} color="white" />
        </div>
        
        <h3 style={{ 
          fontSize: '1.5rem', 
          fontWeight: 700, 
          marginBottom: '0.75rem',
          color: 'var(--text-primary)'
        }}>
          No Habits Yet
        </h3>
        
        <p style={{ 
          color: 'var(--text-secondary)', 
          marginBottom: '2rem',
          maxWidth: '400px',
          margin: '0 auto 2rem'
        }}>
          Start building better habits today. Track your progress and watch yourself grow!
        </p>
        
        <button className="btn btn-primary" onClick={onAddClick}>
          <Plus size={20} />
          Create Your First Habit
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {habits.map((habit, index) => (
        <div 
          key={habit.id}
          className="animate-slide-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <HabitItem habit={habit} />
        </div>
      ))}
    </div>
  );
};
