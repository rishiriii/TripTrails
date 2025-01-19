// profile.js - Update to use modal
import { auth } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { showEditProfileModal } from './edit-profile.js';

onAuthStateChanged(auth, (user) => {
  if (user) {
    const userEmail = document.getElementById('user-email');
    if (userEmail) {
      userEmail.textContent = user.email;
    }
  } else if (!window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
  }
});

// Update edit profile button handler if it exists on the profile page
const editProfileBtn = document.querySelector('.edit-profile-btn');
if (editProfileBtn) {
  editProfileBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showEditProfileModal();
  });
}

document.getElementById('logout-btn')?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    alert('Logged out successfully');
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Error logging out:', error);
    alert('Failed to logout. Please try again.');
  }
});