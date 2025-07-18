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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper functions
function showMessage(elementId, message, isError = false) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.style.color = isError ? '#c00' : '#2c7873';
}

function getLastNameFromEmail(email) {
  return email.split('@')[0].split('.')[1]?.toUpperCase() || '';
}

function isDirector() {
  return auth.currentUser?.email === 'pa.domvros@gmail.com';
}

// Authentication
async function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showMessage('loginError', '');
  } catch (error) {
    showMessage('loginError', 'Λάθος email ή κωδικός', true);
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// Lessons management
async function submitLesson() {
  const lessonData = {
    school: document.getElementById("schoolInput").value,
    lesson: document.getElementById("lessonInput").value.toUpperCase(),
    class: document.getElementById("classInput").value.toUpperCase(),
    date: document.getElementById("dateInput").value,
    taughtMaterial: document.getElementById("taughtMaterialInput").value,
    attentionNotes: document.getElementById("attentionNotesInput").value || "—",
    privateNotes: document.getElementById("privateNotesInput").value || "—",
    teacherEmail: auth.currentUser.email,
    teacherLastName: getLastNameFromEmail(auth.currentUser.email),
    timestamp: new Date().toISOString()
  };

  try {
    await addDoc(collection(db, "lessons"), lessonData);
    showMessage('adminMessage', 'Η ύλη καταχωρίστηκε επιτυχώς!');
  } catch (error) {
    showMessage('adminMessage', 'Σφάλμα καταχώρησης', true);
  }
}

async function viewLessons() {
  const filters = {
    school: document.getElementById("schoolInputView").value,
    lesson: document.getElementById("lessonFilter").value.toUpperCase(),
    class: document.getElementById("studentClass").value.toUpperCase()
  };

  try {
    const q = query(
      collection(db, "lessons"),
      where("school", "==", filters.school),
      where("lesson", "==", filters.lesson),
      where("class", "==", filters.class),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(q);
    const container = document.getElementById("lessonsContainer");
    container.innerHTML = '';

    if (snapshot.empty) {
      container.innerHTML = '<p>Δεν βρέθηκαν καταχωρήσεις</p>';
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "lesson-card";
      card.innerHTML = `
        <h4>${data.lesson} - ${data.class}</h4>
        <p>${new Date(data.date).toLocaleDateString('el-GR')}</p>
        <p><strong>Ύλη:</strong> ${data.taughtMaterial}</p>
        ${data.attentionNotes !== "—" ? `<p>${data.attentionNotes}</p>` : ''}
        <p><em>Καθηγητής: ${data.teacherLastName}</em></p>
      `;

      if (auth.currentUser && (auth.currentUser.email === data.teacherEmail || isDirector())) {
        // Ιδιωτικές σημειώσεις
        if (data.privateNotes !== "—") {
          const privateNotesDiv = document.createElement("div");
          privateNotesDiv.className = "private-notes";
          privateNotesDiv.innerHTML = `<strong>Ιδιωτικές σημειώσεις:</strong> ${data.privateNotes}`;
          card.appendChild(privateNotesDiv);
        }

        // Κουμπί διαγραφής
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "Διαγραφή";
        deleteBtn.onclick = () => {
          if (confirm("Διαγραφή καταχώρησης;")) {
            deleteDoc(doc.ref);
            card.remove();
          }
        };
        card.appendChild(deleteBtn);
      }

      container.appendChild(card);
    });

  } catch (error) {
    console.error("Error:", error);
    document.getElementById("lessonsContainer").innerHTML = 
      '<p style="color:#c00">Σφάλμα φόρτωσης δεδομένων</p>';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Set today's date
  document.getElementById('dateInput').valueAsDate = new Date();

  // Event listeners
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("submitLessonBtn").addEventListener("click", submitLesson);
  document.getElementById("viewLessonsBtn").addEventListener("click", viewLessons);

  // Auth state
  onAuthStateChanged(auth, (user) => {
    document.getElementById("loginForm").style.display = user ? "none" : "block";
    document.getElementById("adminSection").style.display = user ? "block" : "none";
    document.getElementById("publicView").style.display = "block";
  });
});