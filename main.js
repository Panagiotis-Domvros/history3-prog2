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
  getDocs,
  writeBatch
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

// Βοηθητικές Συναρτήσεις
function showMessage(elementId, message, type = 'info') {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `${type}-message`;
  setTimeout(() => element.textContent = '', 5000);
}

function getLastNameFromEmail(email) {
  return email.split('@')[0].split('.')[1]?.toUpperCase() || '';
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

// Σύνδεση/Αποσύνδεση
async function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showMessage('loginError', '', 'success');
  } catch (error) {
    showMessage('loginError', `Σφάλμα: ${error.message}`, 'error');
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// Διαχείριση Μαθημάτων
async function submitLesson() {
  const school = document.getElementById("schoolInput").value;
  const lesson = document.getElementById("lessonInput").value.trim().toUpperCase();
  const classVal = document.getElementById("classInput").value.trim().toUpperCase();
  const date = document.getElementById("dateInput").value;
  const taughtMaterial = document.getElementById("taughtMaterialInput").value.trim();
  const attentionNotes = document.getElementById("attentionNotesInput").value.trim();
  const privateNotes = document.getElementById("privateNotesInput").value.trim();

  try {
    const lessonData = {
      school,
      lesson,
      class: classVal,
      date: new Date(date).toISOString(),
      taughtMaterial,
      attentionNotes: attentionNotes || "—",
      privateNotes: privateNotes || "—",
      teacherEmail: auth.currentUser.email,
      teacherLastName: getLastNameFromEmail(auth.currentUser.email),
      timestamp: new Date().toISOString()
    };

    await addDoc(collection(db, "lessons"), lessonData);
    showMessage('adminMessage', 'Η ύλη καταχωρίστηκε επιτυχώς!', 'success');
    
    // Εκκαθάριση φόρμας
    document.getElementById("lessonInput").value = "";
    document.getElementById("taughtMaterialInput").value = "";
    document.getElementById("attentionNotesInput").value = "";
    document.getElementById("privateNotesInput").value = "";
  } catch (error) {
    showMessage('adminMessage', `Σφάλμα: ${error.message}`, 'error');
  }
}

async function viewLessons() {
  const school = document.getElementById("schoolInputView").value;
  const studentClass = document.getElementById("studentClass").value.trim().toUpperCase();
  const lessonFilter = document.getElementById("lessonFilter").value.trim().toUpperCase();
  const teacherLastName = document.getElementById("teacherLastName").value.trim().toUpperCase();
  const container = document.getElementById("lessonsContainer");

  try {
    container.innerHTML = '<p class="loading">Φόρτωση δεδομένων...</p>';

    let conditions = [
      where("school", "==", school),
      where("class", "==", studentClass),
      where("lesson", "==", lessonFilter),
      orderBy("timestamp", "desc")
    ];

    if (teacherLastName) conditions.push(where("teacherLastName", "==", teacherLastName));

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

      // Προσθήκη ιδιωτικών σημειώσεων (μόνο για καθηγητή/διευθυντή)
      if (auth.currentUser && (auth.currentUser.email === data.teacherEmail || isDirector())) {
        const privateNotesDiv = document.createElement("div");
        privateNotesDiv.className = "private-notes";
        privateNotesDiv.innerHTML = `
          <h4>Ιδιωτικές Σημειώσεις</h4>
          <p>${data.privateNotes}</p>
        `;
        card.appendChild(privateNotesDiv);
      }

      // Κουμπί διαγραφής (μόνο για καθηγητή/διευθυντή)
      if (auth.currentUser && (auth.currentUser.email === data.teacherEmail || isDirector())) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "Διαγραφή";
        deleteBtn.onclick = async () => {
          if (confirm("Θέλετε να διαγράψετε αυτή την καταχώρηση;")) {
            await deleteDoc(doc.ref);
            card.remove();
          }
        };
        card.appendChild(deleteBtn);
      }

      container.appendChild(card);
    });

  } catch (error) {
    container.innerHTML = `
      <div class="error-message">
        <p>Σφάλμα: ${error.message}</p>
        <button onclick="viewLessons()">Δοκιμάστε ξανά</button>
      </div>
    `;
  }
}

// Αρχικοποίηση
document.addEventListener('DOMContentLoaded', () => {
  // Σήμερα ως προεπιλεγμένη ημερομηνία
  document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
  
  // Ακροατές συμβάντων
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("submitLessonBtn").addEventListener("click", submitLesson);
  document.getElementById("viewLessonsBtn").addEventListener("click", viewLessons);

  // Ελέγχος σύνδεσης
  onAuthStateChanged(auth, (user) => {
    document.getElementById("loginForm").style.display = user ? "none" : "block";
    document.getElementById("adminSection").style.display = user ? "block" : "none";
    document.getElementById("publicView").style.display = "block";
  });
});