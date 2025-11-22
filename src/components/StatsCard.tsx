import * as React from 'react';
import { Flame, Trophy, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const StatsCard: React.FC = () => {
  const { habits } = useApp();

  const totalHabits = habits.length;
  
  // Calculate best streak (highest streak among all habits)
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);

  // Calculate consistency score (average completion rate over last 7 days)
  // Simplified: Average of all habits' streaks for now, or just a mock score based on completion.
  // Let's do: (Total completions in last 7 days) / (Total possible completions in last 7 days) * 100
  
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  let totalPossible = totalHabits * 7;
  let totalCompleted = 0;

  habits.forEach(h => {
    h.completedDates.forEach(date => {
      if (last7Days.includes(date)) {
        totalCompleted++;
      }
    });
  });

  const consistency = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
      <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
        <div style={{ color: 'var(--warning)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
          <Flame size={24} />
        </div>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Best Streak</h4>
        <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{bestStreak}</p>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
        <div style={{ color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
          <Trophy size={24} />
        </div>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Consistency</h4>
        <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{consistency}%</p>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
        <div style={{ color: 'var(--success)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
          <Calendar size={24} />
        </div>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Active Habits</h4>
        <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalHabits}</p>
      </div>
    </div>
  );
};
