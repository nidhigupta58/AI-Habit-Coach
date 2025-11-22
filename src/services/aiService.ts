import type { Habit, MoodEntry } from '../context/AppContext';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface CoachingResponse {
    focus: string;
    improvement: string;
    encouragement: string;
    moodInsight?: string;
    actionItems?: string[];
}

// Analyze mood patterns over time
const analyzeMoodPattern = (moodHistory: MoodEntry[]): { trend: string; dominant: string } => {
    if (moodHistory.length === 0) return { trend: 'stable', dominant: 'Neutral' };

    const last7Days = moodHistory.slice(0, 7);
    const moodCounts: Record<string, number> = {};

    last7Days.forEach(entry => {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });

    const dominant = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Neutral';

    // Simple trend detection
    const recent = last7Days.slice(0, 3).map(m => m.mood);
    const older = last7Days.slice(3, 6).map(m => m.mood);

    const positiveCount = (moods: string[]) => moods.filter(m => m === 'Happy' || m === 'Focused').length;
    const recentPositive = positiveCount(recent);
    const olderPositive = positiveCount(older);

    let trend = 'stable';
    if (recentPositive > olderPositive) trend = 'improving';
    else if (recentPositive < olderPositive) trend = 'declining';

    return { trend, dominant };
};

export const generateCoaching = async (habits: Habit[], moodHistory: MoodEntry[], apiKey?: string): Promise<CoachingResponse> => {
    const today = new Date().toISOString().split('T')[0];
    const recentMood = moodHistory[0]?.mood || 'Neutral';
    const moodPattern = analyzeMoodPattern(moodHistory);

    const completedToday = habits.filter(h => h.completedDates.includes(today)).length;
    const totalHabits = habits.length;
    const completionRate = totalHabits > 0 ? completedToday / totalHabits : 0;

    // If API key is provided, use Gemini
    if (apiKey) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const habitSummary = habits.map(h => {
                const isDoneToday = h.completedDates.includes(today);
                return `- ${h.title}: ${isDoneToday ? '✓ Completed' : '✗ Not completed'} (${h.streak} day streak)`;
            }).join('\n');

            const moodSummary = moodHistory.slice(0, 7).map(m =>
                `${m.date.split('T')[0]}: ${m.mood}`
            ).join('\n');

            const prompt = `You are an empathetic AI Habit Coach specializing in mood-aware coaching.

**Current Situation:**
- User's current mood: ${recentMood}
- Mood trend (last 7 days): ${moodPattern.trend}
- Dominant mood: ${moodPattern.dominant}
- Habits completed today: ${completedToday}/${totalHabits}

**Habits Status:**
${habitSummary}

**Recent Mood History:**
${moodSummary}

**Task:** Provide personalized, mood-aware coaching in JSON format with these fields:

1. "focus": A specific, actionable focus area for today based on their mood and habits (1-2 sentences)
2. "improvement": One concrete improvement suggestion that considers their emotional state (1-2 sentences)
3. "encouragement": A warm, personalized encouraging message that acknowledges their mood (1-2 sentences)
4. "moodInsight": A brief insight about their mood pattern or how it relates to their habits (1 sentence)
5. "actionItems": Array of 2-3 specific, small action items they can do right now (each 5-10 words)

**Guidelines:**
- If mood is Stressed: Focus on stress relief, simplification, self-care
- If mood is Tired: Emphasize rest, energy management, gentle progress
- If mood is Happy: Leverage positive energy, set stretch goals, celebrate wins
- If mood is Focused: Optimize productivity, tackle challenging tasks, build momentum
- Be empathetic and supportive
- Make suggestions realistic and achievable
- Acknowledge their current emotional state

Return ONLY raw JSON, no markdown formatting.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean up markdown code blocks if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(jsonStr) as CoachingResponse;
        } catch (error) {
            console.error("Gemini API Error:", error);
            // Fallback to enhanced mock
        }
    }

    // Enhanced Mock Implementation with detailed mood-specific coaching
    await new Promise(resolve => setTimeout(resolve, 1500));

    let focus = "";
    let improvement = "";
    let encouragement = "";
    let moodInsight = "";
    let actionItems: string[] = [];

    // Mood-specific coaching
    switch (recentMood) {
        case 'Stressed':
            focus = "Today, prioritize self-care and stress management. Focus on completing just one key habit to avoid overwhelm.";
            improvement = "Break your habits into smaller, 5-minute chunks. Start with the easiest one to build momentum without pressure.";
            encouragement = "It's completely okay to feel stressed. Remember, progress over perfection. You're doing better than you think.";
            moodInsight = "Stress often peaks when we try to do too much at once. Simplifying your approach can help.";
            actionItems = [
                "Take 5 deep breaths right now",
                "Complete your easiest habit first",
                "Schedule a 10-minute break for yourself"
            ];
            break;

        case 'Tired':
            focus = "Listen to your body today. Focus on rest and choose only your most essential habit to maintain your streak.";
            improvement = "Consider moving your habit practice to when you have the most energy, typically morning or after rest.";
            encouragement = "Rest is productive too. Your body needs recovery to perform at its best. Tomorrow is a fresh start.";
            moodInsight = "Low energy might mean you need better sleep or nutrition. Your habits work best when you're well-rested.";
            actionItems = [
                "Drink a glass of water",
                "Do one habit in 2 minutes or less",
                "Plan an earlier bedtime tonight"
            ];
            break;

        case 'Focused':
            focus = "You're in the zone! Leverage this focused energy to tackle your most challenging habit or add a new one.";
            improvement = "Use this productive state to batch similar habits together and create an optimized routine.";
            encouragement = "Your focus is a superpower! Ride this wave of productivity and see how much you can accomplish.";
            moodInsight = "Focused states are perfect for building new habits. Your brain is primed for learning and execution.";
            actionItems = [
                "Complete your hardest habit first",
                "Time-block your remaining habits",
                "Reflect on what's helping you focus"
            ];
            break;

        case 'Happy':
            focus = "Spread your positive energy! Use this uplifted mood to strengthen your habits and inspire others.";
            improvement = "Reflect on what made you happy and see if you can turn it into a sustainable habit or routine.";
            encouragement = "Your positivity is contagious! You're proof that consistent habits lead to genuine happiness.";
            moodInsight = "Happiness and habit success often reinforce each other. You're in a positive cycle!";
            actionItems = [
                "Celebrate today's completed habits",
                "Share your progress with someone",
                "Set a stretch goal for tomorrow"
            ];
            break;

        default:
            focus = "Stay consistent with your daily routine and maintain your momentum.";
            improvement = "Try to complete your habits earlier in the day to build a sense of accomplishment.";
            encouragement = "Every day is a chance to grow. You're building something meaningful, one habit at a time.";
            moodInsight = "Tracking your mood helps you understand what supports your habit success.";
            actionItems = [
                "Check off one habit right now",
                "Log your current mood",
                "Review your progress this week"
            ];
    }

    // Adjust based on completion rate
    if (completionRate === 1 && totalHabits > 0) {
        improvement = "Perfect score today! Consider increasing the difficulty slightly or adding a complementary habit.";
        encouragement = "Outstanding! You've completed everything. This consistency is building an incredible foundation.";
        actionItems.push("Reward yourself for 100% completion");
    } else if (completionRate < 0.3 && totalHabits > 0) {
        improvement = "Start with just one habit right now. Small wins create momentum for bigger achievements.";
        actionItems = [
            "Pick your easiest habit and do it now",
            "Set a 5-minute timer and start",
            "Forgive yourself and move forward"
        ];
    } else if (completionRate >= 0.7 && totalHabits > 0) {
        encouragement = `Great job! You've completed ${completedToday} out of ${totalHabits} habits. You're on fire!`;
    }

    // Add mood trend insight
    if (moodPattern.trend === 'improving') {
        moodInsight += " Your mood has been improving lately - keep up whatever you're doing!";
    } else if (moodPattern.trend === 'declining') {
        moodInsight += " Your mood seems lower recently. Consider what might help you feel better.";
    }

    return {
        focus,
        improvement,
        encouragement,
        moodInsight,
        actionItems
    };
};
