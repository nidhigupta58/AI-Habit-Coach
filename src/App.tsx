import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HabitList } from './components/HabitList';
import { AddHabitModal } from './components/AddHabitModal';
import { MoodSelector } from './components/MoodSelector';
import {WebcamMoodDetector} from './components/WebcamMoodDetector';
import { AICoach } from './components/AICoach';
import { AnalyticsChart } from './components/AnalyticsChart';
import { StatsCard } from './components/StatsCard';
import { SettingsModal } from './components/SettingsModal';
import { Login } from './components/Login';
import { generateCoaching } from './services/aiService';
import { Activity, Brain, LayoutDashboard, BarChart2, Settings, LogOut, ChevronDown, Moon, Sun, Plus, Sparkles } from 'lucide-react';

function AppContent() {
  const { user, logout, sendVerificationEmail } = useAuth();
  const { habits, moodHistory, apiKey } = useApp(); // Get habits/mood from context
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'habits' | 'mood' | 'coach' | 'stats'>('habits');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [dailyFocus, setDailyFocus] = useState<string | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      return savedTheme;
    }
    document.documentElement.setAttribute('data-theme', 'dark');
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch Daily Focus
  useEffect(() => {
    const fetchFocus = async () => {
      try {
        // We only need a simple focus message for the dashboard
        // Using the existing service but we could optimize this to be lighter if needed
        const result = await generateCoaching(habits, moodHistory, apiKey);
        setDailyFocus(result.focus);
      } catch (error) {
        console.error("Failed to fetch daily focus", error);
      }
    };
    
    if (habits.length > 0 || moodHistory.length > 0) {
      fetchFocus();
    }
  }, [habits, moodHistory, apiKey]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  if (!user) {
    return <Login />;
  }

  const isEmailVerified = user.emailVerified || user.providerData.some(p => p.providerId === 'google.com');

  const handleResendVerification = async () => {
    try {
      await sendVerificationEmail();
      alert('✅ Verification email sent! Please check your inbox.');
    } catch (err) {
      console.error('Failed to send verification email:', err);
      alert('❌ Error sending email. Please try again.');
    }
  };

  const tabs = [
    { id: 'habits' as const, label: 'Habits', icon: Activity },
    { id: 'mood' as const, label: 'Mood', icon: LayoutDashboard },
    { id: 'coach' as const, label: 'AI Coach', icon: Brain },
    { id: 'stats' as const, label: 'Analytics', icon: BarChart2 },
  ];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className="container">
        {/* Stunning Header */}
        <header className="app-header animate-slide-down">
          <div className="app-logo">
            <span className="logo-icon">🎯</span>
            <span>AI Habit Coach</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="btn-icon"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* User Menu */}
            <div className="user-menu">
              <button
                className="user-button"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="user-avatar">
                  {user.email?.[0].toUpperCase() || 'U'}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {user.displayName || user.email?.split('@')[0]}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {user.email}
                  </div>
                </div>
                <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="dropdown-menu animate-slide-down">
                  <div className="dropdown-header">
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Signed in as
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                      {user.email}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setIsSettingsOpen(true);
                    }}
                    className="dropdown-item"
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="dropdown-item danger"
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Email Verification Alert */}
        {!isEmailVerified && (
          <div className="glass-card animate-slide-up" style={{
            marginBottom: '2rem',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Sparkles size={20} style={{ color: 'var(--warning)' }} />
              <p style={{ fontSize: '0.95rem' }}>
                Please verify your email to unlock all features
              </p>
            </div>
            <button
              onClick={handleResendVerification}
              className="btn-secondary"
              style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}
            >
              Resend Email
            </button>
          </div>
        )}

        {/* Modern Tab Navigation */}
        <nav className="tab-nav animate-scale-in">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Content with Beautiful Cards */}
        <div className="animate-fade-in">
          {activeTab === 'habits' && (
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '2rem' 
              }}>
                <div>
                  <h2 style={{ 
                    fontSize: '2rem', 
                    fontWeight: 800, 
                    marginBottom: '0.5rem',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    Your Habits
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Build better habits, one day at a time
                  </p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
                  <Plus size={20} />
                  Add Habit
                </button>
              </div>

              {/* Daily Focus Card */}
              {dailyFocus && (
                <div className="glass-card animate-slide-up" style={{ 
                  marginBottom: '2rem',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.05))',
                  borderLeft: '4px solid var(--accent)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ 
                      padding: '0.5rem', 
                      borderRadius: '0.5rem', 
                      backgroundColor: 'rgba(139, 92, 246, 0.2)', 
                      color: 'var(--accent)',
                      marginTop: '0.25rem'
                    }}>
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 style={{ 
                        fontSize: '1rem', 
                        fontWeight: 600, 
                        marginBottom: '0.5rem',
                        color: 'var(--text-primary)'
                      }}>
                        Daily Focus
                      </h3>
                      <p style={{ 
                        fontSize: '1rem', 
                        lineHeight: 1.5,
                        color: 'var(--text-secondary)'
                      }}>
                        {dailyFocus}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <HabitList onAddClick={() => setIsAddModalOpen(true)} />
            </div>
          )}

          {activeTab === 'mood' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ 
                  fontSize: '2rem', 
                  fontWeight: 800, 
                  marginBottom: '0.5rem',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Track Your Mood
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  Understanding your emotions leads to better habits
                </p>
              </div>
              <div style={{ display: 'grid', gap: '2rem' }}>
                <MoodSelector onMoodSelected={() => setActiveTab('coach')} />
                <WebcamMoodDetector onMoodDetected={() => setActiveTab('coach')}/>
              </div>
            </div>
          )}

          {activeTab === 'coach' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ 
                  fontSize: '2rem', 
                  fontWeight: 800, 
                  marginBottom: '0.5rem',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Your AI Coach
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  Personalized insights powered by artificial intelligence
                </p>
              </div>
              <AICoach />
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ 
                  fontSize: '2rem', 
                  fontWeight: 800, 
                  marginBottom: '0.5rem',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Analytics & Insights
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  Visualize your progress and identify patterns
                </p>
              </div>
              <StatsCard />
              <div style={{ marginTop: '2rem' }}>
                <AnalyticsChart />
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        {isAddModalOpen && <AddHabitModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />}
        {isSettingsOpen && <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          onClick={() => setShowUserMenu(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
