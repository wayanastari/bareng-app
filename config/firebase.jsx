// Import the functions you need from the SDKs you need
// config/firebase.jsx
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // GUNAKAN getAuth bukan initializeAuth
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: ,
  authDomain: ,
  databaseURL: ,
  projectId: ,
  storageBucket:,
  messagingSenderId: ,
  appId: ,
  measurementId: ,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app); // Gunakan ini di Expo Go
const db = getFirestore(app);

export { app, auth, db };
