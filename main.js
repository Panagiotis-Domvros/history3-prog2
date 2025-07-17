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

// Helper function to extract last name from email
function getLastNameFromEmail(email) {
  if (!email) return '';
  const emailParts = email.split('@')[0].split('.');
  return emailParts.length > 1 ? emailParts[1].toUpperCase() : emailParts[0].toUpperCase();
}

// Αυτόματη μετατροπή σε κεφαλαία
function setupUpperCaseInputs() {
  const uppercaseInputs = [
    document.getElementById("classInput"),
    document.getElementById("studentClass"),
    document.getElementById("lessonFilter"),
    document.getElementById("privateClass"),
    document.getElementById("searchClassInput")
  ];

  uppercaseInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        input.value = input.value.toUpperCase();
      });
    }
  });
}

// Auth State Management
function toggleAdminView(loggedIn) {
  const loginForm = document.getElementById("loginForm");
  const adminSection = document.getElementById("adminSection");
  if (loginForm && adminSection) {
    loginForm.style.display = loggedIn ? "none" : "block";
    adminSection.style.display = loggedIn ? "block" : "none";
  }
}

// Login Function
async function handleLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const loginError = document.getElementById("loginError");

  if (!email || !password) {
    loginError.textContent = "Συμπληρώστε email και κωδικό";
    loginError.className = "error-message";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginError.textContent = "";
  } catch (error) {
    loginError.textContent = "Σφάλμα σύνδεσης: " + error.message;
    loginError.className = "error-message";
    console.error("Login error:", error);
  }
}

