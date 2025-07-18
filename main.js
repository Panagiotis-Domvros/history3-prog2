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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Βοηθητικές Συναρτήσεις
function showMessage(elementId, message, isError = false) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.style.color = isError ? '#c00' : '#008080';
}

function getTeacherName(email) {
  // 1. Λίστα Επωνύμων (Προσθέστε όλους τους καθηγητές εδώ)
  const teachers = {
    'pa.domvros@gmail.com': 'Παναγιώτης Δόμβρος',
    'mariamalamidou@gmail.com': 'Μαρία Μαλαμίδου',
    // Προσθέστε και άλλους καθηγητές με το email τους:
    'nikos.papadopoulos@example.com': 'Νίκος Παπαδόπουλος'
  };

  // 2. Αν βρεθεί το email, επιστροφή ελληνικού ονόματος
  if (teachers[email]) {
    return teachers[email];
  }

  // 3. Αν δεν υπάρχει, εμφάνιση προειδοποιητικού μηνύματος
  console.warn(`Δεν βρέθηκε ελληνικό όνομα για το email: ${email}. Προσθέστε το στη λίστα teachers.`);
  
  // 4. Επιστροφή προεπιλεγμένου μηνύματος (προαιρετικό)
  return "Καθηγητής"; // Ή μπορείτε να ζητήσετε από τον χρήστη να εισαγάγει το όνομά του
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
    console.error("Logout error:", error);
  }
}

// Διαχείριση Μαθημάτων
async function submitLesson() {
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
  } catch (error) {
    showMessage('adminMessage', `Σφάλμα καταχώρησης: ${error.message}`, true);
  }
}

async function viewLessons() {
  const school = document.getElementById("schoolInputView").value;
  const lesson = document.getElementById("lessonFilter").value.trim().toUpperCase();
  const studentClass = document.getElementById("studentClass").value.trim().toUpperCase();

  try {
    const q = query(
      collection(db, "lessons"),
      where("school", "==", school),
      where("lesson", "==", lesson),
      where("class", "==", studentClass),
      orderBy("timestamp", "desc")
    );
    
    const snapshot = await getDocs(q);
    const container = document.getElementById("lessonsContainer");
    container.innerHTML = '';

    if (snapshot.empty) {
      container.innerHTML = '<div class="no-results">Δεν βρέθηκαν καταχωρήσεις</div>';
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
        <p><strong>Καθηγητής:</strong> ${data.teacherName}</p>
      `;

      if (auth.currentUser?.email === data.teacherEmail || auth.currentUser?.email === 'pa.domvros@gmail.com') {
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
    console.error("Error:", error);
    document.getElementById("lessonsContainer").innerHTML = 
      '<div class="error-message">Σφάλμα φόρτωσης δεδομένων</div>';
  }
}

// Αρχικοποίηση
document.addEventListener('DOMContentLoaded', () => {
  // Ορίζουμε σημερινή ημερομηνία
  document.getElementById('dateInput').valueAsDate = new Date();

  // Σύνδεση Event Listeners
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("submitLessonBtn").addEventListener("click", submitLesson);
  document.getElementById("viewLessonsBtn").addEventListener("click", viewLessons);

  // Ελέγχουμε κατάσταση σύνδεσης
  onAuthStateChanged(auth, (user) => {
    document.getElementById("loginForm").style.display = user ? "none" : "block";
    document.getElementById("adminSection").style.display = user ? "block" : "none";
    document.getElementById("publicView").style.display = "block";
  });
});