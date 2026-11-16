import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Import Storage

const firebaseConfig = {
  apiKey: "Enter key",
  authDomain: "Enter Domain",
  projectId: "Enter Id",
  storageBucket: "Enter Bucket",
  messagingSenderId: "000000000000",
  appId: "11111111111111111111111111111111",
  measurementId: "GGGGGGGGGGGGGG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // Initialize Storage

export { db, auth, storage }; // Export Storage
