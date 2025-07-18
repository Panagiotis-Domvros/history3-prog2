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

// Εκκίνηση Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Debugging
console.log("Firebase initialized");

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
    alert("Συμπληρώστε email και κωδικό πρόσβασης");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("User logged in:", userCredential.user.email);
    document.getElementById("loginError").textContent = "";
  } catch (error) {
    console.error("Login error:", error);
    document.getElementById("loginError").textContent = `Σφάλμα σύνδεσης: ${error.message}`;
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    console.log("User logged out");
  } catch (error) {
    console.error("Logout error:", error);
  }
}

function toggleAdminView(isLoggedIn) {
  document.getElementById("loginForm").style.display = isLoggedIn ? "none" : "block";
  document.getElementById("adminSection").style.display = isLoggedIn ? "block" : "none";
  console.log("Admin view:", isLoggedIn ? "ON" : "OFF");
}

// Submit Lesson (Επιδιορθωμένο)
async function submitLesson() {
  const school = document.getElementById("schoolInput").value;
  const lesson = document.getElementById("lessonInput").value.trim().toUpperCase();
  const classVal = document.getElementById("classInput").value.trim().toUpperCase();
  const date = document.getElementById("dateInput").value;
  const taughtMaterial = document.getElementById("taughtMaterialInput").value.trim();
  const attentionNotes = document.getElementById("attentionNotesInput").value.trim();

  if (!school || !lesson || !classVal || !date || !taughtMaterial) {
    alert("Συμπληρώστε όλα τα απαραίτητα πεδία");
    return;
  }

  try {
    const docData = {
      school,
      lesson,
      class: classVal,
      date: new Date(date).toISOString(),
      taughtMaterial,
      attentionNotes: attentionNotes || "—",
      timestamp: new Date().toISOString(),
      teacherEmail: auth.currentUser.email,
      teacherLastName: getLastNameFromEmail(auth.currentUser.email)
    };
    
    console.log("Submitting:", docData);
    
    const docRef = await addDoc(collection(db, "lessons"), docData);
    console.log("Document written with ID:", docRef.id);
    
    alert("Η ύλη καταχωρίστηκε επιτυχώς!");
    
    // Clear form
    document.getElementById("lessonInput").value = "";
    document.getElementById("classInput").value = "";
    document.getElementById("taughtMaterialInput").value = "";
    document.getElementById("attentionNotesInput").value = "";
  } catch (error) {
    console.error("Error adding document:", error);
    alert(`Σφάλμα καταχώρησης: ${error.message}`);
  }
}

// View Lessons (Επιδιορθωμένο)
async function viewLessons() {
  try {
    const school = document.getElementById("schoolInputView").value;
    const studentClass = document.getElementById("studentClass").value.trim().toUpperCase();
    const lessonFilter = document.getElementById("lessonFilter").value.trim().toUpperCase();
    const teacherLastName = document.getElementById("teacherLastName").value.trim().toUpperCase();

    console.log("Search filters:", { school, studentClass, lessonFilter, teacherLastName });

    const conditions = [
      where("school", "==", school),
      where("class", "==", studentClass),
      where("lesson", "==", lessonFilter),
      orderBy("timestamp", "desc")
    ];

    if (teacherLastName) {
      conditions.push(where("teacherLastName", "==", teacherLastName));
    }

    if (auth.currentUser && !isDirector()) {
      conditions.push(where("teacherEmail", "==", auth.currentUser.email));
    }

    const q = query(collection(db, "lessons"), ...conditions);
    console.log("Executing query:", q);

    const snapshot = await getDocs(q);
    console.log("Query results:", snapshot.size, "documents found");

    const container = document.getElementById("lessonsContainer");
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="no-results">
          <p>Debug Information:</p>
          <ul>
            <li>Σχολείο: ${school} (${getSchoolName(school)})</li>
            <li>Τμήμα: ${studentClass}</li>
            <li>Μάθημα: ${lessonFilter}</li>
            <li>Εκπαιδευτικός: ${teacherLastName || 'Οποιοσδήποτε'}</li>
            <li>Τρέχων χρήστης: ${auth.currentUser?.email || 'Ανώνυμος'}</li>
          </ul>
        </div>
      `;
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log("Document data:", data);

      const card = document.createElement("div");
      card.className = "lesson-card";
      card.innerHTML = `
        <h4>${data.lesson} - ${data.class}</h4>
        <p><strong>Ημερομηνία:</strong> ${new Date(data.date).toLocaleDateString('el-GR')}</p>
        <p><strong>Ύλη:</strong> ${data.taughtMaterial}</p>
        ${data.attentionNotes !== "—" ? `<p><strong>Σημειώσεις:</strong> ${data.attentionNotes}</p>` : ''}
        <p><small>Καθηγητής: ${data.teacherLastName}</small></p>
      `;

      // Show delete button only for director or creator
      const showDeleteButton = isDirector() || auth.currentUser?.email === data.teacherEmail;
      if (showDeleteButton) {
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Διαγραφή";
        deleteBtn.className = "delete-btn";
        deleteBtn.onclick = async () => {
          if (confirm("Θέλετε να διαγράψετε αυτή την καταχώρηση;")) {
            try {
              await deleteDoc(doc.ref);
              card.style.transition = "opacity 0.5s";
              card.style.opacity = "0";
              setTimeout(() => card.remove(), 500);
            } catch (error) {
              console.error("Delete error:", error);
              alert("Σφάλμα κατά τη διαγραφή");
            }
          }
        };
        card.appendChild(deleteBtn);
      }

      container.appendChild(card);
    });

  } catch (error) {
    console.error("Error:", error);
    document.getElementById("lessonsContainer").innerHTML = `
      <div class="error-message">
        <p>Σφάλμα: ${error.message}</p>
        <p>Παρακαλώ ελέγξτε:</p>
        <ul>
          <li>Έχετε συνδεθεί;</li>
          <li>Τα φίλτρα είναι συμπληρωμένα σωστά;</li>
          <li>Υπάρχουν τα απαραίτητα ευρετήρια;</li>
        </ul>
        <button class="retry-btn" onclick="viewLessons()">Δοκιμάστε ξανά</button>
      </div>
    `;
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded");
  
  // Auth state listener
  onAuthStateChanged(auth, (user) => {
    console.log("Auth state changed:", user ? "Logged in" : "Logged out");
    toggleAdminView(!!user);
  });

  // Add event listeners
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("submitLessonBtn").addEventListener("click", submitLesson);
  document.getElementById("viewLessonsBtn").addEventListener("click", viewLessons);
});