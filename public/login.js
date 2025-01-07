import { auth } from '../firebase.js';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    console.log('User logged in:', userCredential.user);
    window.location.href = 'home.html'; // Redirect to homepage
  } catch (error) {
    console.error('Error logging in:', error.message);
    alert(error.message);
  }
});

// Google Sign-In
document.getElementById('google-login').addEventListener('click', async () => {
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    
    console.log('Google user logged in:', result.user);
    window.location.href = 'home.html'; // Redirect to homepage
  } catch (error) {
    console.error('Error logging in with Google:', error.message);
    alert(error.message);
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
    alert(error.message);
  }
});