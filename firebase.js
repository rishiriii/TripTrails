import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Import Storage

const firebaseConfig = {
  apiKey: "AIzaSyCvq6mZ_gzRKr97dS4xFnAN4vHtdVegMUk",
  authDomain: "triptrails-4fa77.firebaseapp.com",
  projectId: "triptrails-4fa77",
  storageBucket: "triptrails-4fa77.firebasestorage.app",
  messagingSenderId: "115117890029",
  appId: "1:115117890029:web:c8c0c66fd37a64dade2fe4",
  measurementId: "G-2Q8699E6LV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // Initialize Storage

export { db, auth, storage }; // Export Storage
