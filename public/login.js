import { auth } from '../firebase.js';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    alert('Login successful!');
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
    alert('Login with Google successful!');
    console.log('Google user logged in:', result.user);
    window.location.href = 'home.html'; // Redirect to homepage
  } catch (error) {
    console.error('Error logging in with Google:', error.message);
    alert(error.message);
  }
});
