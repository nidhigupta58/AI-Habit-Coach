import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase Configuration for AI Habit Coach
 * Project: ai-habit-coach-7dd8d
 * 
 * Authentication providers enabled:
 * - Email/Password (enable in Firebase Console if not already done)
 * - Google Sign-in (enable in Firebase Console if not already done)
 * 
 * To enable authentication:
 * 1. Go to https://console.firebase.google.com/project/ai-habit-coach-7dd8d
 * 2. Navigate to Build > Authentication > Get Started
 * 3. Click "Sign-in method" tab
 * 4. Enable "Email/Password" provider
 * 5. Enable "Google" provider
 */

const firebaseConfig = {
    apiKey: "AIzaSyBIJoE4UIbvtgCTsRnL7NaN8meI6Ie8Baw",
    authDomain: "ai-habit-coach-7dd8d.firebaseapp.com",
    projectId: "ai-habit-coach-7dd8d",
    storageBucket: "ai-habit-coach-7dd8d.firebasestorage.app",
    messagingSenderId: "784118238252",
    appId: "1:784118238252:web:c2a32d26bb61b1ba0b9589",
    measurementId: "G-ZFQ5SPZ19T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

