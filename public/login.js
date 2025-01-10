import { auth } from '../firebase.js';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';

// Set persistence when the page loads
setPersistence(auth, browserLocalPersistence)
  .catch(error => {
    console.error('Error setting persistence:', error);
  });

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
  if (user && window.location.pathname.includes('login.html')) {
    window.location.href = 'home.html';
  }
});

// Email/Password Login
document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorElement = document.getElementById('login-error') || document.createElement('div');

  if (!email || !password) {
    errorElement.textContent = 'Please fill in all fields';
    return;
  }

  try {
    // Show loading state if you have one
    const button = event.target.querySelector('button[type="submit"]');
    if (button) button.disabled = true;

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('User logged in:', userCredential.user);
    
    // Redirect after successful login
    window.location.href = 'home.html';
  } catch (error) {
    console.error('Error logging in:', error);
    errorElement.textContent = getErrorMessage(error.code);
    event.target.appendChild(errorElement);
  } finally {
    // Reset loading state
    const button = event.target.querySelector('button[type="submit"]');
    if (button) button.disabled = false;
  }
});

// Google Sign-In
document.getElementById('google-login').addEventListener('click', async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account' // Forces account selection even if already logged in
  });

  try {
    const result = await signInWithPopup(auth, provider);
    console.log('Google user logged in:', result.user);
    window.location.href = 'home.html';
  } catch (error) {
    console.error('Error logging in with Google:', error);
    const errorElement = document.getElementById('login-error') || document.createElement('div');
    errorElement.textContent = getErrorMessage(error.code);
    document.getElementById('login-form').appendChild(errorElement);
  }
});

// Forgot Password
document.getElementById('forgot-password').addEventListener('click', async (event) => {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  
  if (!email) {
    alert('Please enter your email address in the email field');
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert('Password reset email sent! Please check your inbox.');
  } catch (error) {
    console.error('Error sending password reset email:', error);
    const errorElement = document.getElementById('login-error') || document.createElement('div');
    errorElement.textContent = getErrorMessage(error.code);
    document.getElementById('login-form').appendChild(errorElement);
  }
});

// Helper function to get user-friendly error messages
function getErrorMessage(errorCode) {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later';
    case 'auth/popup-closed-by-user':
      return 'Login popup was closed before completion';
    case 'auth/cancelled-popup-request':
      return 'Another popup is already open';
    case 'auth/popup-blocked':
      return 'Login popup was blocked by the browser';
    default:
      return 'An error occurred during login. Please try again';
  }
}