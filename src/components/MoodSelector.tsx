import * as React from 'react';
import { Smile, Frown, Meh, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';

const MOODS = [
  { id: 'Happy', icon: Smile, color: 'var(--success)', label: 'Happy' },
  { id: 'Stressed', icon: Frown, color: 'var(--error)', label: 'Stressed' },
  { id: 'Tired', icon: Meh, color: 'var(--text-secondary)', label: 'Tired' },
  { id: 'Focused', icon: Zap, color: 'var(--warning)', label: 'Focused' },
] as const;

interface MoodSelectorProps {
  onMoodSelected?: () => void;
}


export const MoodSelector: React.FC<MoodSelectorProps> = ({ onMoodSelected }) => {
  const { addMoodEntry } = useApp();
  const [selectedMood, setSelectedMood] = React.useState<string | null>(null);

  const handleMoodSelect = (moodId: string) => {
    setSelectedMood(moodId);
    addMoodEntry({
      date: new Date().toISOString(),
      mood: moodId as any,
      source: 'manual'
    });
    
    // Navigate to AI Coach tab after a short delay
    setTimeout(() => {
      setSelectedMood(null);
      if (onMoodSelected) {
        onMoodSelected();
      }
    }, 1000);
  };

  
  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', textAlign: 'center' }}>
        How are you feeling right now?
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        {MOODS.map((mood) => {
          const Icon = mood.icon;
          const isSelected = selectedMood === mood.id;
          
          return (
            <button
              key={mood.id}
              onClick={() => handleMoodSelect(mood.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1.5rem',
                borderRadius: '1rem',
                backgroundColor: isSelected ? mood.color : 'var(--surface-hover)',
                color: isSelected ? 'white' : 'var(--text-primary)',
                transition: 'all 0.2s',
                transform: isSelected ? 'scale(0.95)' : 'scale(1)',
              }}
            >
              <Icon size={32} />
              <span style={{ fontWeight: 500 }}>{mood.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
