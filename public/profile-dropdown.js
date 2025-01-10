import { auth } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function createProfileDropdown() {
  const container = document.getElementById('profile-container');
  if (!container) return;

  // Create profile button
  const button = document.createElement('button');
  button.className = 'profile-button';
  button.innerHTML = `
    <span>Profile</span>
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
    </svg>
  `;

  // Create dropdown content
  const dropdown = document.createElement('div');
  dropdown.className = 'profile-dropdown';
  dropdown.innerHTML = `
    <a href="/my-trips.html" class="dropdown-item">My Trips</a>
    <a href="#" class="dropdown-item" id="logout-btn">Logout</a>
  `;

  // Add elements to container
  container.appendChild(button);
  container.appendChild(dropdown);

  // Toggle dropdown
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });

  // Handle logout
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

// Initialize dropdown when user is authenticated
onAuthStateChanged(auth, (user) => {
  if (user) {
    createProfileDropdown();
  }
});