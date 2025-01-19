import { auth, db } from '../firebase.js';
import { 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';

// Set persistence to local to keep user logged in
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error('Error setting persistence:', error);
  });

// Define protected routes that require authentication
const protectedRoutes = [
  'explore.html',
  'add-trip.html',
  'my-trips.html',
  'profile.html',
  'edit-profile.html'
];

// Function to check if current page is protected
function isProtectedRoute() {
  return protectedRoutes.some(route => window.location.pathname.includes(route));
}

// Function to generate random number for username suggestions
function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to check if username exists in database
async function checkUsernameExists(username) {
  const userProfileRef = collection(db, 'userProfiles');
  const q = query(userProfileRef, where('username', '==', username));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

// Function to generate username suggestions
function generateUsernameSuggestions(baseUsername) {
  const suggestions = [];
  for (let i = 0; i < 3; i++) {
    const randomNum = getRandomNumber(1000, 9999);
    suggestions.push(`${baseUsername}${randomNum}`);
  }
  return suggestions;
}

// Function to show authentication modal
function showAuthModal() {
  const modalHTML = `
    <div id="auth-modal" class="modal">
      <div class="modal-content">
        <h2>Sign in to continue</h2>
        <p>Please log in or create an account to access this feature.</p>
        <div class="auth-buttons">
          <button onclick="window.location.href='login.html'" class="primary-btn">Login</button>
          <button onclick="window.location.href='signup.html'" class="secondary-btn">Sign Up</button>
        </div>
        <button class="close-modal">×</button>
      </div>
    </div>
  `;

  // Add modal if it doesn't exist
  if (!document.getElementById('auth-modal')) {
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
  
  // Add modal styles if not already present
  if (!document.getElementById('auth-modal-styles')) {
    const styles = `
      <style id="auth-modal-styles">
        .modal {
          display: flex;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background-color: white;
          padding: 2rem;
          border-radius: 8px;
          text-align: center;
          max-width: 400px;
          width: 90%;
          position: relative;
        }
        .auth-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1.5rem;
        }
        .auth-buttons button {
          padding: 0.5rem 2rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .close-modal {
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
        }
      </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
  }

  // Add event listeners for modal
  const modal = document.getElementById('auth-modal');
  const closeBtn = modal.querySelector('.close-modal');

  // Close modal when clicking outside or on close button
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      if (isProtectedRoute()) {
        window.location.href = 'home.html';
      }
    }
  });

  closeBtn.addEventListener('click', () => {
    modal.remove();
    if (isProtectedRoute()) {
      window.location.href = 'home.html';
    }
  });
}

// Function to prompt for username
async function promptForUsername(defaultUsername) {
  const modalHTML = `
    <div id="username-modal" class="modal">
      <div class="modal-content">
        <h2>Choose a Username</h2>
        <p>This will be your public display name</p>
        <div id="username-error" class="error-message"></div>
        <input type="text" id="username-input" value="${defaultUsername}" 
               class="username-input" maxlength="30" />
        <div id="username-suggestions" class="suggestions"></div>
        <button id="submit-username" class="primary-btn">Submit</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Add styles for username modal if not present
  if (!document.getElementById('username-modal-styles')) {
    const styles = `
      <style id="username-modal-styles">
        .username-input {
          width: 100%;
          padding: 8px;
          margin: 10px 0;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .error-message {
          color: #ff4444;
          margin: 5px 0;
        }
        .suggestions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin: 10px 0;
        }
        .suggestion-btn {
          padding: 4px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #f5f5f5;
          cursor: pointer;
        }
        .suggestion-btn:hover {
          background: #e5e5e5;
        }
      </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
  }

  const modal = document.getElementById('username-modal');
  const input = document.getElementById('username-input');
  const errorDiv = document.getElementById('username-error');
  const suggestionsDiv = document.getElementById('username-suggestions');
  const submitButton = document.getElementById('submit-username');

  return new Promise(async (resolve) => {
    let debounceTimer;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const username = input.value.trim();
        if (username) {
          const exists = await checkUsernameExists(username);
          if (exists) {
            errorDiv.textContent = 'Username already taken. Try one of these:';
            const suggestions = generateUsernameSuggestions(username);
            suggestionsDiv.innerHTML = suggestions
              .map(suggestion => `<button class="suggestion-btn">${suggestion}</button>`)
              .join('');

            document.querySelectorAll('.suggestion-btn').forEach(btn => {
              btn.addEventListener('click', () => {
                input.value = btn.textContent;
                errorDiv.textContent = '';
                suggestionsDiv.innerHTML = '';
              });
            });
          } else {
            errorDiv.textContent = '';
            suggestionsDiv.innerHTML = '';
          }
        }
      }, 500); // Debounce delay
    });

    submitButton.addEventListener('click', async () => {
      const username = input.value.trim();
      if (!username) {
        errorDiv.textContent = 'Username cannot be empty';
        return;
      }
      
      if (username.length < 3) {
        errorDiv.textContent = 'Username must be at least 3 characters long';
        return;
      }

      const exists = await checkUsernameExists(username);
      if (!exists) {
        modal.remove();
        resolve(username);
      } else {
        errorDiv.textContent = 'Please choose a different username or select one of the suggestions.';
      }
    });
  });
}

// Function to create user profile
async function createUserProfile(user) {
  const userProfileRef = collection(db, 'userProfiles');
  const defaultUsername = user.email.split('@')[0];
  
  try {
    // Prompt for username
    const username = await promptForUsername(defaultUsername);
    
    // Create profile document
    const profileData = {
      uid: user.uid,
      username: username,
      email: user.email,
      displayName: user.displayName || username,
      photoURL: user.photoURL || null,
      createdAt: new Date(),
      lastLogin: new Date(),
      bio: '',
      location: '',
      tripCount: 0,
      followersCount: 0,
      followingCount: 0
    };
    
    await addDoc(userProfileRef, profileData);
    return profileData;
  } catch (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
}

// Function to update user profile
async function updateUserProfile(userId, data) {
  try {
    const profileRef = doc(db, 'users', userId);
    const profileDoc = await getDoc(profileRef);

    if (profileDoc.exists()) {
      // Update existing profile
      await updateDoc(profileRef, data);
    } else {
      // Create new profile
      await setDoc(profileRef, {
        ...data,
        createdAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }
}

// Function to display profile in navbar
function displayProfile(user, userProfile) {
  const profileContainer = document.getElementById('profile-container');
  if (!profileContainer) return;

  profileContainer.innerHTML = `
    <div class="profile-dropdown">
      <button class="profile-btn">
        ${userProfile?.username || 'User'} 
        <i class="fas fa-chevron-down"></i>
      </button>
      <div class="dropdown-content">
        <a href="/profile.html">My Profile</a>
        <a href="/my-trips.html">My Trips</a>
        <a href="#" id="logout-btn">Logout</a>
      </div>
    </div>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
}

async function handleLogout(e) {
  e.preventDefault();
  try {
    await auth.signOut();
    window.location.href = '/';
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

// Function to handle protected route access
function handleProtectedRoute(user) {
  if (!user && isProtectedRoute()) {
    showAuthModal();
    return false;
  }
  return true;
}

// Main authentication state observer
onAuthStateChanged(auth, async (user) => {
  // Check if route is protected
  if (!handleProtectedRoute(user)) {
    return;
  }

  const profileContainer = document.getElementById('profile-container');
  if (!profileContainer) return;

  if (user) {
    try {
      // Check if user has a profile
      const userProfileRef = collection(db, 'userProfiles');
      const q = query(userProfileRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);

      let userProfile;
      if (querySnapshot.empty) {
        // Create new profile if none exists
        userProfile = await createUserProfile(user);
      } else {
        userProfile = querySnapshot.docs[0].data();
        // Update last login
        const profileDoc = querySnapshot.docs[0].ref;
        await profileDoc.update({ lastLogin: new Date() });
      }

      // Display profile in navbar
      displayProfile(user, userProfile);
    } catch (error) {
      console.error('Error handling user profile:', error);
    }
  } else {
    // Show login/signup buttons for non-authenticated users
    profileContainer.innerHTML = `
      <div class="auth-buttons">
        <button onclick="window.location.href='login.html'" class="login-btn">Login</button>
        <button onclick="window.location.href='signup.html'" class="signup-btn">Sign Up</button>
      </div>
    `;
  }
});

// Export necessary functions for use in other files
export {
  checkUsernameExists,
  generateUsernameSuggestions,
  createUserProfile,
  isProtectedRoute,
  showAuthModal
};