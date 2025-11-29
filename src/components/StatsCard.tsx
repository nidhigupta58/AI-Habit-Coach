import React from 'react';
import { Flame, Trophy, Calendar, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const StatsCard: React.FC = () => {
  const { habits } = useApp();

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

  const stats = [
    {
      icon: Trophy,
      label: 'Consistency',
      value: `${consistency}%`,
      color: 'var(--primary)',
      bgColor: 'rgba(99, 102, 241, 0.1)',
      description: 'Last 7 days'
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
      icon: Calendar,
      label: 'Active Habits',
      value: totalHabits,
      color: 'var(--success)',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      description: 'Total tracking'
    },
    {
      icon: TrendingUp,
      label: 'Today',
      value: `${todayCompletion}%`,
      color: 'var(--secondary)',
      bgColor: 'rgba(236, 72, 153, 0.1)',
      description: `${completedToday}/${totalHabits} done`
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
