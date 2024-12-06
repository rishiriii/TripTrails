import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCr6Zfxk2ad2chl0PU43jbSG7XQ3l7_QXI",
    authDomain: "trip-ffb6a.firebaseapp.com",
    projectId: "trip-ffb6a",
    storageBucket: "trip-ffb6a.firebasestorage.app",
    messagingSenderId: "218016072148",
    appId: "1:218016072148:web:ccb61263116031b9129641",
    measurementId: "G-SZXWGQBPNZ"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