// Logout Function
async function handleLogout() {
  try {
    await signOut(auth);
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    document.getElementById("adminMessage").textContent = "";
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// Submit Lesson Function
async function submitLesson() {
  const lesson = document.getElementById("lessonInput").value.trim();
  const classVal = document.getElementById("classInput").value.trim().toUpperCase();
  const date = document.getElementById("dateInput").value;
  const taughtMaterial = document.getElementById("taughtMaterialInput").value.trim();
  const attentionNotes = document.getElementById("attentionNotesInput").value.trim();
  const adminMessage = document.getElementById("adminMessage");

  if (!lesson || !classVal || !date || !taughtMaterial) {
    adminMessage.textContent = "Συμπληρώστε όλα τα απαραίτητα πεδία";
    adminMessage.className = "error-message";
    return;
  }

  try {
    const teacherLastName = getLastNameFromEmail(auth.currentUser.email);
    
    await addDoc(collection(db, "lessons"), {
      lesson: lesson.toUpperCase(),
      class: classVal,
      date,
      taughtMaterial,
      attentionNotes: attentionNotes || "—",
      timestamp: new Date().toISOString(),
      teacherEmail: auth.currentUser.email,
      teacherLastName: teacherLastName,
      school: "1st_gymnasio_pylaias" // Προσθήκη σχολείου
    });

    adminMessage.textContent = "Η ύλη καταχωρίστηκε επιτυχώς!";
    adminMessage.className = "success-message";
    
    // Clear form
    document.getElementById("lessonInput").value = "";
    document.getElementById("classInput").value = "";
    document.getElementById("dateInput").value = "";
    document.getElementById("taughtMaterialInput").value = "";
    document.getElementById("attentionNotesInput").value = "";
  } catch (error) {
    adminMessage.textContent = "Σφάλμα: " + error.message;
    adminMessage.className = "error-message";
    console.error("Submit lesson error:", error);
  }
}

// View Lessons Function
async function viewLessons() {
  const studentClass = document.getElementById("studentClass").value.trim().toUpperCase();
  const lessonFilter = document.getElementById("lessonFilter").value.trim().toUpperCase();
  const teacherLastName = document.getElementById("teacherLastName").value.trim().toUpperCase();
  const lessonsContainer = document.getElementById("lessonsContainer");
  const guestMessage = document.getElementById("guestMessage");
  
  lessonsContainer.innerHTML = "";
  guestMessage.textContent = "";

  if (!studentClass || !lessonFilter) {
    guestMessage.textContent = "Συμπληρώστε Μάθημα και Τμήμα";
    guestMessage.className = "error-message";
    return;
  }

  try {
    let q;
    if (auth.currentUser?.email === 'pa.domvros@gmail.com') {
      // Διευθυντής: Βλέπει όλα τα μαθήματα του σχολείου
      q = query(
        collection(db, "lessons"),
        where("class", "==", studentClass),
        where("lesson", "==", lessonFilter),
        where("school", "==", "1st_gymnasio_pylaias"),
        orderBy("date", "desc")
      );
    } else if (auth.currentUser) {
      // Καθηγητής: Βλέπει μόνο τα δικά του μαθήματα
      q = query(
        collection(db, "lessons"),
        where("class", "==", studentClass),
        where("lesson", "==", lessonFilter),
        where("school", "==", "1st_gymnasio_pylaias"),
        where("teacherEmail", "==", auth.currentUser.email),
        orderBy("date", "desc")
      );
    } else {
      // Guest: Βλέπει όλα τα μαθήματα του σχολείου (χωρίς φίλτρο επιθέτου)
      q = query(
        collection(db, "lessons"),
        where("class", "==", studentClass),
        where("lesson", "==", lessonFilter),
        where("school", "==", "1st_gymnasio_pylaias"),
        orderBy("date", "desc")
      );
    }

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      guestMessage.textContent = "Δεν βρέθηκε ύλη για τα κριτήρια αυτά";
      guestMessage.className = "info-message";
      return;
    }
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const card = document.createElement("div");
      card.className = "lesson-card";
      
      // Εμφάνιση επιθέτου μόνο για διευθυντή/καθηγητή
      const showTeacherInfo = auth.currentUser && 
                           (auth.currentUser.email === 'pa.domvros@gmail.com' || 
                            auth.currentUser.email === data.teacherEmail);
      
      card.innerHTML = `
        <h4>${data.lesson} - ${data.class} (${data.date})</h4>
        <p><strong>Ύλη:</strong> ${data.taughtMaterial}</p>
        <p><strong>Προσοχή:</strong> ${data.attentionNotes || "—"}</p>
        ${showTeacherInfo ? `<small>Καθηγητής: ${data.teacherLastName}</small>` : ''}
      `;
      
      // Εμφάνιση delete button μόνο για τον δημιουργό ή τον διευθυντή
      if (auth.currentUser?.email === data.teacherEmail || auth.currentUser?.email === 'pa.domvros@gmail.com') {
        const delBtn = document.createElement("button");
        delBtn.textContent = "Διαγραφή";
        delBtn.className = "delete-btn";
        delBtn.onclick = async () => {
          if (confirm("Διαγραφή καταχώρησης;")) {
            await deleteDoc(doc(db, "lessons", docSnap.id));
            card.remove();
            guestMessage.textContent = "Η καταχώρηση διαγράφηκε!";
            guestMessage.className = "success-message";
          }
        };
        card.appendChild(delBtn);
      }
      lessonsContainer.appendChild(card);
    });
  } catch (error) {
    guestMessage.textContent = "Σφάλμα: " + error.message;
    guestMessage.className = "error-message";
    console.error("View lessons error:", error);
  }
}

