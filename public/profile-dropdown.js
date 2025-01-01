// profile-dropdown.js
import { auth } from '../firebase.js'; // Import Firebase Auth
import { signOut, onAuthStateChanged } from 'firebase/auth';

function createProfileDropdown() {
  const profileContainer = document.getElementById('profile-container');
  if (!profileContainer) {
    console.error('Profile container not found');
    return;
  }

  // Create the dropdown
  const profileHTML = `
    <div class="profile-button">
      <span class="user-name"></span>
      <div class="dropdown-content">
        <button id="view-my-trips-btn">View My Trips</button>
        <button id="logout-btn">Logout</button>
      </div>
    </div>
  `;
  profileContainer.innerHTML = profileHTML;

  // Add event listeners
  const dropdownContent = document.querySelector('.dropdown-content');
  document.querySelector('.profile-button').addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownContent.classList.toggle('show');
  });

  window.addEventListener('click', () => {
    dropdownContent.classList.remove('show');
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = 'login.html'; // Redirect to login on logout
    } catch (error) {
      console.error('Error logging out:', error.message);
      alert('Failed to logout. Please try again.');
    }
  });

  document.getElementById('view-my-trips-btn').addEventListener('click', () => {
    window.location.href = 'my-trips.html'; // Redirect to the user's trips page
  });
}

// Monitor auth state and update the dropdown
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'login.html'; // Redirect if not authenticated
  } else {
    createProfileDropdown();

    const userNameSpan = document.querySelector('.user-name');
    if (userNameSpan) {
      userNameSpan.textContent = user.displayName || user.email;
    }
  }
});