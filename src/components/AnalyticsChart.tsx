import * as React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useApp } from '../context/AppContext';

export const AnalyticsChart: React.FC = () => {
  const { habits, moodHistory } = useApp();

  // Prepare data for the last 7 days
  const data = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });

    // Calculate habit completion %
    const completedCount = habits.filter(h => h.completedDates.includes(dateStr)).length;
    const totalHabits = habits.length;
    const completionRate = totalHabits > 0 ? (completedCount / totalHabits) * 100 : 0;

    // Get mood score (average if multiple)
    // Mapping: Happy=100, Focused=80, Tired=40, Stressed=20
    const daysMoods = moodHistory.filter(m => m.date.startsWith(dateStr));
    let moodScore = null;
    
    if (daysMoods.length > 0) {
      const scores = daysMoods.map(m => {
        switch (m.mood) {
          case 'Happy': return 100;
          case 'Focused': return 80;
          case 'Tired': return 40;
          case 'Stressed': return 20;
          default: return 50;
        }
      });
      moodScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    return {
      name: dayLabel,
      completion: Math.round(completionRate),
      mood: moodScore ? Math.round(moodScore) : null
    };
  });

  return (
    <div className="card" style={{ height: '400px', marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Weekly Overview</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-hover)" />
          <XAxis dataKey="name" stroke="var(--text-secondary)" />
          <YAxis stroke="var(--text-secondary)" />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface)', border: 'none', borderRadius: '0.5rem', boxShadow: 'var(--shadow)' }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="completion" 
            name="Habit Completion %" 
            stroke="var(--primary)" 
            strokeWidth={3}
            dot={{ fill: 'var(--primary)' }}
          />
          <Line 
            type="monotone" 
            dataKey="mood" 
            name="Mood Score" 
            stroke="var(--secondary)" 
            strokeWidth={3}
            connectNulls
            dot={{ fill: 'var(--secondary)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
