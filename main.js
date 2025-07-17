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

// Helper functions
function getLastNameFromEmail(email) {
  if (!email) return '';
  const emailParts = email.split('@')[0].split('.');
  return emailParts.length > 1 ? emailParts[1].toUpperCase() : emailParts[0].toUpperCase();
}

function isDirector() {
  return auth.currentUser?.email === 'pa.domvros@gmail.com';
}

// Submit Lesson (με νέο πεδίο σχολείου)
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
      date,
      taughtMaterial,
      attentionNotes: attentionNotes || "—",
      timestamp: new Date().toISOString(),
      teacherEmail: auth.currentUser.email,
      teacherLastName: getLastNameFromEmail(auth.currentUser.email)
    });
    alert("Η ύλη καταχωρίστηκε επιτυχώς!");
  } catch (error) {
    console.error("Σφάλμα καταχώρησης:", error);
    alert("Σφάλμα καταχώρησης: " + error.message);
  }
}

// View Lessons (με φιλτράρισμα ανά σχολείο)
async function viewLessons() {
  const school = "1st_gymnasio_pylaias"; // ή επιλέξτε από select
  const studentClass = document.getElementById("studentClass").value.trim().toUpperCase();
  const lessonFilter = document.getElementById("lessonFilter").value.trim().toUpperCase();

  if (!studentClass || !lessonFilter) {
    alert("Συμπληρώστε Μάθημα και Τμήμα");
    return;
  }

  try {
    let q;
    if (isDirector()) {
      q = query(
        collection(db, "lessons"),
        where("school", "==", school),
        where("class", "==", studentClass),
        where("lesson", "==", lessonFilter),
        orderBy("date", "desc")
      );
    } else if (auth.currentUser) {
      q = query(
        collection(db, "lessons"),
        where("school", "==", school),
        where("class", "==", studentClass),
        where("lesson", "==", lessonFilter),
        where("teacherEmail", "==", auth.currentUser.email),
        orderBy("date", "desc")
      );
    } else {
      q = query(
        collection(db, "lessons"),
        where("school", "==", school),
        where("class", "==", studentClass),
        where("lesson", "==", lessonFilter),
        orderBy("date", "desc")
      );
    }

    const snapshot = await getDocs(q);
    const lessonsContainer = document.getElementById("lessonsContainer");
    lessonsContainer.innerHTML = "";

    snapshot.forEach((doc) => {
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "lesson-card";
      card.innerHTML = `
        <h4>${data.lesson} - ${data.class} (${data.date})</h4>
        <p><strong>Ύλη:</strong> ${data.taughtMaterial}</p>
        <p><strong>Προσοχή:</strong> ${data.attentionNotes || "—"}</p>
        ${isDirector() || auth.currentUser?.email === data.teacherEmail ? 
          `<small>Καθηγητής: ${data.teacherLastName}</small>` : ''}
      `;

      if (isDirector() || auth.currentUser?.email === data.teacherEmail) {
        const delBtn = document.createElement("button");
        delBtn.textContent = "Διαγραφή";
        delBtn.className = "delete-btn";
        delBtn.onclick = async () => {
          if (confirm("Διαγραφή καταχώρησης;")) {
            await deleteDoc(doc.ref);
            card.remove();
          }
        };
        card.appendChild(delBtn);
      }
      lessonsContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Σφάλμα φόρτωσης:", error);
  }
}


// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  setupUpperCaseInputs();

  // Auth state listener
  onAuthStateChanged(auth, (user) => {
    toggleAdminView(!!user);
    if (user) {
      console.log("User logged in:", user.email);
      loadPrivateNotes();
    } else {
      console.log("User logged out");
    }
  });

  // Add event listeners
  document.getElementById("loginBtn")?.addEventListener("click", handleLogin);
  document.getElementById("logoutBtn")?.addEventListener("click", handleLogout);
  document.getElementById("submitLessonBtn")?.addEventListener("click", submitLesson);
  document.getElementById("viewLessonsBtn")?.addEventListener("click", viewLessons);
  document.getElementById("submitPrivateNoteBtn")?.addEventListener("click", submitPrivateNote);
  document.getElementById("searchPrivateNotesBtn")?.addEventListener("click", () => {
    const lastName = document.getElementById("searchLastNameInput").value.trim();
    const classVal = document.getElementById("searchClassInput").value.trim().toUpperCase();
    loadPrivateNotes(lastName, classVal);
  });
});