// Private Notes Functions
async function submitPrivateNote() {
  const lastName = document.getElementById("privateLastName").value.trim();
  const classVal = document.getElementById("privateClass").value.trim().toUpperCase();
  const note = document.getElementById("privateNotesInput").value.trim();
  const privateNoteMessage = document.getElementById("privateNoteMessage");

  if (!lastName || !classVal || !note) {
    privateNoteMessage.textContent = "Συμπληρώστε όλα τα πεδία";
    privateNoteMessage.className = "error-message";
    return;
  }

  try {
    await addDoc(collection(db, "privateNotes"), {
      lastName,
      class: classVal,
      note,
      timestamp: new Date().toISOString(),
      teacherEmail: auth.currentUser.email
    });

    privateNoteMessage.textContent = "Η σημείωση αποθηκεύτηκε!";
    privateNoteMessage.className = "success-message";
    
    document.getElementById("privateLastName").value = "";
    document.getElementById("privateClass").value = "";
    document.getElementById("privateNotesInput").value = "";
    loadPrivateNotes();
  } catch (error) {
    privateNoteMessage.textContent = "Σφάλμα: " + error.message;
    privateNoteMessage.className = "error-message";
    console.error("Submit note error:", error);
  }
}

async function loadPrivateNotes(lastName = "", classVal = "") {
  const privateNotesList = document.getElementById("privateNotesList");
  privateNotesList.innerHTML = "";
  let q;

  if (auth.currentUser?.email === 'pa.domvros@gmail.com') {
    if (lastName && classVal) {
      q = query(
        collection(db, "privateNotes"),
        where("lastName", "==", lastName),
        where("class", "==", classVal),
        orderBy("timestamp", "desc")
      );
    } else if (lastName) {
      q = query(
        collection(db, "privateNotes"),
        where("lastName", "==", lastName),
        orderBy("timestamp", "desc")
      );
    } else if (classVal) {
      q = query(
        collection(db, "privateNotes"),
        where("class", "==", classVal),
        orderBy("timestamp", "desc")
      );
    } else {
      q = query(
        collection(db, "privateNotes"),
        orderBy("timestamp", "desc")
      );
    }
  } else if (auth.currentUser) {
    if (lastName && classVal) {
      q = query(
        collection(db, "privateNotes"),
        where("teacherEmail", "==", auth.currentUser.email),
        where("lastName", "==", lastName),
        where("class", "==", classVal),
        orderBy("timestamp", "desc")
      );
    } else if (lastName) {
      q = query(
        collection(db, "privateNotes"),
        where("teacherEmail", "==", auth.currentUser.email),
        where("lastName", "==", lastName),
        orderBy("timestamp", "desc")
      );
    } else if (classVal) {
      q = query(
        collection(db, "privateNotes"),
        where("teacherEmail", "==", auth.currentUser.email),
        where("class", "==", classVal),
        orderBy("timestamp", "desc")
      );
    } else {
      q = query(
        collection(db, "privateNotes"),
        where("teacherEmail", "==", auth.currentUser.email),
        orderBy("timestamp", "desc")
      );
    }
  } else {
    privateNotesList.innerHTML = "<p>Απαιτείται σύνδεση για προβολή σημειώσεων</p>";
    return;
  }

  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      privateNotesList.innerHTML = "<p>Δεν βρέθηκαν σημειώσεις</p>";
      return;
    }

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.className = "lesson-card";
      div.innerHTML = `
        <p><strong>${data.lastName} (${data.class}):</strong> ${data.note}</p>
        <small>${new Date(data.timestamp).toLocaleString()}</small>
      `;

      if (auth.currentUser && (auth.currentUser.email === 'pa.domvros@gmail.com' || 
          auth.currentUser.email === data.teacherEmail)) {
        const delBtn = document.createElement("button");
        delBtn.textContent = "Διαγραφή";
        delBtn.className = "delete-btn";
        delBtn.onclick = async () => {
          if (confirm("Διαγραφή σημείωσης;")) {
            await deleteDoc(doc(db, "privateNotes", docSnap.id));
            loadPrivateNotes(lastName, classVal);
          }
        };
        div.appendChild(delBtn);
      }
      privateNotesList.appendChild(div);
    });
  } catch (error) {
    privateNotesList.innerHTML = `<p class="error-message">Σφάλμα: ${error.message}</p>`;
    console.error("Load notes error:", error);
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