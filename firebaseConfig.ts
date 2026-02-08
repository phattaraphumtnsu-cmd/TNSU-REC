
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBhX2UHdw1_rw2gyP08DRaCyg1W1q7mg00",
  authDomain: "tnsurec.firebaseapp.com",
  projectId: "tnsurec",
  storageBucket: "tnsurec.firebasestorage.app",
  messagingSenderId: "762502210970",
  appId: "1:762502210970:web:a107db3bfb4d4482f18623",
  measurementId: "G-WY42SFTG8S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const dbFirestore = getFirestore(app);
export const storage = getStorage(app);
