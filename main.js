import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase Config (ΧΡΗΣΙΜΟΠΟΙΗΣΤΕ ΤΑ ΔΙΚΑ ΣΑΣ ΣΤΟΙΧΕΙΑ)
const firebaseConfig = {
  apiKey: "AIzaSyDVoOQsCrEvhRbFZP4rBgyf9dEd-AQq-us",
  authDomain: "schoolappv2-c1c84.firebaseapp.com",
  projectId: "schoolappv2-c1c84",
  storageBucket: "schoolappv2-c1c84.appspot.com",
  messagingSenderId: "70334432902",
  appId: "1:70334432902:web:d8ba08cfcf6d912fca3307"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper Functions
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = "error-message";
}

function showSuccess(elementId, message) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = "success-message";
}

// Login Function
async function handleLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  
  if (!email || !password) {
    showError("loginError", "Συμπληρώστε email και κωδικό");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showError("loginError", "");
  } catch (error) {
    showError("loginError", "Σφάλμα σύνδεσης: " + error.message);
  }
}

// Submit Lesson Function
async function submitLesson() {
  const school = document.getElementById("schoolInput").value;
  const lesson = document.getElementById("lessonInput").value.trim();
  const classVal = document.getElementById("classInput").value.trim().toUpperCase();
  const date = document.getElementById("dateInput").value;
  const taughtMaterial = document.getElementById("taughtMaterialInput").value.trim();

  if (!school || !lesson || !classVal || !date || !taughtMaterial) {
    showError("adminMessage", "Συμπληρώστε όλα τα πεδία");
    return;
  }

  try {
    await addDoc(collection(db, "lessons"), {
      school,
      lesson: lesson.toUpperCase(),
      class: classVal,
      date,
      taughtMaterial,
      teacherEmail: auth.currentUser.email,
      timestamp: new Date().toISOString()
    });
    showSuccess("adminMessage", "Η ύλη καταχωρίστηκε επιτυχώς!");
    
    // Clear form
    document.getElementById("lessonInput").value = "";
    document.getElementById("classInput").value = "";
    document.getElementById("taughtMaterialInput").value = "";
  } catch (error) {
    showError("adminMessage", "Σφάλμα: " + error.message);
  }
}

// Logout Function
async function handleLogout() {
  try {
    await signOut(auth);
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    showSuccess("adminMessage", "");
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// Toggle UI based on auth state
function toggleAdminView(loggedIn) {
  document.getElementById("loginForm").style.display = loggedIn ? "none" : "block";
  document.getElementById("adminSection").style.display = loggedIn ? "block" : "none";
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  // Auth state listener
  onAuthStateChanged(auth, (user) => {
    toggleAdminView(!!user);
  });

  // Event listeners
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("submitLessonBtn").addEventListener("click", submitLesson);
});
