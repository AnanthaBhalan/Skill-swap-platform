import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot } from 'firebase/firestore';

// Global variables provided by the Canvas environment (DO NOT MODIFY THESE LINES)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
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

  // Initialize Firebase and Auth
  useEffect(() => {
    try {
      const firebaseApp = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(firebaseApp);
      const firebaseAuth = getAuth(firebaseApp);

      setDb(firestoreDb);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          if (initialAuthToken && user.isAnonymous) {
            try {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
              console.log("Signed in with custom token.");
            } catch (error) {
              console.error("Error signing in with custom token:", error);
              await signInAnonymously(firebaseAuth);
              console.log("Signed in anonymously due to custom token failure.");
            }
          }
        } else {
          try {
            await signInAnonymously(firebaseAuth);
            console.log("Signed in anonymously.");
          } catch (error) {
            console.error("Error signing in anonymously:", error);
            setMessage("Failed to authenticate. Please try again.");
            setMessageType('error');
            setLoading(false);
          }
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      setMessage("Failed to initialize app. Check console for details.");
      setMessageType('error');
      setLoading(false);
    }
  }, []);

  // Fetch current user profile
  useEffect(() => {
    if (db && userId) {
      const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userId);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
          const data = docSnap.data();
          setProfileName(data.name || '');
          setProfileLocation(data.location || '');
          setProfilePhotoUrl(data.profilePhotoUrl || '');
          setIsProfilePublic(data.isPublic !== undefined ? data.isPublic : true);
        } else {
          setUserProfile(null);
          setProfileName('');
          setProfileLocation('');
          setProfilePhotoUrl('');
          setIsProfilePublic(true);
        }
      }, (error) => {
        console.error("Error fetching user profile:", error);
        setMessage("Failed to load your profile.");
        setMessageType('error');
      });
      return () => unsubscribe();
    }
  }, [db, userId]);

  // Fetch all public user profiles for browsing
  useEffect(() => {
    if (db && userId) {
      const usersCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      const unsubscribe = onSnapshot(usersCollectionRef, (snapshot) => {
        const usersList = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.isPublic) {
            usersList.push({ id: doc.id, ...data });
          }
        });
        usersList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setAllUsers(usersList);
      }, (error) => {
        console.error("Error fetching all users:", error);
        setMessage("Failed to load other users' profiles.");
        setMessageType('error');
      });
      return () => unsubscribe();
    }
  }, [db, userId]);

  // Handle profile form submission
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!db || !userId) {
      setMessage("Authentication not ready. Please wait.");
      setMessageType('error');
      return;
    }

    const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userId);
    const profileData = {
      name: profileName,
      location: profileLocation,
      profilePhotoUrl: profilePhotoUrl,
      isPublic: isProfilePublic,
    };

    try {
      await setDoc(userDocRef, profileData, { merge: true });
      setMessage("Profile saved successfully!");
      setMessageType('success');
    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage("Failed to save profile. Please try again.");
      setMessageType('error');
    }
  };

  const closeMessage = () => {
    setMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Loading application...</div>
      </div>
    );
  }

  // Main UI Render
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-inter">
      <MessageBox message={message} type={messageType} onClose={closeMessage} />

      {/* Header/Navigation */}
      <nav className="bg-blue-600 p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Skill Swap</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setActivePage('home')}
              className={`px-4 py-2 rounded-md text-white ${activePage === 'home' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
            >
              Home
            </button>
            <button
              onClick={() => setActivePage('my-profile')}
              className={`px-4 py-2 rounded-md text-white ${activePage === 'my-profile' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
            >
              My Profile
            </button>
            <button
              onClick={() => setActivePage('browse-users')}
              className={`px-4 py-2 rounded-md text-white ${activePage === 'browse-users' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
            >
              Browse Users
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow container mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {userId && (
            <p className="text-sm text-gray-600 mb-4">
              Your User ID: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{userId}</span>
            </p>
          )}

          {activePage === 'home' && (
            <div>
              <h2 className="text-3xl font-semibold mb-4 text-blue-800">Welcome to Skill Swap!</h2>
              <p className="text-gray-700 mb-4">
                This is the foundation of your new platform. You can now create and manage user profiles, and browse other public profiles.
                Use the navigation above to explore.
              </p>
              <p className="text-gray-700">
                <strong>Note:</strong> Data is stored in Firestore and persists across sessions.
              </p>
            </div>
          )}

          {activePage === 'my-profile' && (
            <div>
              <h2 className="text-3xl font-semibold mb-6 text-blue-800">My Profile</h2>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="form-group">
                  <label htmlFor="profileName" className="block text-gray-700 text-sm font-bold mb-2">Name:</label>
                  <input
                    type="text"
                    id="profileName"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profileLocation" className="block text-gray-700 text-sm font-bold mb-2">Location (Optional):</label>
                  <input
                    type="text"
                    id="profileLocation"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={profileLocation}
                    onChange={(e) => setProfileLocation(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profilePhotoUrl" className="block text-gray-700 text-sm font-bold mb-2">Profile Photo URL (Optional):</label>
                  <input
                    type="url"
                    id="profilePhotoUrl"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={profilePhotoUrl}
                    onChange={(e) => setProfilePhotoUrl(e.target.value)}
                    placeholder="e.g., https://placehold.co/100x100"
                  />
                  {profilePhotoUrl && (
                    <img src={profilePhotoUrl} alt="Profile Preview" className="mt-2 w-24 h-24 rounded-full object-cover" onError={(e) => e.target.src = 'https://placehold.co/100x100/CCCCCC/FFFFFF?text=No+Image'} />
                  )}
                </div>
                <div className="form-group flex items-center">
                  <input
                    type="checkbox"
                    id="isProfilePublic"
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={isProfilePublic}
                    onChange={(e) => setIsProfilePublic(e.target.checked)}
                  />
                  <label htmlFor="isProfilePublic" className="text-gray-700 text-sm font-bold">Make Profile Public</label>
                </div>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Save Profile
                </button>
              </form>

              {userProfile && (
                <div className="mt-8 p-6 border rounded-lg bg-gray-50">
                  <h3 className="text-xl font-semibold mb-4">Current Profile:</h3>
                  {userProfile.profilePhotoUrl ? (
                    <img src={userProfile.profilePhotoUrl} alt="User  Profile" className="w-24 h-24 rounded-full object-cover mb-4" onError={(e) => e.target.src = 'https://placehold.co/100x100/CCCCCC/FFFFFF?text=No+Image'} />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm mb-4">No Photo</div>
                  )}
                  <p><strong>Name:</strong> {userProfile.name || 'Not set'}</p>
                  <p><strong>Location:</strong> {userProfile.location || 'Not set'}</p>
                  <p><strong>Public:</strong> {userProfile.isPublic ? 'Yes' : 'No'}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    (Other profile details like skills offered/wanted will appear here as you add them.)
                  </p>
                </div>
              )}
            </div>
          )}

          {activePage === 'browse-users' && (
            <div>
              <h2 className="text-3xl font-semibold mb-6 text-blue-800">Browse Other Users</h2>
              {allUsers.length === 0 ? (
                <p className="text-gray-600">No public profiles found. Create your own profile and make it public!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allUsers.map(user => (
                    <div key={user.id} className="bg-white border rounded-lg shadow-sm p-4 flex items-center space-x-4">
                      {user.profilePhotoUrl ? (
                        <img src={user.profilePhotoUrl} alt={user.name || 'User '} className="w-16 h-16 rounded-full object-cover" onError={(e) => e.target.src = 'https://placehold.co/100x100/CCCCCC/FFFFFF?text=No+Image'} />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">No Photo</div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-blue-700">{user.name || 'Anonymous User'}</h3>
                        <p className="text-gray-600 text-sm">{user.location || 'Location not set'}</p>
                        <p className="text-xs text-gray-500 mt-1">ID: {user.id}</p>
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
