// Import the showEditProfileModal function
import { showEditProfileModal } from './edit-profile.js';

// Import required Firebase functions
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function getUserProfile(uid) {
  const userProfileRef = collection(db, 'userProfiles');
  const q = query(userProfileRef, where('uid', '==', uid));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data();
  }
  return null;
}

function createProfileDropdown(user, userProfile) {
  const profileContainer = document.getElementById('profile-container');
  if (!profileContainer) return;

  const displayName = userProfile?.username || user.email.split('@')[0];

  profileContainer.innerHTML = `
    <div class="profile-dropdown">
      <button class="profile-btn">
        <span>${displayName}</span>
        <i class="fas fa-chevron-down"></i>
      </button>
      <div class="dropdown-content">
        <a href="#" class="dropdown-item" id="edit-profile-btn">
          <i class="fas fa-user"></i> My Profile
        </a>
        <a href="/my-trips.html" class="dropdown-item">
          <i class="fas fa-map-marked-alt"></i> My Trips
        </a>
        <a href="#" class="dropdown-item" id="logout-btn">
          <i class="fas fa-sign-out-alt"></i> Logout
        </a>
      </div>
    </div>
  `;

  // Add event listeners
  const dropdownBtn = profileContainer.querySelector('.profile-btn');
  const dropdownContent = profileContainer.querySelector('.dropdown-content');
  const editProfileBtn = document.getElementById('edit-profile-btn');

  dropdownBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownContent.classList.toggle('show');
  });

  // Add edit profile click handler
  editProfileBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    dropdownContent.classList.remove('show'); // Close dropdown
    showEditProfileModal(); // Show edit profile modal
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!profileContainer.contains(e.target)) {
      dropdownContent.classList.remove('show');
    }
  });

  // Handle logout
  document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = 'home.html';
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Failed to logout. Please try again.');
    }
  });
}

// Main authentication state observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userProfile = await getUserProfile(user.uid);
      createProfileDropdown(user, userProfile);
    } catch (error) {
      console.error('Error handling user profile:', error);
    }
  } else {
    const profileContainer = document.getElementById('profile-container');
    if (profileContainer) {
      profileContainer.innerHTML = `
        <div class="auth-buttons">
          <a href="login.html" class="login-btn">Login</a>
          <a href="signup.html" class="signup-btn">Sign Up</a>
        </div>
      `;
    }
  }
});

export { getUserProfile };