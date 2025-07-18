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

// Βοηθητικές συναρτήσεις
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

// Συναρτήσεις διαχείρισης
async function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  if (!email || !password) {
    alert("Συμπληρώστε email και κωδικό πρόσβασης");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    document.getElementById("loginError").textContent = "";
  } catch (error) {
    document.getElementById("loginError").textContent = `Σφάλμα σύνδεσης: ${error.message}`;
    console.error("Σφάλμα σύνδεσης:", error);
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Σφάλμα αποσύνδεσης:", error);
  }
}

function toggleAdminView(isLoggedIn) {
  document.getElementById("loginForm").style.display = isLoggedIn ? "none" : "block";
  document.getElementById("adminSection").style.display = isLoggedIn ? "block" : "none";
}

// Καταχώριση μαθήματος
async function submitLesson() {
  const school = document.getElementById("schoolInput").value;
  const lesson = document.getElementById("lessonInput").value.trim();
  const classVal = document.getElementById("classInput").value.trim().toUpperCase();
  const date = document.getElementById("dateInput").value;
  const taughtMaterial = document.getElementById("taughtMaterialInput").value.trim();
  const attentionNotes = document.getElementById("attentionNotesInput").value.trim();

  if (!school || !lesson || !classVal || !date || !taughtMaterial) {
    alert("Συμπληρώστε όλα τα απαραίτητα πεδία");
    return;
  }

  try {
    await addDoc(collection(db, "lessons"), {
      school,
      lesson: lesson.toUpperCase(),
      class: classVal,
      date: new Date(date).toISOString(),
      taughtMaterial,
      attentionNotes: attentionNotes || "—",
      timestamp: new Date().toISOString(),
      teacherEmail: auth.currentUser.email,
      teacherLastName: getLastNameFromEmail(auth.currentUser.email)
    });
    
    alert("Η ύλη καταχωρίστηκε επιτυχώς!");
    // Καθαρισμός φόρμας
    document.getElementById("lessonInput").value = "";
    document.getElementById("classInput").value = "";
    document.getElementById("taughtMaterialInput").value = "";
    document.getElementById("attentionNotesInput").value = "";
  } catch (error) {
    console.error("Σφάλμα καταχώρησης:", error);
    alert(`Σφάλμα καταχώρησης: ${error.message}`);
  }
}

// Προβολή μαθημάτων (Τελική έκδοση)
async function viewLessons() {
  try {
    const school = document.getElementById("schoolInputView").value;
    const studentClass = document.getElementById("studentClass").value.trim().toUpperCase();
    const lessonFilter = document.getElementById("lessonFilter").value.trim().toUpperCase();
    const teacherLastName = document.getElementById("teacherLastName").value.trim().toUpperCase();

    if (!school || !studentClass || !lessonFilter) {
      throw new Error("Συμπληρώστε Σχολείο, Τμήμα και Μάθημα");
    }

    const container = document.getElementById("lessonsContainer");
    container.innerHTML = '<p class="loading">Φόρτωση δεδομένων...</p>';

    // Δημιουργία query
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
        <p><small>Καθηγητής: ${data.teacherLastName}</small></p>
      `;

      // Διαγραφή μόνο για διευθυντή ή δημιουργό
      if (isDirector() || auth.currentUser?.email === data.teacherEmail) {
        const delBtn = document.createElement("button");
        delBtn.textContent = "Διαγραφή";
        delBtn.className = "delete-btn";
        delBtn.onclick = async () => {
          if (confirm("Θέλετε να διαγράψετε αυτή την καταχώρηση;")) {
            await deleteDoc(doc.ref);
            card.style.opacity = "0";
            setTimeout(() => card.remove(), 300);
          }
        };
        card.appendChild(delBtn);
      }
      
      container.appendChild(card);
    });

  } catch (error) {
    console.error("Σφάλμα:", error);
    document.getElementById("lessonsContainer").innerHTML = `
      <div class="error-message">
        <p>Σφάλμα φόρτωσης: ${error.message}</p>
        <button class="retry-btn" onclick="viewLessons()">Δοκιμάστε ξανά</button>
      </div>
    `;
  }
}

// Αρχικοποίηση εφαρμογής
document.addEventListener('DOMContentLoaded', () => {
  // Παρακολούθηση κατάστασης σύνδεσης
  onAuthStateChanged(auth, (user) => {
    toggleAdminView(!!user);
  });

  // Προσθήκη event listeners
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("submitLessonBtn").addEventListener("click", submitLesson);
  document.getElementById("viewLessonsBtn").addEventListener("click", viewLessons);
});