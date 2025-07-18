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

// Ενεργοποίηση debug
console.log("Initializing Firebase...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
console.log("Firebase initialized successfully!");

// Helper functions
function getLastNameFromEmail(email) {
  return email ? email.split('@')[0].split('.')[1]?.toUpperCase() || email.split('@')[0].toUpperCase() : '';
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
    console.log("Προσπάθεια σύνδεσης...");
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Σφάλμα σύνδεσης:", error);
    alert(`Σφάλμα σύνδεσης: ${error.message}`);
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

// Προβολή μαθημάτων (ενημερωμένο)
async function viewLessons() {
  console.log("Προβολή μαθημάτων...");
  
  const school = document.getElementById("schoolInputView").value;
  const studentClass = document.getElementById("studentClass").value.trim().toUpperCase();
  const lessonFilter = document.getElementById("lessonFilter").value.trim().toUpperCase();
  const teacherLastName = document.getElementById("teacherLastName").value.trim().toUpperCase();

  if (!school || !studentClass || !lessonFilter) {
    alert("Συμπληρώστε όλα τα απαραίτητα πεδία!");
    return;
  }

  try {
    const conditions = [
      where("school", "==", school),
      where("class", "==", studentClass),
      where("lesson", "==", lessonFilter),
      orderBy("date", "desc")
    ];

    if (teacherLastName) conditions.push(where("teacherLastName", "==", teacherLastName));
    if (auth.currentUser && !isDirector()) conditions.push(where("teacherEmail", "==", auth.currentUser.email));

    const q = query(collection(db, "lessons"), ...conditions);
    const snapshot = await getDocs(q);
    const container = document.getElementById("lessonsContainer");
    container.innerHTML = snapshot.empty ? "<p>Δεν βρέθηκαν καταχωρήσεις</p>" : "";

    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "lesson-card";
      card.innerHTML = `
        <h4>${data.lesson} - ${data.class} (${data.date})</h4>
        <p><strong>Σχολείο:</strong> ${getSchoolName(data.school)}</p>
        <p><strong>Ύλη:</strong> ${data.taughtMaterial}</p>
        ${data.attentionNotes ? `<p><strong>Προσοχή:</strong> ${data.attentionNotes}</p>` : ''}
        <small>Καθηγητής: ${data.teacherLastName}</small>
      `;

      if (isDirector() || auth.currentUser?.email === data.teacherEmail) {
        const delBtn = document.createElement("button");
        delBtn.textContent = "Διαγραφή";
        delBtn.className = "delete-btn";
        delBtn.onclick = () => confirm("Διαγραφή;") && deleteDoc(doc.ref).then(() => card.remove());
        card.appendChild(delBtn);
      }
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Σφάλμα:", error);
    alert(`Σφάλμα: ${error.message}`);
  }
}

// Εκκίνηση εφαρμογής
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded, setting up listeners...");
  
  // Auth state
  onAuthStateChanged(auth, (user) => {
    console.log("Auth state changed:", user ? "Logged in" : "Logged out");
    toggleAdminView(!!user);
  });

  // Listeners με έλεγχο ύπαρξης στοιχείων
  const addListener = (id, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", handler);
    else console.error(`Element ${id} not found!`);
  };

  addListener("loginBtn", handleLogin);
  addListener("logoutBtn", handleLogout);
  addListener("viewLessonsBtn", viewLessons);
  
  // Ειδικός έλεγχος για το submitLessonBtn
  const submitBtn = document.getElementById("submitLessonBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const school = document.getElementById("schoolInput").value;
      const lesson = document.getElementById("lessonInput").value.trim();
      const classVal = document.getElementById("classInput").value.trim().toUpperCase();
      const date = document.getElementById("dateInput").value;
      const taughtMaterial = document.getElementById("taughtMaterialInput").value.trim();

      if (!school || !lesson || !classVal || !date || !taughtMaterial) {
        alert("Συμπληρώστε όλα τα πεδία!");
        return;
      }

      try {
        await addDoc(collection(db, "lessons"), {
          school,
          lesson: lesson.toUpperCase(),
          class: classVal,
          date,
          taughtMaterial,
          attentionNotes: document.getElementById("attentionNotesInput").value.trim() || "—",
          timestamp: new Date().toISOString(),
          teacherEmail: auth.currentUser.email,
          teacherLastName: getLastNameFromEmail(auth.currentUser.email)
        });
        alert("Καταχωρίστηκε επιτυχώς!");
        // Καθαρισμός φόρμας
        ["lessonInput", "classInput", "taughtMaterialInput", "attentionNotesInput"].forEach(id => {
          document.getElementById(id).value = "";
        });
      } catch (error) {
        console.error("Σφάλμα:", error);
        alert(`Σφάλμα: ${error.message}`);
      }
    });
  } else {
    console.error("Submit button not found!");
  }
});