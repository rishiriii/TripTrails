// profile-dropdown.js - Update the dropdown menu to use modal
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { showEditProfileModal } from './edit-profile.js'; // Import the modal function

async function getUserProfile(uid) {
  const userProfileRef = collection(db, 'userProfiles');
  const q = query(userProfileRef, where('uid', '==', uid));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data();
  }
  return null;
}

async function createProfileDropdown(user) {
  const container = document.getElementById('profile-container');
  if (!container) return;

  const userProfile = await getUserProfile(user.uid);
  const displayName = userProfile?.username || user.email.split('@')[0];

  const button = document.createElement('button');
  button.className = 'profile-button';
  button.innerHTML = `
    <span>${displayName}</span>
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
    </svg>
  `;

  const dropdown = document.createElement('div');
  dropdown.className = 'profile-dropdown';
  dropdown.innerHTML = `
    
    <a href="#" class="dropdown-item" id="edit-profile-btn">Edit Profile</a>
    <a href="/my-trips.html" class="dropdown-item">My Trips</a>
    <a href="#" class="dropdown-item" id="logout-btn">Logout</a>
  `;

  container.innerHTML = '';
  container.appendChild(button);
  container.appendChild(dropdown);

  // Add event listener for Edit Profile button
  document.getElementById('edit-profile-btn').addEventListener('click', (e) => {
    e.preventDefault();
    dropdown.classList.remove('show'); // Hide dropdown when opening modal
    showEditProfileModal();
  });

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Failed to logout. Please try again.');
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    createProfileDropdown(user);
  }
});