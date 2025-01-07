import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';

// Function to generate username suggestions
function generateUsernameSuggestions(baseUsername) {
  const suggestions = [];
  // Add 5 suggestions with random numbers
  for (let i = 0; i < 5; i++) {
    const randomNum = Math.floor(1000 + Math.random() * 9000); // Generate 4-digit number
    suggestions.push(`${baseUsername}${randomNum}`);
  }
  return suggestions;
}

// Function to check if a username is unique
async function isUsernameUnique(username) {
  const userProfileRef = collection(db, 'userProfiles');
  const q = query(userProfileRef, where('username', '==', username));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
}

// Function to create a new user profile
async function createUserProfile(user) {
  const userProfileRef = collection(db, 'userProfiles');

  // Create custom modal for username input
  const modalHTML = `
    <div id="username-modal" class="modal">
      <div class="modal-content">
        <h2>Create Username</h2>
        <p>Choose a unique username to continue</p>
        <input type="text" id="username-input" placeholder="Enter username">
        <p id="username-error" style="color: red; display: none;"></p>
        <div id="suggestions-container" style="display: none;">
          <p>Suggested usernames:</p>
          <div id="suggestions-list"></div>
        </div>
        <button id="submit-username">Submit</button>
      </div>
    </div>
  `;

  // Add modal styles
  const modalStyles = `
    <style>
      .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }
      .modal-content {
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 400px;
        width: 90%;
      }
      .suggestion-button {
        margin: 5px;
        padding: 5px 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
      }
      #username-input {
        width: 100%;
        padding: 8px;
        margin: 10px 0;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      #submit-username {
        width: 100%;
        padding: 10px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 10px;
      }
    </style>
  `;

  // Add modal to document
  document.body.insertAdjacentHTML('beforeend', modalStyles + modalHTML);

  const modal = document.getElementById('username-modal');
  const usernameInput = document.getElementById('username-input');
  const errorElement = document.getElementById('username-error');
  const suggestionsContainer = document.getElementById('suggestions-container');
  const suggestionsList = document.getElementById('suggestions-list');
  const submitButton = document.getElementById('submit-username');

  // Function to handle username submission
  async function handleUsernameSubmission(username) {
    if (!username) {
      errorElement.textContent = 'Username cannot be empty';
      errorElement.style.display = 'block';
      return;
    }

    const isUnique = await isUsernameUnique(username);
    if (!isUnique) {
      errorElement.textContent = 'Username already taken';
      errorElement.style.display = 'block';
      
      // Generate and show suggestions
      const suggestions = generateUsernameSuggestions(username);
      suggestionsList.innerHTML = suggestions
        .map(suggestion => `
          <button class="suggestion-button" onclick="document.getElementById('username-input').value = '${suggestion}'">
            ${suggestion}
          </button>
        `)
        .join('');
      suggestionsContainer.style.display = 'block';
      return;
    }

    // Save the user profile in Firestore
    try {
      await addDoc(userProfileRef, {
        uid: user.uid,
        username: username,
        email: user.email,
        createdAt: new Date(),
      });

      modal.remove();
      alert(`Username "${username}" created successfully!`);
      window.location.reload(); // Reload to show the profile
    } catch (error) {
      console.error('Error creating profile:', error);
      errorElement.textContent = 'Error creating profile. Please try again.';
      errorElement.style.display = 'block';
    }
  }

  submitButton.addEventListener('click', () => {
    handleUsernameSubmission(usernameInput.value.trim());
  });

  usernameInput.addEventListener('input', () => {
    errorElement.style.display = 'none';
    suggestionsContainer.style.display = 'none';
  });
}

// Function to display the profile dropdown
function displayProfile(user, userProfile) {
  const profileContainer = document.getElementById('profile-container');
  if (!profileContainer) return;

  profileContainer.innerHTML = `
    <div class="profile-button">
      <span class="user-name">${userProfile.username}</span>
      <span>▼</span>
      <div class="dropdown-content">
        <button id="my-trip-btn">My Trips</button>
        <button id="logout-btn">Logout</button>
      </div>
    </div>
  `;

  const profileButton = profileContainer.querySelector('.profile-button');
  const dropdownContent = profileContainer.querySelector('.dropdown-content');

  // Toggle dropdown on click
  profileButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event from bubbling to document
    dropdownContent.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!profileButton.contains(e.target) && dropdownContent.classList.contains('show')) {
      dropdownContent.classList.remove('show');
    }
  });

  // Edit profile button functionality
  const editProfileBtn = document.getElementById('my-trip-btn');
  editProfileBtn.addEventListener('click', () => {
    window.location.href = 'my-trips.html';
  });

  // Logout button functionality
  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Error logging out:', error.message);
      alert('Error logging out. Please try again.');
    }
  });
}

// Monitor authentication state
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  console.log('Logged in user:', user);

  // Check if user has a profile
  const userProfileRef = collection(db, 'userProfiles');
  const q = query(userProfileRef, where('uid', '==', user.uid));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    // Create user profile if it doesn't exist
    await createUserProfile(user);
  } else {
    const userProfile = querySnapshot.docs[0].data();
    console.log('User profile found:', userProfile);
    displayProfile(user, userProfile);
  }
});