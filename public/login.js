import { auth } from '../firebase.js';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';

class PopupManager {
  static show(message, type = 'success') {
    const existingPopup = document.querySelector('.popup');
    if (existingPopup) existingPopup.remove();

    const popup = document.createElement('div');
    popup.className = `popup ${type}`;
    popup.innerHTML = `
      ${message}
      <div class="popup-progress">
        <div class="popup-progress-bar"></div>
      </div>
    `;

    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 5000);
    popup.addEventListener('click', () => popup.remove());
  }
}

class LoginManager {
  constructor() {
    this.loginForm = document.getElementById('login-form');
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.forgotPasswordLink = document.querySelector('.forgot-password');
    this.googleLoginButton = document.getElementById('google-login');

    this.initEventListeners();
  }

  initEventListeners() {
    this.loginForm.addEventListener('submit', this.handleLogin.bind(this));
    this.forgotPasswordLink.addEventListener('click', this.handleForgotPassword.bind(this));
    this.googleLoginButton.addEventListener('click', this.handleGoogleLogin.bind(this));
  }

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;

    if (!email || !password) {
      PopupManager.show('Please enter both email and password', 'error');
      return;
    }

    if (!this.validateEmail(email)) {
      PopupManager.show('Please enter a valid email address', 'error');
      return;
    }

    try {
      const loginButton = this.loginForm.querySelector('button[type="submit"]');
      loginButton.disabled = true;
      loginButton.innerHTML = '<div class="loader"></div>';

      // ✅ Hardcoded admin check
      if (email === "akl@gmail.com" && password === "111111") {
        await signInWithEmailAndPassword(auth, email, password); // ✅ Logs admin into Firebase
        PopupManager.show('Admin Login Successful!');
        setTimeout(() => window.location.href = 'admin.html', 1500);
        return;
    }

      // ✅ Normal login for other users
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      PopupManager.show('Login Successful!');
      setTimeout(() => window.location.href = 'home.html', 1500);

    } catch (error) {
      let errorMessage = 'Failed to log in. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
      }
      PopupManager.show(errorMessage, 'error');
    } finally {
      const loginButton = this.loginForm.querySelector('button[type="submit"]');
      loginButton.disabled = false;
      loginButton.innerHTML = 'Log In';
    }
  }

  async handleForgotPassword(e) {
    e.preventDefault();
    const email = this.emailInput.value.trim();

    if (!email) {
      PopupManager.show('Please enter your email address', 'error');
      return;
    }

    if (!this.validateEmail(email)) {
      PopupManager.show('Please enter a valid email address', 'error');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      PopupManager.show('Password reset email sent!');
    } catch (error) {
      let errorMessage = 'Failed to send password reset email';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
      }
      PopupManager.show(errorMessage, 'error');
    }
  }

  async handleGoogleLogin(e) {
    e.preventDefault();
    
    try {
      this.googleLoginButton.disabled = true;
      this.googleLoginButton.innerHTML = '<div class="loader"></div>';

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      PopupManager.show('Google Login Successful!');
      setTimeout(() => window.location.href = 'home.html', 1500);

    } catch (error) {
      let errorMessage = 'Failed to log in with Google';
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Login popup was closed';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Login popup was blocked by browser';
          break;
      }
      PopupManager.show(errorMessage, 'error');
    } finally {
      this.googleLoginButton.disabled = false;
      this.googleLoginButton.innerHTML = 'Continue with Google';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LoginManager();
});
