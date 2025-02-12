import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { auth } from '../firebase.js';

const signupForm = document.getElementById('signup-form');
const nameInput = document.getElementById('signup-name');
const emailInput = document.getElementById('signup-email');
const passwordInput = document.getElementById('signup-password');
const confirmPasswordInput = document.getElementById('signup-confirm-password');
const signupButton = document.getElementById('signup-button');
const googleButton = document.getElementById('google-signup');

// Input validation
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  
  const container = document.querySelector('.form-container');
  container.insertBefore(errorDiv, container.querySelector('.login-link'));
  
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// Password visibility toggle
document.querySelectorAll('.password-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const input = button.previousElementSibling;
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
    button.querySelector('i').className = `fas fa-eye${type === 'password' ? '' : '-slash'}`;
  });
});

// Google Sign Up
googleButton.addEventListener('click', async (e) => {
  e.preventDefault();
  
  try {
    googleButton.disabled = true;
    googleButton.innerHTML = '<div class="loader"></div>';
    
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Show success animation
    googleButton.innerHTML = '<i class="fas fa-check"></i> Success!';
    googleButton.classList.add('success');
    
    // Redirect after successful signup
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 1000);
    
  } catch (error) {
    console.error('Google sign-up error:', error);
    showError('Failed to sign up with Google. Please try again.');
    googleButton.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo"> Sign up with Google';
    googleButton.disabled = false;
  }
});

// Regular email/password signup
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  // Validation
  if (!name) {
    showError('Please enter your name');
    return;
  }
  
  if (!validateEmail(email)) {
    showError('Please enter a valid email address');
    return;
  }
  
  if (!validatePassword(password)) {
    showError('Password must be at least 6 characters long');
    return;
  }
  
  if (password !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }
  
  try {
    signupButton.disabled = true;
    signupButton.innerHTML = '<div class="loader"></div>';
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with name
    await updateProfile(userCredential.user, {
      displayName: name
    });
    
    // Show success animation
    signupButton.innerHTML = '<i class="fas fa-check"></i> Success!';
    signupButton.classList.add('success');
    
    // Redirect after successful signup
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 1000);
    
  } catch (error) {
    console.error('Signup error:', error);
    let errorMessage = 'Failed to create account. Please try again.';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'This email is already registered. Please log in instead.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Please enter a valid email address.';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password is too weak. Please use at least 6 characters.';
        break;
    }
    
    showError(errorMessage);
    signupButton.disabled = false;
    signupButton.innerHTML = 'Create Account';
  }
});

// Real-time validation feedback
emailInput.addEventListener('input', () => {
  const inputGroup = emailInput.parentElement;
  if (validateEmail(emailInput.value)) {
    inputGroup.classList.remove('error');
    inputGroup.classList.add('success');
  } else {
    inputGroup.classList.remove('success');
    if (emailInput.value) {
      inputGroup.classList.add('error');
    }
  }
});

passwordInput.addEventListener('input', () => {
  const inputGroup = passwordInput.parentElement;
  if (validatePassword(passwordInput.value)) {
    inputGroup.classList.remove('error');
    inputGroup.classList.add('success');
  } else {
    inputGroup.classList.remove('success');
    if (passwordInput.value) {
      inputGroup.classList.add('error');
    }
  }
});

confirmPasswordInput.addEventListener('input', () => {
  const inputGroup = confirmPasswordInput.parentElement;
  if (confirmPasswordInput.value === passwordInput.value && confirmPasswordInput.value) {
    inputGroup.classList.remove('error');
    inputGroup.classList.add('success');
  } else {
    inputGroup.classList.remove('success');
    if (confirmPasswordInput.value) {
      inputGroup.classList.add('error');
    }
  }
});
