// Import the functions you need from the SDKs you need
// config/firebase.jsx
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // GUNAKAN getAuth bukan initializeAuth
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCKvib3POX6k5RGa2ePkBYkwtUWEzgIRXY",
  authDomain: "bareng-app.firebaseapp.com",
  databaseURL: "https://bareng-app-default-rtdb.firebaseio.com",
  projectId: "bareng-app",
  storageBucket: "bareng-app.firebasestorage.app",
  messagingSenderId: "495611710585",
  appId: "1:495611710585:web:57676c5574c7107cc718a8",
  measurementId: "G-BDKVL79DTN",
};

// Pastikan tidak ada duplikat inisialisasi
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app); // Gunakan ini di Expo Go
const db = getFirestore(app);

export { app, auth, db };
