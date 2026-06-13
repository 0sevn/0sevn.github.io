// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js"; // Uncomment if you need analytics

const firebaseConfig = {
  // Your Firebase configuration here
  apiKey: "AIzaSyC5IM5dasyavKCHczWIUlqoFThxLUtTZps",
  authDomain: "flowea-d43ef.firebaseapp.com",
  projectId: "flowea-d43ef",
  storageBucket: "flowea-d43ef.firebasestorage.app",
  messagingSenderId: "701455113224",
  appId: "1:701455113224:web:1f89c2ae60b37a075605bd",
  measurementId: "G-JCRVR188LP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
// const analytics = getAnalytics(app); // Initialize analytics if needed

export { app, db, auth, signInAnonymously, onAuthStateChanged };