/* global __app_id, __initial_auth_token */
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDc7JbPuh8iik3TxWHQdQedORTxnMwpEyQ",
  authDomain: "odoo-57c97.firebaseapp.com",
  projectId: "odoo-57c97",
  storageBucket: "odoo-57c97.firebasestorage.app",
  messagingSenderId: "905410634834",
  appId: "1:905410634834:web:29158507ded65969e3eb8b",
  measurementId: "G-YZPNF1N1JE"
};

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.projectId;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Message Box Component
const MessageBox = ({ message, type, onClose }) => {
  if (!message) return null;

  const bgColor = type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700';
  const textColor = type === 'error' ? 'text-red-700' : 'text-green-700';

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg border ${bgColor} z-50 flex items-center justify-between`}>
      <p className={`font-medium ${textColor}`}>{message}</p>
      <button onClick={onClose} className="ml-4 text-lg font-bold text-gray-600 hover:text-gray-800">&times;</button>
    </div>
  );
};


// Main App Component
const App = () => {
  /*
   * IMPORTANT: Firestore Security Rules Setup (Already discussed, but keeping for reference)
   *
   * The "Missing or insufficient permissions" error (after authentication) means your Firebase project's
   * Firestore Security Rules are blocking read/write access.
   *
   * To fix this, you need to go to your Firebase Console:
   * 1. Go to https://console.firebase.google.com/
   * 2. Select your project.
   * 3. In the left navigation, find "Firestore Database" under "Build".
   * 4. Click on the "Rules" tab.
   * 5. Replace the existing rules with the following:
   *
   * rules_version = '2';
   * service cloud.firestore {
   * match /databases/{database}/documents {
   * // Allow authenticated users (including anonymous) to read/write to public data
   * // This rule allows any authenticated user to create/read/update/delete their own profile
   * // and read other public profiles within the 'users' collection under your appId.
   * match /artifacts/{appId}/public/data/users/{userId} {
   * allow read: if request.auth != null;
   * allow write: if request.auth != null && request.auth.uid == userId;
   * }
   * }
   * }
   *
   * 6. Click "Publish" to deploy the new rules.
   *
   * IMPORTANT: Also ensure Anonymous Authentication is enabled (see below).
   */

  /*
   * IMPORTANT: Firebase Authentication Setup - Enable Anonymous Sign-in (Already discussed, but keeping for reference)
   *
   * The "Failed to authenticate" error means Firebase Authentication is not configured
   * to allow anonymous users, which your app uses by default for simplicity.
   *
   * To fix this, you need to go to your Firebase Console:
   * 1. Go to https://console.firebase.google.com/
   * 2. Select your project.
   * 3. In the left navigation, find "Authentication" under "Build".
   * 4. Click on the "Sign-in method" tab.
   * 5. Find "Anonymous" in the list of providers.
   * 6. Click the pencil icon (edit) next to "Anonymous".
   * 7. Toggle the "Enable" switch to ON.
   * 8. Click "Save".
   *
   * After enabling, reload your React application in the browser.
   */

  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('home');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  // State for profile form
  const [profileName, setProfileName] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  // NEW: State for skills
  const [skillsOffered, setSkillsOffered] = useState('');
  const [skillsWanted, setSkillsWanted] = useState('');

  // Initialize Firebase and Auth
  useEffect(() => {
    console.log("Firebase Config being used:", firebaseConfig); // Log config for debugging
    try {
      const firebaseApp = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(firebaseApp);
      const firebaseAuth = getAuth(firebaseApp);

      setDb(firestoreDb);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          // Try to sign in with custom token if available, otherwise anonymously
          if (initialAuthToken && user.isAnonymous) { // Only try if token exists and current user is anonymous
            try {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
              console.log("Signed in with custom token.");
            } catch (error) {
              console.error("Error signing in with custom token:", error);
              // Fallback to anonymous if custom token fails
              await signInAnonymously(firebaseAuth);
              console.log("Signed in anonymously due to custom token failure.");
            }
          }
        } else {
          // No user signed in, sign in anonymously
          try {
            await signInAnonymously(firebaseAuth);
            console.log("Signed in anonymously.");
          } catch (error) {
            console.error("Error signing in anonymously:", error);
            setMessage("Failed to authenticate. Please try again. Check Firebase Authentication settings.");
            setMessageType('error');
            setLoading(false);
          }
        }
        setLoading(false); // Auth state is ready
      });

      return () => unsubscribe(); // Cleanup auth listener
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      setMessage("Failed to initialize app. Check console for details (e.g., firebaseConfig).");
      setMessageType('error');
      setLoading(false);
    }
  }, []); // Run only once on component mount

  // Fetch current user's profile
  useEffect(() => {
    if (db && userId) {
      const userDocPath = `artifacts/${appId}/public/data/users/${userId}`;
      console.log("Attempting to fetch user profile from:", userDocPath); // Debugging log
      const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userId);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
          // Populate form fields if profile exists
          const data = docSnap.data();
          setProfileName(data.name || '');
          setProfileLocation(data.location || '');
          setProfilePhotoUrl(data.profilePhotoUrl || '');
          setIsProfilePublic(data.isPublic !== undefined ? data.isPublic : true);
          // NEW: Populate skills fields
          setSkillsOffered(data.skillsOffered || '');
          setSkillsWanted(data.skillsWanted || '');
        } else {
          setUserProfile(null);
          // Clear form fields if no profile
          setProfileName('');
          setProfileLocation('');
          setProfilePhotoUrl('');
          setIsProfilePublic(true);
          // NEW: Clear skills fields
          setSkillsOffered('');
          setSkillsWanted('');
        }
      }, (error) => {
        console.error("Error fetching user profile:", error);
        setMessage("Failed to load your profile. Check console for 'Missing or insufficient permissions'.");
        setMessageType('error');
      });
      return () => unsubscribe(); // Cleanup listener
    }
  }, [db, userId]); // Removed appId from dependency array

  // Fetch all public user profiles for browsing
  useEffect(() => {
    if (db && userId) { // Ensure db and userId are available
      const usersCollectionPath = `artifacts/${appId}/public/data/users`;
      console.log("Attempting to fetch all public users from:", usersCollectionPath); // Debugging log
      const usersCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      // No orderBy to avoid index issues. Filter and sort in memory.
      const unsubscribe = onSnapshot(usersCollectionRef, (snapshot) => {
        const usersList = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.isPublic) { // Only show public profiles
            usersList.push({ id: doc.id, ...data });
          }
        });
        // Sort users alphabetically by name for display
        usersList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setAllUsers(usersList);
      }, (error) => {
        console.error("Error fetching all users:", error);
        setMessage("Failed to load other users' profiles. Check console for 'Missing or insufficient permissions'.");
        setMessageType('error');
      });
      return () => unsubscribe(); // Cleanup listener
    }
  }, [db, userId]); // Removed appId from dependency array

  // Handle profile form submission
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!db || !userId) {
      setMessage("Authentication not ready. Please wait.");
      setMessageType('error');
      return;
    }

    const userDocPath = `artifacts/${appId}/public/data/users/${userId}`;
    console.log("Attempting to save profile to:", userDocPath); // Debugging log
    const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userId);
    const profileData = {
      name: profileName,
      location: profileLocation,
      profilePhotoUrl: profilePhotoUrl,
      isPublic: isProfilePublic,
      // NEW: Include skills in profile data
      skillsOffered: skillsOffered,
      skillsWanted: skillsWanted,
    };

    try {
      await setDoc(userDocRef, profileData, { merge: true }); // Use merge: true to update existing fields
      setMessage("Profile saved successfully!");
      setMessageType('success');
    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage("Failed to save profile. Please try again. Check console for details.");
      setMessageType('error');
    }
  };

  const closeMessage = () => {
    setMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-200 to-purple-200">
        <div className="text-xl font-semibold text-gray-700">Loading application...</div>
      </div>
    );
  }

  // Main UI Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex flex-col font-inter text-gray-800">
      <MessageBox message={message} type={messageType} onClose={closeMessage} />

      {/* Header/Navigation */}
      <nav className="bg-gradient-to-r from-blue-700 to-purple-700 p-4 shadow-xl rounded-b-xl">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-3xl font-extrabold text-white mb-2 sm:mb-0 drop-shadow-md">Skill Swap</h1>
          <div className="flex space-x-2 sm:space-x-4">
            <button
              onClick={() => setActivePage('home')}
              className={`px-5 py-2 rounded-full text-white font-semibold transition-all duration-300 ease-in-out
                ${activePage === 'home' ? 'bg-white text-blue-700 shadow-lg' : 'hover:bg-blue-600 hover:shadow-md'}`}
            >
              Home
            </button>
            <button
              onClick={() => setActivePage('my-profile')}
              className={`px-5 py-2 rounded-full text-white font-semibold transition-all duration-300 ease-in-out
                ${activePage === 'my-profile' ? 'bg-white text-blue-700 shadow-lg' : 'hover:bg-blue-600 hover:shadow-md'}`}
            >
              My Profile
            </button>
            <button
              onClick={() => setActivePage('browse-users')}
              className={`px-5 py-2 rounded-full text-white font-semibold transition-all duration-300 ease-in-out
                ${activePage === 'browse-users' ? 'bg-white text-blue-700 shadow-lg' : 'hover:bg-blue-600 hover:shadow-md'}`}
            >
              Browse Users
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow container mx-auto p-4 sm:p-6 flex items-center justify-center">
        <div className="bg-white bg-opacity-95 rounded-3xl shadow-2xl p-6 sm:p-10 w-full max-w-4xl border border-gray-200 backdrop-blur-sm">
          {userId && (
            <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-200">
              Your User ID: <span className="font-mono text-blue-600 font-bold break-all">{userId}</span>
            </p>
          )}

          {activePage === 'home' && (
            <div>
              <h2 className="text-4xl font-bold mb-6 text-blue-800 drop-shadow-sm">Welcome to Skill Swap!</h2>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                This is the foundation of your new platform. You can now create and manage user profiles, and browse other public profiles.
                Use the vibrant navigation buttons above to explore.
              </p>
              <p className="text-md text-gray-600 italic">
                **Note:** All your profile data is securely stored in Firestore and persists across sessions, so you won't lose your progress!
              </p>
            </div>
          )}

          {activePage === 'my-profile' && (
            <div>
              <h2 className="text-4xl font-bold mb-6 text-blue-800 drop-shadow-sm">My Profile</h2>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="form-group">
                  <label htmlFor="profileName" className="block text-gray-700 text-lg font-semibold mb-2">Name:</label>
                  <input
                    type="text"
                    id="profileName"
                    className="shadow-sm appearance-none border border-blue-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profileLocation" className="block text-gray-700 text-lg font-semibold mb-2">Location (Optional):</label>
                  <input
                    type="text"
                    id="profileLocation"
                    className="shadow-sm appearance-none border border-blue-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    value={profileLocation}
                    onChange={(e) => setProfileLocation(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profilePhotoUrl" className="block text-gray-700 text-lg font-semibold mb-2">Profile Photo URL (Optional):</label>
                  <input
                    type="url"
                    id="profilePhotoUrl"
                    className="shadow-sm appearance-none border border-blue-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    value={profilePhotoUrl}
                    onChange={(e) => setProfilePhotoUrl(e.target.value)}
                    placeholder="e.g., https://placehold.co/100x100"
                  />
                  {profilePhotoUrl && (
                    <img src={profilePhotoUrl} alt="Profile Preview" className="mt-4 w-32 h-32 rounded-full object-cover border-4 border-blue-300 shadow-md" onError={(e) => e.target.src = 'https://placehold.co/128x128/CCCCCC/FFFFFF?text=No+Image'} />
                  )}
                </div>

                {/* NEW: Skills Offered Input */}
                <div className="form-group">
                  <label htmlFor="skillsOffered" className="block text-gray-700 text-lg font-semibold mb-2">Skills I Can Offer (comma-separated):</label>
                  <textarea
                    id="skillsOffered"
                    className="shadow-sm appearance-none border border-blue-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    value={skillsOffered}
                    onChange={(e) => setSkillsOffered(e.target.value)}
                    rows="3"
                    placeholder="e.g., Web Development, Graphic Design, Spanish Tutoring"
                  ></textarea>
                </div>

                {/* NEW: Skills Wanted Input */}
                <div className="form-group">
                  <label htmlFor="skillsWanted" className="block text-gray-700 text-lg font-semibold mb-2">Skills I Want to Learn (comma-separated):</label>
                  <textarea
                    id="skillsWanted"
                    className="shadow-sm appearance-none border border-blue-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    value={skillsWanted}
                    onChange={(e) => setSkillsWanted(e.target.value)}
                    rows="3"
                    placeholder="e.g., Photography, Public Speaking, Data Science Basics"
                  ></textarea>
                </div>

                <div className="form-group flex items-center">
                  <input
                    type="checkbox"
                    id="isProfilePublic"
                    className="mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-md cursor-pointer"
                    checked={isProfilePublic}
                    onChange={(e) => setIsProfilePublic(e.target.checked)}
                  />
                  <label htmlFor="isProfilePublic" className="text-gray-700 text-lg font-semibold">Make Profile Public</label>
                </div>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Profile
                </button>
              </form>

              {userProfile && (
                <div className="mt-10 p-8 border border-blue-200 rounded-2xl bg-blue-50 shadow-inner">
                  <h3 className="text-2xl font-bold mb-5 text-blue-700">Current Profile Details:</h3>
                  <div className="flex items-center space-x-6 mb-4">
                    {userProfile.profilePhotoUrl ? (
                      <img src={userProfile.profilePhotoUrl} alt="User Profile" className="w-28 h-28 rounded-full object-cover border-4 border-blue-400 shadow-lg" onError={(e) => e.target.src = 'https://placehold.co/128x128/CCCCCC/FFFFFF?text=No+Image'} />
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 text-lg font-semibold">No Photo</div>
                    )}
                    <div>
                      <p className="text-xl font-semibold text-gray-800 mb-1"><strong>Name:</strong> {userProfile.name || 'Not set'}</p>
                      <p className="text-lg text-gray-700 mb-1"><strong>Location:</strong> {userProfile.location || 'Not set'}</p>
                      <p className="text-lg text-gray-700 mb-1"><strong>Public:</strong> {userProfile.isPublic ? 'Yes' : 'No'}</p>
                      {/* NEW: Display Skills Offered */}
                      <p className="text-lg text-gray-700 mb-1"><strong>Skills Offered:</strong> {userProfile.skillsOffered || 'None listed'}</p>
                      {/* NEW: Display Skills Wanted */}
                      <p className="text-lg text-gray-700"><strong>Skills Wanted:</strong> {userProfile.skillsWanted || 'None listed'}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    (Other profile details will appear here as you add them.)
                  </p>
                </div>
              )}
            </div>
          )}

          {activePage === 'browse-users' && (
            <div>
              <h2 className="text-4xl font-bold mb-6 text-blue-800 drop-shadow-sm">Browse Other Users</h2>
              {/* NEW: Search/Filter Bar (Placeholder) */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search skills (e.g., 'Web Development')"
                  className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  // You'll add state and filtering logic here later
                />
              </div>

              {allUsers.length === 0 ? (
                <p className="text-lg text-gray-600">No public profiles found. Create your own profile and make it public to be seen here!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allUsers.map(user => (
                    <div key={user.id} className="bg-white border border-purple-200 rounded-xl shadow-lg p-5 flex flex-col items-center text-center space-y-3 transform hover:scale-105 transition-transform duration-200">
                      {user.profilePhotoUrl ? (
                        <img src={user.profilePhotoUrl} alt={user.name || 'User'} className="w-24 h-24 rounded-full object-cover border-4 border-purple-400 shadow-md" onError={(e) => e.target.src = 'https://placehold.co/96x96/CCCCCC/FFFFFF?text=No+Image'} />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-base font-semibold">No Photo</div>
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-purple-700 mt-2">{user.name || 'Anonymous User'}</h3>
                        <p className="text-gray-600 text-sm">{user.location || 'Location not set'}</p>
                        {/* NEW: Display Skills Offered on Browse Cards */}
                        {user.skillsOffered && <p className="text-sm text-gray-700 mt-1"><strong>Offers:</strong> {user.skillsOffered}</p>}
                        {/* NEW: Display Skills Wanted on Browse Cards */}
                        {user.skillsWanted && <p className="text-sm text-gray-700"><strong>Wants:</strong> {user.skillsWanted}</p>}
                        <p className="text-xs text-gray-500 mt-1 bg-purple-50 px-2 py-1 rounded-full inline-block">ID: {user.id.substring(0, 8)}...</p> {/* Shorten ID for display */}

                        {/* NEW: Swap Request Button (Placeholder) */}
                        {user.id !== userId && ( // Don't show button on own profile
                          <button
                            className="mt-4 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold py-2 px-4 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
                            onClick={() => alert(`Initiate swap with ${user.name || 'this user'} for skills: ${user.skillsOffered || 'N/A'} in exchange for ${user.skillsWanted || 'N/A'}`)} // Placeholder action
                          >
                            Request Swap
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
