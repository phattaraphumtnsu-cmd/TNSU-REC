// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
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
const analytics = getAnalytics(app);