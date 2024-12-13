import { auth } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert('You must be logged in to access this page!');
    window.location.href = 'login.html'; // Redirect to login if not authenticated
  } else {
    console.log('Logged in user:', user);
  }
});
