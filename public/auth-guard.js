import { auth, db } from '../firebase.js';
import { 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc,
  updateDoc
} from 'firebase/firestore';

// Debug flag - set to true to see console logs
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log(...args);
}

// Set persistence to local
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error('Error setting persistence:', error);
  });

// Protected routes list
const protectedRoutes = [
  'explore.html',
  'add-trip.html',
  'my-trips.html',
  'profile.html',
  'edit-profile.html'
];

// Check if current page is protected
function isProtectedRoute() {
  return protectedRoutes.some(route => window.location.pathname.includes(route));
}

// Generate random number for username suggestions
function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Check if username exists
async function checkUsernameExists(username) {
  const userProfileRef = collection(db, 'userProfiles');
  const q = query(userProfileRef, where('username', '==', username));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

// Generate username suggestions
function generateUsernameSuggestions(baseUsername) {
  return Array.from({ length: 3 }, () => {
    const randomNum = getRandomNumber(1000, 9999);
    return `${baseUsername}${randomNum}`;
  });
}

// Get default username from user data
function getDefaultUsername(user) {
  // Prefer displayName if available
  if (user.displayName) {
    // Remove spaces and special characters, convert to lowercase
    return user.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  // Fall back to email prefix if no displayName
  return user.email.split('@')[0];
}

// Show username prompt modal
async function promptForUsername(defaultUsername) {
  log('Showing username prompt for:', defaultUsername);
  
  const modalHTML = `
    <div id="username-modal" class="modal" style="
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
    ">
      <div class="modal-content" style="
        background-color: white;
        padding: 2rem;
        border-radius: 8px;
        width: 90%;
        max-width: 400px;
        position: relative;
      ">
        <h2>Choose a Username</h2>
        <p>This will be your public display name</p>
        <div id="username-error" style="color: red; margin: 5px 0;"></div>
        <input type="text" id="username-input" value="${defaultUsername}" 
               style="width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;"
               maxlength="30" />
        <div id="username-suggestions" style="display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0;"></div>
        <button id="submit-username" style="
          background-color: #007bff;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          width: 100%;
        ">Submit</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

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
              .map(suggestion => `
                <button style="
                  padding: 4px 8px;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                  background: #f5f5f5;
                  cursor: pointer;
                ">${suggestion}</button>
              `)
              .join('');

            suggestionsDiv.querySelectorAll('button').forEach(btn => {
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
      }, 500);
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

// Create user profile
async function createUserProfile(user) {
  log('Creating profile for user:', user.email);
  const userProfileRef = collection(db, 'userProfiles');
  const defaultUsername = getDefaultUsername(user);
  
  try {
    const username = await promptForUsername(defaultUsername);
    log('Username selected:', username);
    
    const profileData = {
      uid: user.uid,
      displayName: username,
      email: user.email,
      //displayName: user.displayName || username,
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

// Main auth state observer
onAuthStateChanged(auth, async (user) => {
  log('Auth state changed:', user?.email);
  
  if (user) {
    try {
      // Check if user has a profile
      const userProfileRef = collection(db, 'userProfiles');
      const q = query(userProfileRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        log('No profile found - creating new profile');
        await createUserProfile(user);
        log('Profile created successfully');
        // Optionally reload the page
        window.location.reload();
      } else {
        const userProfile = querySnapshot.docs[0].data();
        const profileDoc = querySnapshot.docs[0].ref;
        await updateDoc(profileDoc, { lastLogin: new Date() });
        log('Existing profile found and updated');
      }
    } catch (error) {
      console.error('Error in auth state change:', error);
    }
  }
});

function checkAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe(); // Stop listening immediately
      
      if (!user) {
        const confirmLogin = confirm('Please log in to continue');
        if (confirmLogin) {
          window.location.href = '/login.html';
        } else {
          window.location.href = '/';
        }
        resolve(false);
      } else {
        // Check if user has a profile
        try {
          const userProfileRef = collection(db, 'userProfiles');
          const q = query(userProfileRef, where('uid', '==', user.uid));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            // Create new profile if none exists
            await createUserProfile(user);
          }
          
          resolve(true);
        } catch (error) {
          console.error('Error checking user profile:', error);
          resolve(false);
        }
      }
    });
  });
}

// Export necessary functions
export {
  checkUsernameExists,
  generateUsernameSuggestions,
  createUserProfile,
  isProtectedRoute,
  checkAuth
};