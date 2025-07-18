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
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDVoOQsCrEvhRbFZP4rBgyf9dEd-AQq-us",
  authDomain: "schoolappv2-c1c84.firebaseapp.com",
  projectId: "schoolappv2-c1c84",
  storageBucket: "schoolappv2-c1c84.appspot.com",
  messagingSenderId: "70334432902",
  appId: "1:70334432902:web:d8ba08cfcf6d912fca3307"
};

// Debug initialization
console.log("[DEBUG] Initializing Firebase...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
console.log("[DEBUG] Firebase initialized successfully!");

// Helper functions
function getLastNameFromEmail(email) {
  if (!email) return '';
  const emailParts = email.split('@')[0].split('.');
  return emailParts.length > 1 ? emailParts[1].toUpperCase() : emailParts[0].toUpperCase();
}

function isDirector() {
  return auth.currentUser?.email === 'pa.domvros@gmail.com';
}

function getSchoolName(schoolId) {
  const schools = {
    "1st_gymnasio_pylaias": "1ο Γυμνάσιο Πυλαίας",
    "gymnasio_epanomis": "Γυμνάσιο Επανομής"
  };
  return schools[schoolId] || schoolId;
}

// Auth functions
async function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  if (!email || !password) {
    alert("Συμπληρώστε email και κωδικό!");
    return;
  }

  try {
    console.log("[DEBUG] Attempting login...");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("[DEBUG] Login successful:", userCredential.user.email);
  } catch (error) {
    console.error("[ERROR] Login failed:", error);
    document.getElementById("loginError").textContent = `Σφάλμα σύνδεσης: ${error.message}`;
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    console.log("[DEBUG] Logout successful");
  } catch (error) {
    console.error("[ERROR] Logout failed:", error);
  }
}

function toggleAdminView(isLoggedIn) {
  document.getElementById("loginForm").style.display = isLoggedIn ? "none" : "block";
  document.getElementById("adminSection").style.display = isLoggedIn ? "block" : "none";
  console.log(`[DEBUG] Admin view: ${isLoggedIn ? "ON" : "OFF"}`);
}

// Lesson functions
async function submitLesson() {
  const school = document.getElementById("schoolInput").value;
  const lesson = document.getElementById("lessonInput").value.trim();
  const classVal = document.getElementById("classInput").value.trim().toUpperCase();
  const date = document.getElementById("dateInput").value;
  const taughtMaterial = document.getElementById("taughtMaterialInput").value.trim();
  const attentionNotes = document.getElementById("attentionNotesInput").value.trim();

  if (!school || !lesson || !classVal || !date || !taughtMaterial) {
    alert("Συμπληρώστε όλα τα απαραίτητα πεδία!");
    return;
  }

  try {
    console.log("[DEBUG] Submitting lesson...");
    const docRef = await addDoc(collection(db, "lessons"), {
      school,
      lesson: lesson.toUpperCase(),
      class: classVal,
      date: new Date(date).toISOString(), // Convert to ISO format
      taughtMaterial,
      attentionNotes: attentionNotes || "—",
      timestamp: new Date().toISOString(),
      teacherEmail: auth.currentUser.email,
      teacherLastName: getLastNameFromEmail(auth.currentUser.email)
    });
    
    console.log("[DEBUG] Lesson submitted with ID:", docRef.id);
    alert("Η ύλη καταχωρίστηκε επιτυχώς!");
    
    // Clear form
    document.getElementById("lessonInput").value = "";
    document.getElementById("classInput").value = "";
    document.getElementById("taughtMaterialInput").value = "";
    document.getElementById("attentionNotesInput").value = "";
  } catch (error) {
    console.error("[ERROR] Submission failed:", error);
    alert(`Σφάλμα καταχώρησης: ${error.message}`);
  }
}

async function viewLessons() {
  console.log("[DEBUG] Fetching lessons...");
  
  const school = document.getElementById("schoolInputView").value;
  const studentClass = document.getElementById("studentClass").value.trim().toUpperCase();
  const lessonFilter = document.getElementById("lessonFilter").value.trim().toUpperCase();
  const teacherLastName = document.getElementById("teacherLastName").value.trim().toUpperCase();

  if (!school || !studentClass || !lessonFilter) {
    alert("Συμπληρώστε Σχολείο, Μάθημα και Τμήμα!");
    return;
  }

  try {
    const conditions = [
      where("school", "==", school),
      where("class", "==", studentClass),
      where("lesson", "==", lessonFilter),
      orderBy("timestamp", "desc") // Changed from 'date' to 'timestamp'
    ];

    if (teacherLastName) {
      conditions.push(where("teacherLastName", "==", teacherLastName));
    }

    if (auth.currentUser && !isDirector()) {
      conditions.push(where("teacherEmail", "==", auth.currentUser.email));
    }

    const q = query(collection(db, "lessons"), ...conditions);
    const snapshot = await getDocs(q);
    const container = document.getElementById("lessonsContainer");
    container.innerHTML = "";

    console.log(`[DEBUG] Found ${snapshot.size} lessons`);
    
    if (snapshot.empty) {
      container.innerHTML = "<p>Δεν βρέθηκαν καταχωρήσεις</p>";
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log("[DEBUG] Lesson data:", data); // Debug log
      
      const card = document.createElement("div");
      card.className = "lesson-card";
      card.innerHTML = `
        <h4>${data.lesson} - ${data.class} (${new Date(data.date).toLocaleDateString('el-GR')})</h4>
        <p><strong>Σχολείο:</strong> ${getSchoolName(data.school)}</p>
        <p><strong>Ύλη:</strong> ${data.taughtMaterial}</p>
        ${data.attentionNotes && data.attentionNotes !== "—" ? `<p><strong>Προσοχή:</strong> ${data.attentionNotes}</p>` : ''}
        <small>Καθηγητής: ${data.teacherLastName}</small>
      `;

      if (isDirector() || auth.currentUser?.email === data.teacherEmail) {
        const delBtn = document.createElement("button");
        delBtn.textContent = "Διαγραφή";
        delBtn.className = "delete-btn";
        delBtn.onclick = async () => {
          if (confirm("Να διαγραφεί αυτή η καταχώρηση;")) {
            await deleteDoc(doc.ref);
            card.remove();
          }
        };
        card.appendChild(delBtn);
      }
      container.appendChild(card);
    });
  } catch (error) {
    console.error("[ERROR] Fetch failed:", error);
    alert(`Σφάλμα φόρτωσης: ${error.message}`);
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  console.log("[DEBUG] DOM fully loaded");
  
  // Auth state listener
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log(`[DEBUG] User authenticated: ${user.email}`);
    } else {
      console.log("[DEBUG] No authenticated user");
    }
    toggleAdminView(!!user);
  });

  // Event listeners
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("submitLessonBtn").addEventListener("click", submitLesson);
  document.getElementById("viewLessonsBtn").addEventListener("click", viewLessons);

  // Debug element check
  ['email', 'password', 'schoolInput', 'lessonInput', 'classInput'].forEach(id => {
    if (!document.getElementById(id)) {
      console.error(`[ERROR] Missing element: ${id}`);
    }
  });
});