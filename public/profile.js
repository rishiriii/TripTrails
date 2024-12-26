import { auth } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Update user profile details
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userEmail = document.getElementById('user-email');
    userEmail.textContent = user.email; // Display the user's email
  } else {
    // Redirect to login page if the user is not logged in
    window.location.href = 'login.html';
  }
});

// Logout functionality
document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await signOut(auth);
    alert('Logged out successfully');
    window.location.href = 'login.html'; // Redirect to login page
  } catch (error) {
    console.error('Error logging out:', error.message);
    alert('Failed to logout. Please try again.');
  }
});
