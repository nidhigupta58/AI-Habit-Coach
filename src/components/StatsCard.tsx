import React from 'react';
import { Flame, Trophy, Calendar, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const StatsCard: React.FC = () => {
  const { habits, moodHistory } = useApp();

  const totalHabits = habits.length;
  
  // Calculate best streak
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);

  // Calculate consistency score (last 7 days)
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

  // Calculate today's completion
  const today = new Date().toISOString().split('T')[0];
  const completedToday = habits.filter(h => h.completedDates.includes(today)).length;
  const todayCompletion = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

  // Calculate Habit Score (Weighted: 40% Consistency, 40% Today, 20% Streak)
  // Cap streak bonus at 100 (e.g., 20 day streak = 100)
  const streakScore = Math.min(bestStreak * 5, 100);
  const habitScore = Math.round((consistency * 0.4) + (todayCompletion * 0.4) + (streakScore * 0.2));

  let scoreGrade = 'C';
  if (habitScore >= 90) scoreGrade = 'A+';
  else if (habitScore >= 80) scoreGrade = 'A';
  else if (habitScore >= 70) scoreGrade = 'B';
  else if (habitScore >= 60) scoreGrade = 'C';
  else scoreGrade = 'D';

  // Correlation Insight
  // Find mood with highest completion rate
  const moodPerformance: Record<string, { total: number, completed: number }> = {};
  
  // Map dates to moods
  const dateMoodMap: Record<string, string> = {};
  moodHistory.forEach(m => {
    dateMoodMap[m.date.split('T')[0]] = m.mood;
  });

  habits.forEach(h => {
    h.completedDates.forEach(date => {
      const mood = dateMoodMap[date];
      if (mood) {
        if (!moodPerformance[mood]) moodPerformance[mood] = { total: 0, completed: 0 };
        moodPerformance[mood].completed++;
      }
    });
  });
  
  // Normalize by occurrences of that mood (approximate)
  // This is a simple correlation for now
  let bestMood = 'Focused'; // Default
  let maxPerf = -1;

  Object.entries(moodPerformance).forEach(([mood, data]) => {
    if (data.completed > maxPerf) {
      maxPerf = data.completed;
      bestMood = mood;
    }
  });

  const stats = [
    {
      icon: Trophy,
      label: 'Habit Score',
      value: scoreGrade,
      color: 'var(--accent)',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      description: `${habitScore}/100 Points`
    },
    {
      icon: Flame,
      label: 'Best Streak',
      value: bestStreak,
      color: 'var(--warning)',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      description: 'Days in a row'
    },
    {
      icon: TrendingUp,
      label: 'Consistency',
      value: `${consistency}%`,
      color: 'var(--success)',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      description: 'Last 7 days'
    },
    {
      icon: Calendar,
      label: 'Best Mood',
      value: bestMood,
      color: 'var(--secondary)',
      bgColor: 'rgba(236, 72, 153, 0.1)',
      description: 'For productivity'
    }
  ];

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1.25rem', 
      marginBottom: '2rem' 
    }}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="glass-card animate-slide-up"
            style={{
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              animationDelay: `${index * 0.1}s`,
              transition: 'all var(--transition-base)'
            }}
          >
            {/* Background decoration */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              background: stat.bgColor,
              borderRadius: '50%',
              opacity: 0.5,
              transition: 'all var(--transition-slow)'
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ 
                color: stat.color, 
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Icon size={28} strokeWidth={2.5} />
              </div>
              
              <h4 style={{ 
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {stat.label}
              </h4>
              
              <p style={{ 
                fontSize: '2.5rem',
                fontWeight: 800,
                background: `linear-gradient(135deg, ${stat.color}, var(--text-primary))`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0.5rem',
                lineHeight: 1
              }}>
                {stat.value}
              </p>

              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontWeight: 500
              }}>
                {stat.description}
              </p>
            </div>
          </div>
        );
      })}

      <style>{`
        .glass-card:hover {
          transform: translateY(-4px);
        }
      `}</style>
    </div>
  );
};
