import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, getDocs } from 'firebase/firestore';

// Ensure __app_id and __firebase_config are available in the environment
const appId = "1:70562535171:web:80a0b3251780ba07d43d0b6"; // Use the appId you copied
const firebaseConfig = {
  apiKey: "AIzaSyCR5aVk9Aup908qX3qN1RyF5WfKrUE154",
  authDomain: "mac-economics.firebaseapp.com",
  projectId: "mac-economics",
  storageBucket: "mac-economics.firebaseapp.com",
  messagingSenderId: "70562535171",
  appId: "1:70562535171:web:80a0b3251780ba07d43d0b6",
  measurementId: "G-ZBXSCXWT3G" // This might be optional, depending on your setup
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Utility function for a simple modal/message box
const showMessage = (message, type = 'info') => {
    const modal = document.getElementById('message-modal');
    const modalText = document.getElementById('message-modal-text');
    if (modal && modalText) {
        modalText.textContent = message;
        modal.className = `fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 ${type === 'error' ? 'text-red-700' : 'text-gray-900'}`;
        modal.classList.remove('hidden');
    }
};

const hideMessage = () => {
    const modal = document.getElementById('message-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

const App = () => {
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [role, setRole] = useState(null); // 'student' or 'instructor'
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [loading, setLoading] = useState(true);

    // Firebase Authentication and User Role Setup
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const currentUserId = currentUser.uid;
                setUserId(currentUserId);

                // Try to get user data from Firestore
                const userDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/users`, currentUserId);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    setRole(userDocSnap.data().role);
                } else {
                    // If user document doesn't exist, force role selection for new users
                    setRole(null);
                }
            } else {
                setUser(null);
                setUserId(null);
                setRole(null);
            }
            setIsAuthReady(true);
            setLoading(false);
        });

        // Attempt initial sign-in with custom token if available
        const initialSignIn = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    // If no custom token, don't sign in anonymously immediately.
                    // Wait for user interaction (Google button click).
                    setIsAuthReady(true); // Mark auth ready even if no user is signed in yet
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error during Firebase initial sign-in:", error);
                showMessage(`Authentication failed: ${error.message}`, 'error');
                setIsAuthReady(true);
                setLoading(false);
            }
        };

        if (!isAuthReady) { // Only run initial sign-in once
            initialSignIn();
        }

        return () => unsubscribe();
    }, [isAuthReady]); // Dependency on isAuthReady to ensure it runs only once initially

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // onAuthStateChanged will handle setting user and role after successful sign-in
        } catch (error) {
            console.error("Error during Google sign-in:", error);
            showMessage(`Google Sign-In failed: ${error.message}`, 'error');
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            showMessage("Signed out successfully!");
        } catch (error) {
            console.error("Error signing out:", error);
            showMessage(`Sign out failed: ${error.message}`, 'error');
        }
    };

    // Function to set user role in Firestore
    const selectRole = async (selectedRole) => {
        if (!userId) {
            showMessage("User not authenticated yet. Please wait.", 'error');
            return;
        }
        try {
            const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/users`, userId);
            // Use Google display name if available, otherwise a generated name
            const userName = user?.displayName || `User-${userId.substring(0, 6)}`;
            await setDoc(userDocRef, {
                role: selectedRole,
                name: userName,
                balance: selectedRole === 'student' ? 1000 : 0, // Initial balance for students
                portfolio: { stocks: 0, bonds: 0, crypto: 0, realEstate: 0, cash: selectedRole === 'student' ? 1000 : 0 },
                lastSubmissionDay: 0,
                absentToday: false,
                createdAt: new Date(),
            }, { merge: true });
            setRole(selectedRole);
            showMessage(`Role set to ${selectedRole}!`);
        } catch (error) {
            console.error("Error setting user role:", error);
            showMessage(`Failed to set role: ${error.message}`, 'error');
        }
    };

    if (loading || !isAuthReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <p className="text-xl text-gray-700 dark:text-gray-300">Loading application...</p>
            </div>
        );
    }

    // If auth is ready but no user is logged in, show login options
    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
                <h1 className="text-4xl font-bold mb-8 text-indigo-600 dark:text-indigo-400">Welcome to EconSim!</h1>
                <p className="text-lg mb-6">Please sign in to continue:</p>
                <div className="flex flex-col space-y-4">
                    <button
                        onClick={handleGoogleSignIn}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transform transition duration-300 hover:scale-105 flex items-center justify-center"
                    >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4.00001C14.0881 4.00001 15.9381 4.69501 17.3881 6.01501L20.2581 3.14501C18.3981 1.25501 15.4281 0 12 0C7.3181 0 3.2581 2.69501 1.2581 6.60501L5.1781 9.68501C6.1881 7.20501 8.8381 5.51501 12 5.51501C12 5.51501 12 4.00001 12 4.00001Z" fill="#EA4335"/>
                            <path d="M0.999999 9.68501L4.91 12.765C4.77 13.175 4.69 13.605 4.69 14.045C4.69 16.595 5.55 18.845 7.02 20.515L3.19 23.515C1.19 21.035 0 17.655 0 14.045C0 12.715 0.23 11.455 0.64 10.295L0.999999 9.68501Z" fill="#FBBC05"/>
                            <path d="M12 24C15.42 24 18.39 22.74 20.25 20.85L17.38 17.98C15.93 19.3 14.08 20 12 20C8.83 20 6.18 18.31 5.17 15.83L1.25 18.91C3.25 22.82 7.31 24 12 24Z" fill="#34A853"/>
                            <path d="M23.5 12.0001C23.5 11.2301 23.43 10.4701 23.29 9.7201L12 9.7201L12 14.2801H18.91C18.66 15.5401 18 16.6801 17.04 17.5801L20.25 20.8501C22.06 19.0401 23.01 16.6301 23.01 14.0401C23.01 13.2901 23.5 12.0001 23.5 12.0001Z" fill="#4285F4"/>
                        </svg>
                        Sign in with Google
                    </button>
                </div>
            </div>
        );
    }

    // If user is logged in but role not set (new user or role not found)
    if (user && !role) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
                <h1 className="text-4xl font-bold mb-8 text-indigo-600 dark:text-indigo-400">Welcome, {user.displayName || `User-${userId.substring(0, 6)}`}!</h1>
                <p className="text-lg mb-6">Please select your role:</p>
                <div className="flex space-x-6">
                    <button
                        onClick={() => selectRole('student')}
                        className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-lg transform transition duration-300 hover:scale-105"
                    >
                        I am a Student
                    </button>
                    <button
                        onClick={() => selectRole('instructor')}
                        className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg transform transition duration-300 hover:scale-105"
                    >
                        I am an Instructor
                    </button>
                </div>
                <p className="mt-8 text-sm text-gray-600 dark:text-gray-400">Your User ID: <span className="font-mono text-indigo-700 dark:text-indigo-300">{userId}</span></p>
            </div>
        );
    }

    // If user is logged in and role is set, render dashboard
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-inter p-4 sm:p-6 lg:p-8">
            {/* Message Modal */}
            <div id="message-modal" className="hidden fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                    <p id="message-modal-text" className="text-lg mb-4"></p>
                    <button
                        onClick={hideMessage}
                        className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg transition duration-200"
                    >
                        OK
                    </button>
                </div>
            </div>

            {role === 'student' && <StudentDashboard userId={userId} db={db} appId={appId} handleSignOut={handleSignOut} />}
            {role === 'instructor' && <InstructorDashboard userId={userId} db={db} appId={appId} handleSignOut={handleSignOut} />}
        </div>
    );
};

