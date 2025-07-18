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

// Firebase Configuration
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
function showMessage(elementId, message, type = 'info') {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `${type}-message`;
  setTimeout(() => {
    element.textContent = '';
    element.className = 'message';
  }, 5000);
}

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

// Authentication Functions
async function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const loginBtn = document.getElementById("loginBtn");
  
  if (!email || !password) {
    showMessage('loginError', 'Συμπληρώστε email και κωδικό πρόσβασης', 'error');
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = "Σύνδεση...";
    
    await signInWithEmailAndPassword(auth, email, password);
    showMessage('loginError', '', 'success');
  } catch (error) {
    console.error("Login error:", error);
    showMessage('loginError', `Σφάλμα σύνδεσης: ${error.message}`, 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Σύνδεση Εκπαιδευτικού";
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    showMessage('adminMessage', 'Αποσυνδεθήκατε επιτυχώς', 'success');
  } catch (error) {
    console.error("Logout error:", error);
    showMessage('adminMessage', `Σφάλμα αποσύνδεσης: ${error.message}`, 'error');
  }
}

function toggleAdminView(isLoggedIn) {
  document.getElementById("loginForm").style.display = isLoggedIn ? "none" : "block";
  document.getElementById("adminSection").style.display = isLoggedIn ? "block" : "none";
  
  // Set today's date as default
  if (isLoggedIn) {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').value = today;
  }
}

// Lesson Functions
async function submitLesson() {
  const school = document.getElementById("schoolInput").value;
  const lesson = document.getElementById("lessonInput").value.trim().toUpperCase();
  const classVal = document.getElementById("classInput").value.trim().toUpperCase();
  const date = document.getElementById("dateInput").value;
  const taughtMaterial = document.getElementById("taughtMaterialInput").value.trim();
  const attentionNotes = document.getElementById("attentionNotesInput").value.trim();
  const homework = document.getElementById("homeworkInput").value.trim();
  const submitBtn = document.getElementById("submitLessonBtn");

  if (!school || !lesson || !classVal || !date || !taughtMaterial) {
    showMessage('adminMessage', 'Συμπληρώστε όλα τα απαραίτητα πεδία', 'error');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Καταχώριση...";
    
    await addDoc(collection(db, "lessons"), {
      school,
      lesson,
      class: classVal,
      date: new Date(date).toISOString(),
      taughtMaterial,
      attentionNotes: attentionNotes || "—",
      homework: homework || "—",
      timestamp: new Date().toISOString(),
      teacherEmail: auth.currentUser.email,
      teacherLastName: getLastNameFromEmail(auth.currentUser.email)
    });
    
    showMessage('adminMessage', 'Η ύλη καταχωρίστηκε επιτυχώς!', 'success');
    
    // Clear form
    document.getElementById("lessonInput").value = "";
    document.getElementById("taughtMaterialInput").value = "";
    document.getElementById("attentionNotesInput").value = "";
    document.getElementById("homeworkInput").value = "";
    document.getElementById("classInput").focus();
  } catch (error) {
    console.error("Error adding document:", error);
    showMessage('adminMessage', `Σφάλμα καταχώρησης: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Καταχώριση Ύλης";
  }
}

async function viewLessons() {
  const school = document.getElementById("schoolInputView").value;
  const studentClass = document.getElementById("studentClass").value.trim().toUpperCase();
  const lessonFilter = document.getElementById("lessonFilter").value.trim().toUpperCase();
  const teacherLastName = document.getElementById("teacherLastName").value.trim().toUpperCase();
  const container = document.getElementById("lessonsContainer");
  const viewBtn = document.getElementById("viewLessonsBtn");

  if (!school || !studentClass || !lessonFilter) {
    showMessage('guestMessage', 'Συμπληρώστε όλα τα απαραίτητα πεδία', 'error');
    return;
  }

  try {
    viewBtn.disabled = true;
    viewBtn.textContent = "Φόρτωση...";
    container.innerHTML = '<p class="loading">Φόρτωση δεδομένων...</p>';

    let conditions = [
      where("school", "==", school),
      where("class", "==", studentClass),
      where("lesson", "==", lessonFilter),
      orderBy("timestamp", "desc")
    ];

    if (teacherLastName) {
      conditions.push(where("teacherLastName", "==", teacherLastName));
    }

    // Only filter by teacher email if logged in and not director
    if (auth.currentUser && !isDirector()) {
      conditions.push(where("teacherEmail", "==", auth.currentUser.email));
    }

    const q = query(collection(db, "lessons"), ...conditions);
    const snapshot = await getDocs(q);
    
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="no-results">
          <p>Δεν βρέθηκαν καταχωρήσεις για:</p>
          <ul>
            <li>Σχολείο: ${getSchoolName(school)}</li>
            <li>Τμήμα: ${studentClass}</li>
            <li>Μάθημα: ${lessonFilter}</li>
            ${teacherLastName ? `<li>Εκπαιδευτικός: ${teacherLastName}</li>` : ''}
          </ul>
        </div>
      `;
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "lesson-card";
      card.innerHTML = `
        <h4>${data.lesson} - ${data.class}</h4>
        <p><strong>Ημερομηνία:</strong> ${new Date(data.date).toLocaleDateString('el-GR')}</p>
        <p><strong>Ύλη:</strong> ${data.taughtMaterial}</p>
        ${data.attentionNotes !== "—" ? `<p><strong>Σημειώσεις:</strong> ${data.attentionNotes}</p>` : ''}
        ${data.homework !== "—" ? `<p><strong>Εργασία:</strong> ${data.homework}</p>` : ''}
        <p><small>Καθηγητής: ${data.teacherLastName}</small></p>
      `;

      if (isDirector() || (auth.currentUser && auth.currentUser.email === data.teacherEmail)) {
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Διαγραφή";
        deleteBtn.className = "delete-btn";
        deleteBtn.onclick = async () => {
          if (confirm("Θέλετε να διαγράψετε αυτή την καταχώρηση;")) {
            try {
              await deleteDoc(doc.ref);
              card.style.opacity = "0";
              setTimeout(() => card.remove(), 300);
            } catch (error) {
              console.error("Delete error:", error);
              showMessage('guestMessage', 'Σφάλμα κατά τη διαγραφή', 'error');
            }
          }
        };
        card.appendChild(deleteBtn);
      }
      
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Error:", error);
    container.innerHTML = `
      <div class="error-message">
        <p>Σφάλμα φόρτωσης: ${error.message}</p>
        <button class="retry-btn" onclick="viewLessons()">Δοκιμάστε ξανά</button>
      </div>
    `;
  } finally {
    viewBtn.disabled = false;
    viewBtn.textContent = "Προβολή Ύλης";
  }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  // Set current date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('dateInput').value = today;
  
  // Auth state listener
  onAuthStateChanged(auth, (user) => {
    toggleAdminView(!!user);
  });

  // Event listeners
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("submitLessonBtn").addEventListener("click", submitLesson);
  document.getElementById("viewLessonsBtn").addEventListener("click", viewLessons);
  
  // Press Enter to submit forms
  document.getElementById("password").addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleLogin();
  });
  
  document.getElementById("lessonFilter").addEventListener("keypress", (e) => {
    if (e.key === "Enter") viewLessons();
  });
});

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showMessage('adminMessage', `Σφάλμα: ${event.error.message}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  showMessage('adminMessage', `Σφάλμα: ${event.reason.message}`, 'error');
});