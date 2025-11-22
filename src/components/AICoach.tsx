import * as React from 'react';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { generateCoaching } from '../services/aiService';
import { Sparkles, Target, TrendingUp, MessageCircle, Heart, CheckSquare, Activity } from 'lucide-react';

const MOOD_ICONS: Record<string, string> = {
  'Happy': '😊',
  'Stressed': '😰',
  'Tired': '😴',
  'Focused': '⚡'
};

const MOOD_COLORS: Record<string, string> = {
  'Happy': 'var(--success)',
  'Stressed': 'var(--error)',
  'Tired': 'var(--text-secondary)',
  'Focused': 'var(--warning)'
};

export const AICoach: React.FC = () => {
  const { habits, moodHistory, apiKey } = useApp();
  const [suggestion, setSuggestion] = useState<{ 
    focus: string; 
    improvement: string; 
    encouragement: string;
    moodInsight?: string;
    actionItems?: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const currentMood = moodHistory[0]?.mood || 'Neutral';
  const moodIcon = MOOD_ICONS[currentMood] || '😐';
  const moodColor = MOOD_COLORS[currentMood] || 'var(--text-secondary)';

  useEffect(() => {
    const fetchCoaching = async () => {
      setLoading(true);
      try {
        const result = await generateCoaching(habits, moodHistory, apiKey);
        setSuggestion(result);
      } catch (error) {
        console.error("Failed to generate coaching", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoaching();
  }, [habits, moodHistory, apiKey]);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <Sparkles className="spin" size={32} style={{ color: 'var(--accent)', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Consulting your AI Coach...</p>
        <style>{`
          .spin { animation: spin 1.5s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!suggestion) return null;

  return (
    <div className="animate-fade-in">
      {/* Current Mood Display */}
      <div className="card" style={{ 
        marginBottom: '1.5rem', 
        background: `linear-gradient(135deg, ${moodColor}15, ${moodColor}05)`,
        borderLeft: `4px solid ${moodColor}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            fontSize: '3rem', 
            lineHeight: 1,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
          }}>
            {moodIcon}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Current Mood
            </p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: moodColor, marginBottom: '0.25rem' }}>
              {currentMood}
            </h3>
            {moodHistory.length > 1 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <Activity size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                {moodHistory.length} mood entries tracked
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mood Insight */}
      {suggestion.moodInsight && (
        <div className="card" style={{ 
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))',
          borderLeft: '4px solid var(--accent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent)' }}>
              <Heart size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Mood Insight
              </h4>
              <p style={{ fontSize: '1rem', lineHeight: 1.6 }}>{suggestion.moodInsight}</p>
            </div>
          </div>
        </div>
      )}

      {/* Today's Focus */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--surface), var(--surface-hover))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent)' }}>
            <Target size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Today's Focus</h3>
        </div>
        <p style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>{suggestion.focus}</p>
      </div>

      {/* Area for Improvement */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--success)' }}>
            <TrendingUp size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Area for Improvement</h3>
        </div>
        <p style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>{suggestion.improvement}</p>
      </div>

      {/* Action Items */}
      {suggestion.actionItems && suggestion.actionItems.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)' }}>
              <CheckSquare size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Quick Action Items</h3>
          </div>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0, 
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {suggestion.actionItems.map((item, index) => (
              <li key={index} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                padding: '0.75rem',
                backgroundColor: 'var(--surface-hover)',
                borderRadius: '0.5rem',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>
                <span style={{ fontSize: '1rem' }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Coach's Note */}
      <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: 'rgba(236, 72, 153, 0.2)', color: 'var(--secondary)' }}>
            <MessageCircle size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Coach's Note</h3>
        </div>
        <p style={{ fontSize: '1.1rem', lineHeight: 1.6, fontStyle: 'italic' }}>"{suggestion.encouragement}"</p>
      </div>
    </div>
  );
};