const StudentDashboard = ({ userId, db, appId, handleSignOut }) => {
    const [studentData, setStudentData] = useState(null);
    const [gameSettings, setGameSettings] = useState(null);
    const [allocations, setAllocations] = useState({
        stocks: 20, bonds: 20, crypto: 20, realEstate: 20, cash: 20
    });
    const [salary, setSalary] = useState(100); // Base salary
    const [isSubmittedToday, setIsSubmittedToday] = useState(false);
    const [dailyLog, setDailyLog] = useState([]);
    const [llmResponse, setLlmResponse] = useState('');
    const [llmLoading, setLlmLoading] = useState(false);

    // Listen for real-time updates to student data and game settings
    useEffect(() => {
        if (!userId) return;

        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/users`, userId);
        const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStudentData(data);
                // Check if already submitted for current game day
                if (gameSettings && data.lastSubmissionDay === gameSettings.day) {
                    setIsSubmittedToday(true);
                } else {
                    setIsSubmittedToday(false);
                }
            } else {
                console.log("No student data found for this user.");
                setStudentData(null);
            }
        }, (error) => {
            console.error("Error fetching student data:", error);
            showMessage(`Error loading your data: ${error.message}`, 'error');
        });

        const settingsDocRef = doc(db, `artifacts/${appId}/public/data/game_settings`, 'current_day_settings');
        const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const settings = docSnap.data();
                setGameSettings(settings);
                if (studentData && studentData.lastSubmissionDay === settings.day) {
                    setIsSubmittedToday(true);
                } else {
                    setIsSubmittedToday(false);
                }
            } else {
                console.log("No game settings found.");
                setGameSettings({ day: 0, stockReturn: 0, bondReturn: 0, cryptoReturn: 0, realEstateReturn: 0, rent: 0 }); // Default
            }
        }, (error) => {
            console.error("Error fetching game settings:", error);
            showMessage(`Error loading game settings: ${error.message}`, 'error');
        });

        // Fetch daily log
        const dailyLogRef = collection(db, `artifacts/${appId}/users/${userId}/daily_transactions`);
        const q = query(dailyLogRef);
        const unsubscribeLog = onSnapshot(q, (snapshot) => {
            const logs = [];
            snapshot.forEach(doc => {
                logs.push({ id: doc.id, ...doc.data() });
            });
            // Sort by day in descending order
            logs.sort((a, b) => b.day - a.day);
            setDailyLog(logs);
        }, (error) => {
            console.error("Error fetching daily log:", error);
            showMessage(`Error loading daily log: ${error.message}`, 'error');
        });


        return () => {
            unsubscribeUser();
            unsubscribeSettings();
            unsubscribeLog();
        };
    }, [userId, db, appId, studentData?.lastSubmissionDay, gameSettings?.day]); // Dependencies to re-run effect

    const handleAllocationChange = (asset, value) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0 || numValue > 100) {
            // Optional: show a temporary error message
            return;
        }
        setAllocations(prev => ({ ...prev, [asset]: numValue }));
    };

    const calculateTotalAllocation = useCallback(() => {
        return Object.values(allocations).reduce((sum, val) => sum + val, 0);
    }, [allocations]);

    const handleSubmitAllocation = async () => {
        if (!studentData || !gameSettings) {
            showMessage("Data not loaded. Please wait.", 'error');
            return;
        }

        const total = calculateTotalAllocation();
        if (total !== 100) {
            showMessage(`Total allocation must be 100%. Currently: ${total}%`, 'error');
            return;
        }
        if (isSubmittedToday) {
            showMessage("You have already submitted your allocation for today.", 'info');
            return;
        }

        try {
            const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/users`, userId);
            await updateDoc(userDocRef, {
                submittedAllocation: allocations,
                lastSubmissionDay: gameSettings.day,
            });
            setIsSubmittedToday(true);
            showMessage("Allocation submitted successfully!");
        } catch (error) {
            console.error("Error submitting allocation:", error);
            showMessage(`Failed to submit allocation: ${error.message}`, 'error');
        }
    };

    const generateInvestmentAdvice = async () => {
        setLlmLoading(true);
        setLlmResponse('');
        try {
            const prompt = `As an economics game advisor, provide a brief, general investment tip for a student. Focus on a single concept like diversification, long-term investing, or risk management. Do not mention specific assets or current market conditions. Keep it concise, under 50 words.`;
            let chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: prompt }] });
            const payload = { contents: chatHistory };
            const apiKey = ""; // If you want to use models other than gemini-2.0-flash or imagen-3.0-generate-002, provide an API key here. Otherwise, leave this as-is.
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                setLlmResponse(text);
            } else {
                setLlmResponse("Could not generate advice. Please try again.");
            }
        } catch (error) {
            console.error("Error calling LLM:", error);
            setLlmResponse("Failed to get advice due to an error.");
        } finally {
            setLlmLoading(false);
        }
    };

    const generateMarketSummary = async () => {
        setLlmLoading(true);
        setLlmResponse('');
        try {
            const prompt = `Provide a very short, general, and neutral summary of the current market sentiment (e.g., "The market is showing cautious optimism" or "Market sentiment is mixed"). Do not provide specific numbers, asset names, or investment advice. Keep it under 20 words.`;
            let chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: prompt }] });
            const payload = { contents: chatHistory };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                setLlmResponse(text);
            } else {
                setLlmResponse("Could not generate market summary. Please try again.");
            }
        } catch (error) {
            console.error("Error calling LLM:", error);
            setLlmResponse("Failed to get market summary due to an error.");
        } finally {
            setLlmLoading(false);
        }
    };


    if (!studentData || !gameSettings) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-xl text-gray-700 dark:text-gray-300">Loading student dashboard...</p>
            </div>
        );
    }

    const formatCurrency = (amount) => `$${amount.toFixed(2)}`;

    return (
        <div className="container mx-auto p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 text-center flex-grow">Student Dashboard</h1>
                <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md transition duration-300 transform hover:scale-105"
                >
                    Sign Out
                </button>
            </div>
            <p className="text-lg mb-4 text-center">Welcome, <span className="font-semibold">{studentData.name}</span>! (User ID: <span className="font-mono">{userId}</span>)</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Current Status Card */}
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 p-6 rounded-xl shadow-md">
                    <h2 className="text-2xl font-semibold text-blue-800 dark:text-blue-200 mb-4">Current Status (Day {gameSettings.day})</h2>
                    <p className="text-xl mb-2">Total Balance: <span className="font-bold text-green-700 dark:text-green-300">{formatCurrency(studentData.balance)}</span></p>
                    <div className="mt-4">
                        <h3 className="text-lg font-medium mb-2">Portfolio Breakdown:</h3>
                        {Object.entries(studentData.portfolio).map(([asset, amount]) => (
                            <p key={asset} className="text-md capitalize">
                                {asset}: <span className="font-semibold">{formatCurrency(amount)}</span>
                            </p>
                        ))}
                    </div>
                </div>

                {/* Daily Allocation Card */}
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-900 p-6 rounded-xl shadow-md">
                    <h2 className="text-2xl font-semibold text-purple-800 dark:text-purple-200 mb-4">Daily Allocation</h2>
                    <p className="mb-4">Allocate your total funds for Day {gameSettings.day + 1} (next day's returns will apply):</p>
                    {Object.keys(allocations).map(asset => (
                        <div key={asset} className="flex items-center mb-3">
                            <label htmlFor={asset} className="w-24 capitalize text-lg">{asset}:</label>
                            <input
                                type="number"
                                id={asset}
                                value={allocations[asset]}
                                onChange={(e) => handleAllocationChange(asset, e.target.value)}
                                min="0"
                                max="100"
                                disabled={isSubmittedToday}
                                className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <span className="ml-2 text-lg">%</span>
                        </div>
                    ))}
                    <p className="text-lg font-semibold mt-4">Total: {calculateTotalAllocation()}%</p>
                    <button
                        onClick={handleSubmitAllocation}
                        disabled={isSubmittedToday || calculateTotalAllocation() !== 100}
                        className={`mt-6 px-8 py-3 rounded-lg font-semibold transition duration-300 transform ${
                            isSubmittedToday || calculateTotalAllocation() !== 100
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-md hover:scale-105'
                        }`}
                    >
                        {isSubmittedToday ? 'Allocation Submitted!' : 'Submit Allocation'}
                    </button>
                    {isSubmittedToday && (
                        <p className="mt-2 text-sm text-green-600 dark:text-green-400">You've submitted for today. Wait for the instructor to advance the day.</p>
                    )}
                </div>
            </div>

            {/* LLM Features */}
            <div className="mt-8 bg-yellow-50 dark:bg-yellow-900 p-6 rounded-xl shadow-md">
                <h2 className="text-2xl font-semibold text-yellow-800 dark:text-yellow-200 mb-4">Economics Insights (Powered by AI)</h2>
                <div className="flex space-x-4 mb-4">
                    <button
                        onClick={generateInvestmentAdvice}
                        disabled={llmLoading}
                        className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg shadow-md transition duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {llmLoading ? 'Generating...' : 'Get Investment Advice'}
                    </button>
                    <button
                        onClick={generateMarketSummary}
                        disabled={llmLoading}
                        className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg shadow-md transition duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {llmLoading ? 'Generating...' : 'Get Market Summary'}
                    </button>
                </div>
                {llmResponse && (
                    <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-800 rounded-md border border-yellow-300 dark:border-yellow-700">
                        <p className="text-yellow-900 dark:text-yellow-100 italic">{llmResponse}</p>
                    </div>
                )}
            </div>

            {/* Daily Log */}
            <div className="mt-8 bg-gray-50 dark:bg-gray-700 p-6 rounded-xl shadow-md">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Your Daily Log</h2>
                {dailyLog.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">No daily transactions yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                            <thead className="bg-gray-200 dark:bg-gray-900">
                                <tr>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Day</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Salary</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Rent</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Initial Balance</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Final Balance</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Returns</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Absent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyLog.map((log, index) => (
                                    <tr key={log.id} className={`${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'} border-b border-gray-200 dark:border-gray-600`}>
                                        <td className="py-3 px-4 text-sm">{log.day}</td>
                                        <td className="py-3 px-4 text-sm text-green-600 dark:text-green-400">{formatCurrency(log.salary)}</td>
                                        <td className="py-3 px-4 text-sm text-red-600 dark:text-red-400">{formatCurrency(log.rentCharged)}</td>
                                        <td className="py-3 px-4 text-sm">{formatCurrency(log.initialBalance)}</td>
                                        <td className="py-3 px-4 text-sm">{formatCurrency(log.finalBalance)}</td>
                                        <td className="py-3 px-4 text-sm">
                                            {log.investmentReturns ? (
                                                Object.entries(log.investmentReturns).map(([asset, value]) => (
                                                    <span key={asset} className="block capitalize text-xs">
                                                        {asset}: {value.toFixed(2)}%
                                                    </span>
                                                ))
                                            ) : 'N/A'}
                                        </td>
                                        <td className="py-3 px-4 text-sm">{log.isAbsent ? 'Yes' : 'No'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const InstructorDashboard = ({ userId, db, appId, handleSignOut }) => {
    const [gameSettings, setGameSettings] = useState(null);
    const [newReturns, setNewReturns] = useState({
        stockReturn: 0, bondReturn: 0, cryptoReturn: 0, realEstateReturn: 0
    });
    const [newRent, setNewRent] = useState(0);
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(true);

    // Listen for real-time updates to game settings
    useEffect(() => {
        const settingsDocRef = doc(db, `artifacts/${appId}/public/data/game_settings`, 'current_day_settings');
        const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const settings = docSnap.data();
                setGameSettings(settings);
                setNewReturns({
                    stockReturn: settings.stockReturn,
                    bondReturn: settings.bondReturn,
                    cryptoReturn: settings.cryptoReturn,
                    realEstateReturn: settings.realEstateReturn,
                });
                setNewRent(settings.rent);
            } else {
                // Initialize settings if they don't exist
                const initialSettings = {
                    day: 0,
                    stockReturn: 0,
                    bondReturn: 0,
                    cryptoReturn: 0,
                    realEstateReturn: 0,
                    rent: 50,
                    lastUpdated: new Date(),
                };
                setDoc(settingsDocRef, initialSettings)
                    .then(() => setGameSettings(initialSettings))
                    .catch(e => console.error("Error initializing game settings:", e));
            }
        }, (error) => {
            console.error("Error fetching game settings:", error);
            showMessage(`Error loading game settings: ${error.message}`, 'error');
        });

        return () => unsubscribe();
    }, [db, appId]);

    // Listen for real-time updates to student list
    useEffect(() => {
        const usersCollectionRef = collection(db, `artifacts/${appId}/users`);
        // Query for all user documents within each user's subcollection
        // This requires iterating through all user UIDs, which is not ideal for large numbers of users.
        // A more scalable approach would be to have a single 'students' collection at the top level
        // or a cloud function to aggregate student data. For this example, we'll fetch all users.
        const fetchStudents = async () => {
            setLoadingStudents(true);
            try {
                const userDocs = await getDocs(usersCollectionRef);
                const allStudents = [];
                for (const userDoc of userDocs.docs) {
                    const studentSubCollectionRef = collection(db, `artifacts/${appId}/users/${userDoc.id}/users`);
                    const studentSnap = await getDocs(studentSubCollectionRef);
                    studentSnap.forEach(doc => {
                        if (doc.data().role === 'student') {
                            allStudents.push({ id: doc.id, ...doc.data() });
                        }
                    });
                }
                setStudents(allStudents);
            } catch (error) {
                console.error("Error fetching students:", error);
                showMessage(`Error loading student list: ${error.message}`, 'error');
            } finally {
                setLoadingStudents(false);
            }
        };

        // Due to the nested collection structure for private data, onSnapshot on the parent
        // collection `/artifacts/${appId}/users` does not automatically listen to subcollections.
        // We need to re-fetch all students periodically or when the game day advances.
        // For simplicity, we'll re-fetch when gameSettings.day changes.
        fetchStudents();
        const interval = setInterval(fetchStudents, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);

    }, [db, appId, gameSettings?.day]); // Re-fetch students when game day changes

    const handleReturnChange = (asset, value) => {
        const numValue = parseFloat(value);
        setNewReturns(prev => ({ ...prev, [asset]: isNaN(numValue) ? 0 : numValue }));
    };

    const handleRentChange = (value) => {
        const numValue = parseFloat(value);
        setNewRent(isNaN(numValue) ? 0 : numValue);
    };

    const handleUpdateSettings = async () => {
        if (!gameSettings) {
            showMessage("Game settings not loaded. Please wait.", 'error');
            return;
        }
        try {
            const settingsDocRef = doc(db, `artifacts/${appId}/public/data/game_settings`, 'current_day_settings');
            await updateDoc(settingsDocRef, {
                ...newReturns,
                rent: newRent,
                lastUpdated: new Date(),
            });
            showMessage("Game settings updated successfully!");
        } catch (error) {
            console.error("Error updating settings:", error);
            showMessage(`Failed to update settings: ${error.message}`, 'error');
        }
    };

    const handleToggleAbsent = async (studentId, currentAbsentStatus) => {
        try {
            const userDocRef = doc(db, `artifacts/${appId}/users/${studentId}/users`, studentId);
            await updateDoc(userDocRef, {
                absentToday: !currentAbsentStatus,
            });
            showMessage(`Student ${studentId.substring(0, 6)} attendance updated.`);
        } catch (error) {
            console.error("Error toggling absent status:", error);
            showMessage(`Failed to update attendance: ${error.message}`, 'error');
        }
    };

    const advanceDay = async () => {
        if (!gameSettings) {
            showMessage("Game settings not loaded. Please wait.", 'error');
            return;
        }

        const currentDay = gameSettings.day;
        const nextDay = currentDay + 1;
        const dailySalary = 100; // Define base salary

        try {
            // 1. Process each student's portfolio
            const studentsCollectionRef = collection(db, `artifacts/${appId}/users`);
            const userDocs = await getDocs(studentsCollectionRef);

            for (const userDoc of userDocs.docs) {
                const studentSubCollectionRef = collection(db, `artifacts/${appId}/users/${userDoc.id}/users`);
                const studentSnap = await getDocs(studentSubCollectionRef);

                for (const studentDoc of studentSnap.docs) {
                    if (studentDoc.data().role === 'student') {
                        const studentId = studentDoc.id;
                        const studentData = studentDoc.data();
                        let { balance, portfolio, submittedAllocation, absentToday } = studentData;
                        const initialBalance = balance;
                        const initialPortfolio = { ...portfolio }; // Deep copy

                        // If student didn't submit allocation for the *current* day, default to 100% cash
                        if (studentData.lastSubmissionDay !== currentDay) {
                            submittedAllocation = { stocks: 0, bonds: 0, crypto: 0, realEstate: 0, cash: 100 };
                            console.log(`Student ${studentId.substring(0,6)} did not submit for Day ${currentDay}. Defaulting to 100% cash.`);
                        }

                        // Apply investment returns based on submitted allocation
                        let totalInvestmentGainLoss = 0;
                        const investmentReturnsApplied = {};

                        for (const asset in submittedAllocation) {
                            const allocationPercentage = submittedAllocation[asset] / 100;
                            const amountAllocated = balance * allocationPercentage;

                            let returnRate = 0;
                            if (asset === 'stocks') returnRate = gameSettings.stockReturn;
                            else if (asset === 'bonds') returnRate = gameSettings.bondReturn;
                            else if (asset === 'crypto') returnRate = gameSettings.cryptoReturn;
                            else if (asset === 'realEstate') returnRate = gameSettings.realEstateReturn;
                            else if (asset === 'cash') returnRate = 0; // Cash usually has 0 return or very low

                            const gainLoss = amountAllocated * (returnRate / 100);
                            totalInvestmentGainLoss += gainLoss;
                            investmentReturnsApplied[asset] = returnRate; // Store the actual return rate applied

                            // Update portfolio (this is a simplified model, in a real app, you'd update asset units)
                            portfolio[asset] += gainLoss;
                        }

                        // Update balance with investment gains/losses
                        balance += totalInvestmentGainLoss;

                        // Charge rent
                        const rentCharged = gameSettings.rent;
                        balance -= rentCharged;

                        // Add salary (if not absent)
                        let salaryEarned = 0;
                        if (!absentToday) {
                            salaryEarned = dailySalary;
                            balance += salaryEarned;
                        }

                        // Update student document
                        const studentDocRef = doc(db, `artifacts/${appId}/users/${studentId}/users`, studentId);
                        await updateDoc(studentDocRef, {
                            balance: balance,
                            portfolio: portfolio, // Save updated portfolio
                            absentToday: false, // Reset absent status for next day
                            // lastSubmissionDay is NOT updated here; it's updated by student submission
                        });

                        // Log daily transaction
                        const dailyTransactionsCollectionRef = collection(db, `artifacts/${appId}/users/${studentId}/daily_transactions`);
                        await setDoc(doc(dailyTransactionsCollectionRef), { // Use setDoc with auto-ID
                            userId: studentId,
                            day: currentDay,
                            salary: salaryEarned,
                            rentCharged: rentCharged,
                            initialBalance: initialBalance,
                            finalBalance: balance,
                            initialPortfolio: initialPortfolio,
                            finalPortfolio: portfolio,
                            investmentReturns: investmentReturnsApplied,
                            submittedAllocation: submittedAllocation,
                            isAbsent: absentToday,
                            timestamp: new Date(),
                        });
                    }
                }
            }

            // 2. Advance game day in settings
            const settingsDocRef = doc(db, `artifacts/${appId}/public/data/game_settings`, 'current_day_settings');
            await updateDoc(settingsDocRef, {
                day: nextDay,
                lastUpdated: new Date(),
            });

            showMessage(`Day advanced to ${nextDay}! All student portfolios processed.`);
        } catch (error) {
            console.error("Error advancing day:", error);
            showMessage(`Failed to advance day: ${error.message}`, 'error');
        }
    };

    if (!gameSettings) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-xl text-gray-700 dark:text-gray-300">Loading instructor dashboard...</p>
            </div>
        );
    }

    const formatCurrency = (amount) => `$${amount.toFixed(2)}`;

    return (
        <div className="container mx-auto p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 text-center flex-grow">Instructor Dashboard</h1>
                <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md transition duration-300 transform hover:scale-105"
                >
                    Sign Out
                </button>
            </div>
            <p className="text-lg mb-4 text-center">Your User ID: <span className="font-mono">{userId}</span></p>

            {/* Game Settings */}
            <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800 dark:to-green-900 p-6 rounded-xl shadow-md mb-8">
                <h2 className="text-2xl font-semibold text-green-800 dark:text-green-200 mb-4">Game Settings (Current Day: {gameSettings.day})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {Object.keys(newReturns).map(asset => (
                        <div key={asset} className="flex items-center">
                            <label htmlFor={asset} className="w-32 capitalize text-lg">{asset.replace('Return', '')} Return (%):</label>
                            <input
                                type="number"
                                id={asset}
                                value={newReturns[asset]}
                                onChange={(e) => handleReturnChange(asset, e.target.value)}
                                step="0.1"
                                className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    ))}
                    <div className="flex items-center">
                        <label htmlFor="rent" className="w-32 text-lg">Daily Rent ($):</label>
                        <input
                            type="number"
                            id="rent"
                            value={newRent}
                            onChange={(e) => handleRentChange(e.target.value)}
                            step="1"
                            className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>
                <button
                    onClick={handleUpdateSettings}
                    className="mt-4 px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg shadow-md transition duration-300 transform hover:scale-105"
                >
                    Update Daily Settings
                </button>
                <button
                    onClick={advanceDay}
                    className="mt-4 ml-4 px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md transition duration-300 transform hover:scale-105"
                >
                    Advance Day to {gameSettings.day + 1}
                </button>
            </div>

            {/* Student List */}
            <div className="mt-8 bg-gray-50 dark:bg-gray-700 p-6 rounded-xl shadow-md">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Student List</h2>
                {loadingStudents ? (
                    <p className="text-gray-600 dark:text-gray-400">Loading students...</p>
                ) : students.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">No students registered yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                            <thead className="bg-gray-200 dark:bg-gray-900">
                                <tr>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Name (ID)</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Balance</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Portfolio</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Last Submitted (Day)</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Absent Today</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student, index) => (
                                    <tr key={student.id} className={`${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'} border-b border-gray-200 dark:border-gray-600`}>
                                        <td className="py-3 px-4 text-sm">{student.name} ({student.id.substring(0, 6)})</td>
                                        <td className="py-3 px-4 text-sm">{formatCurrency(student.balance)}</td>
                                        <td className="py-3 px-4 text-sm">
                                            {student.portfolio ? (
                                                Object.entries(student.portfolio).map(([asset, amount]) => (
                                                    <span key={asset} className="block capitalize text-xs">
                                                        {asset}: {formatCurrency(amount)}
                                                    </span>
                                                ))
                                            ) : 'N/A'}
                                        </td>
                                        <td className="py-3 px-4 text-sm">
                                            {student.lastSubmissionDay === gameSettings.day ? (
                                                <span className="text-green-600 dark:text-green-400">Day {student.lastSubmissionDay} (Submitted)</span>
                                            ) : (
                                                <span className="text-red-600 dark:text-red-400">Day {student.lastSubmissionDay} (No Submission)</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={student.absentToday}
                                                onChange={() => handleToggleAbsent(student.id, student.absentToday)}
                                                className="form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
