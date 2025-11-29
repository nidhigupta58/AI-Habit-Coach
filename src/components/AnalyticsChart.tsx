import React from 'react';
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

    // Get mood score
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
    <div className="glass-card" style={{ padding: '2rem' }}>
      <h3 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        marginBottom: '1.5rem',
        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Weekly Progress
      </h3>
      
      {/* Chart container with fixed height */}
      <div style={{ width: '100%', height: '350px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--glass-border)" 
              opacity={0.5}
            />
            <XAxis 
              dataKey="name" 
              stroke="var(--text-secondary)"
              style={{ fontSize: '0.875rem' }}
            />
            <YAxis 
              stroke="var(--text-secondary)"
              style={{ fontSize: '0.875rem' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-xl)',
                color: 'var(--text-primary)'
              }}
              itemStyle={{ color: 'var(--text-primary)' }}
              labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
            />
            <Legend 
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '0.875rem'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="completion" 
              name="Habit Completion %" 
              stroke="var(--primary)" 
              strokeWidth={3}
              dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7 }}
            />
            <Line 
              type="monotone" 
              dataKey="mood" 
              name="Mood Score" 
              stroke="var(--secondary)" 
              strokeWidth={3}
              connectNulls
              dot={{ fill: 'var(--secondary)', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend info */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'var(--glass-bg)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)'
      }}>
        <p><strong>Mood Scoring:</strong> Happy (100) • Focused (80) • Tired (40) • Stressed (20)</p>
      </div>
    </div>
  );
};
