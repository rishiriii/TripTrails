import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase.js';


document.getElementById('signup-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    console.log('User signed up:', userCredential.user);
    window.location.href = 'home.html'; // Redirect to homepage after signup
  } catch (error) {
    console.error('Error signing up:', error.message);
    alert(error.message);
  }
});
