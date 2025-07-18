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
  updateDoc
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

// Λίστα καθηγητών με ελληνικά ονόματα
const TEACHERS = {
  'pa.domvros@gmail.com': 'Παναγιώτης Δόμβρος',
  'mariamalamidou@gmail.com': 'Μαρία Μαλαμίδου',
  'eleni@example.com': 'Ελένη Παπαδοπούλου',
  // Προσθέστε άλλους καθηγητές παρακάτω:
  'newteacher@example.com': 'Νέος Καθηγητής'
};

// Αντιστοίχιση Σχολείων -> Μαθημάτων -> Τμημάτων -> Καθηγητών
const TEACHER_ASSIGNMENTS = {
  '1st_gymnasio_pylaias': {               // 1ο Γυμνάσιο Πυλαίας
    'ΙΣΤΟΡΙΑ': {                           // Μάθημα
      'Β4': 'pa.domvros@gmail.com',        // Τμήμα Β4 -> Παναγιώτης Δόμβρος
      'Γ5': 'pa.domvros@gmail.com'         // Τμήμα Γ5 -> Παναγιώτης Δόμβρος
    }
    // Προσθέστε άλλα μαθήματα για το 1ο Γυμνάσιο εδώ:
  },
  'gymnasio_epanomis': {                  // Γυμνάσιο Επανομής
    'ΙΣΤΟΡΙΑ': {
      'Γ5': 'mariamalamidou@gmail.com'     // Τμήμα Γ5 -> Μαρία Μαλαμίδου
    },
    'ΝΟΕΛΛΗΝΙΚΗ ΓΛΩΣΣΑ': {
      'Γ2': 'eleni@example.com'            // Τμήμα Γ2 -> Ελένη Παπαδοπούλου
    }
    // Προσθέστε άλλα μαθήματα για το Γυμνάσιο Επανομής εδώ:
  }
};

// Βοηθητικές Συναρτήσεις
function showMessage(elementId, message, isError = false) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.style.color = isError ? '#c00' : '#008080';
  }
}

function getTeacherName(email) {
  if (!email) {
    console.error("Λάθος: Δεν βρέθηκε email χρήστη.");
    return "Καθηγητής";
  }
  const normalizedEmail = email.trim().toLowerCase();
  return TEACHERS[normalizedEmail] || "Καθηγητής";
}

// Σύνδεση/Αποσύνδεση
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
    console.error("Σφάλμα αποσύνδεσης:", error);
  }
}

// Καταχώρηση Μαθήματος
async function submitLesson() {
  if (!auth.currentUser) {
    showMessage('adminMessage', 'Πρέπει να συνδεθείτε πρώτα!', true);
    return;
  }

  const lessonData = {
    school: document.getElementById("schoolInput").value,
    lesson: document.getElementById("lessonInput").value.trim().toUpperCase(),
    class: document.getElementById("classInput").value.trim().toUpperCase(),
    date: document.getElementById("dateInput").value,
    taughtMaterial: document.getElementById("taughtMaterialInput").value.trim(),
    attentionNotes: document.getElementById("attentionNotesInput").value.trim() || "—",
    teacherEmail: auth.currentUser.email,
    teacherName: getTeacherName(auth.currentUser.email),
    timestamp: new Date().toISOString()
  };

  try {
    await addDoc(collection(db, "lessons"), lessonData);
    showMessage('adminMessage', 'Η ύλη καταχωρίστηκε επιτυχώς!');
    document.getElementById("taughtMaterialInput").value = '';
    document.getElementById("attentionNotesInput").value = '';
  } catch (error) {
    showMessage('adminMessage', `Σφάλμα: ${error.message}`, true);
  }
}

// Προβολή Μαθημάτων
async function viewLessons() {
  const school = document.getElementById("schoolInputView").value;
  const lesson = document.getElementById("lessonFilter").value.trim().toUpperCase();
  const studentClass = document.getElementById("studentClass").value.trim().toUpperCase();
  const container = document.getElementById("lessonsContainer");

  try {
    const q = query(
      collection(db, "lessons"),
      where("school", "==", school),
      where("lesson", "==", lesson),
      where("class", "==", studentClass),
      orderBy("timestamp", "desc")
    );
    
    const snapshot = await getDocs(q);
    container.innerHTML = '';

    if (snapshot.empty) {
      container.innerHTML = '<div class="no-results">Δεν βρέθηκαν καταχωρήσεις.</div>';
      return;
    }

    // Αντιστοίχιση καθηγητή βάσει σχολείου/μαθήματος/τμήματος
    const assignedTeacherEmail = TEACHER_ASSIGNMENTS[school]?.[lesson]?.[studentClass];
    const teacherName = assignedTeacherEmail 
      ? getTeacherName(assignedTeacherEmail) 
      : "Καθηγητής";

    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "lesson-card";
      card.innerHTML = `
        <h4>${data.lesson} - ${data.class}</h4>
        <p><strong>Ημερομηνία:</strong> ${new Date(data.date).toLocaleDateString('el-GR')}</p>
        <p><strong>Ύλη:</strong> ${data.taughtMaterial}</p>
        <p><strong>Εκπαιδευτικός:</strong> ${teacherName}</p>
      `;

      if (auth.currentUser && (auth.currentUser.email === data.teacherEmail || auth.currentUser.email === 'pa.domvros@gmail.com')) {
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
    console.error("Σφάλμα:", error);
    container.innerHTML = '<div class="error-message">Σφάλμα φόρτωσης δεδομένων.</div>';
  }
}

// Αρχικοποίηση
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dateInput').valueAsDate = new Date();
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("submitLessonBtn").addEventListener("click", submitLesson);
  document.getElementById("viewLessonsBtn").addEventListener("click", viewLessons);

  onAuthStateChanged(auth, (user) => {
    document.getElementById("loginForm").style.display = user ? "none" : "block";
    document.getElementById("adminSection").style.display = user ? "block" : "none";
    document.getElementById("publicView").style.display = "block";
  });
});

// Script για ενημέρωση υπαρχουσών καταχωρήσεων (προαιρετικό)
async function updateExistingLessons() {
  const snapshot = await getDocs(collection(db, "lessons"));
  snapshot.forEach(async (doc) => {
    const data = doc.data();
    const assignedTeacherEmail = TEACHER_ASSIGNMENTS[data.school]?.[data.lesson]?.[data.class];
    if (assignedTeacherEmail && (!data.teacherName || data.teacherName === "Καθηγητής")) {
      await updateDoc(doc.ref, {
        teacherName: getTeacherName(assignedTeacherEmail)
      });
      console.log(`Ενημερώθηκε η καταχώρηση ${doc.id}`);
    }
  });
}
// updateExistingLessons(); // Ξεσχολιάστε για μια φορά αν χρειάζεται