import { auth, db } from '../firebase.js';
import { onAuthStateChanged, setPersistence, browserLocalPersistence, signOut } from 'firebase/auth';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';

// Set persistence to local
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error('Error setting persistence:', error);
  });

// Function to create a user profile
async function createUserProfile(user) {
  const userProfileRef = collection(db, 'userProfiles');
  try {
    await addDoc(userProfileRef, {
      uid: user.uid,
      username: user.email.split('@')[0], // Default username from email
      email: user.email,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error creating profile:', error);
  }
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

  // Add click listeners
  const profileButton = profileContainer.querySelector('.profile-button');
  const dropdownContent = profileContainer.querySelector('.dropdown-content');

  profileButton.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownContent.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!profileButton.contains(e.target)) {
      dropdownContent.classList.remove('show');
    }
  });

  // Navigation and logout handlers
  document.getElementById('my-trip-btn')?.addEventListener('click', () => {
    window.location.href = 'my-trips.html';
  });

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  });
}

// Monitor authentication state
onAuthStateChanged(auth, async (user) => {
  // Only redirect to login if not on login page
  if (!user && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
    return;
  }

  if (user) {
    // Check if user has a profile
    const userProfileRef = collection(db, 'userProfiles');
    const q = query(userProfileRef, where('uid', '==', user.uid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      await createUserProfile(user);
      window.location.reload();
    } else {
      const userProfile = querySnapshot.docs[0].data();
      displayProfile(user, userProfile);
    }
  }
});