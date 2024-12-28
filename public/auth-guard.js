import { auth, db } from '../firebase.js'; // Ensure you import both auth and Firestore
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';

// Function to check if a userID is unique
async function isUserIDUnique(userID) {
  const userProfileRef = collection(db, 'userProfiles');
  const q = query(userProfileRef, where('userID', '==', userID));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty; // Returns true if no userID exists
}

// Function to create a new user profile
async function createUserProfile(user) {
  const userProfileRef = collection(db, 'userProfiles');

  // Prompt for userID until it is unique
  let userID = prompt('Enter a unique User ID:');
  while (!userID || !(await isUserIDUnique(userID))) {
    userID = prompt('User ID is taken or invalid. Enter a different User ID:');
  }

  // Save the user profile in Firestore
  await addDoc(userProfileRef, {
    uid: user.uid,
    userID: userID,
    email: user.email,
    createdAt: new Date(),
  });

  alert(`User ID "${userID}" created successfully!`);
}

// Function to display the profile dropdown
function displayProfile(user, userProfile) {
  const profileContainer = document.getElementById('profile-container');
  if (!profileContainer) return;

  profileContainer.innerHTML = `
    <div class="profile">
      <span class="user-email">${userProfile.userID} (${user.email})</span>
      <div class="dropdown">
        <button class="dropdown-btn">▼</button>
        <div class="dropdown-content">
          <button id="logout-btn">Logout</button>
        </div>
      </div>
    </div>
  `;

  // Logout button functionality
  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      alert('You have been logged out!');
      window.location.href = 'login.html'; // Redirect to login page
    } catch (error) {
      console.error('Error logging out:', error.message);
    }
  });
}

// Monitor authentication state
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    
    window.location.href = 'login.html'; // Redirect to login
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
    displayProfile(user, userProfile); // Display user profile in the UI
  }
});
