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
function getTeacherName(email) {
  const teachers = {
    'pa.domvros@gmail.com': 'Παναγιώτης Δόμβρος',
    'mariamalamidou@gmail.com': 'Μαρία Μαλαμίδου'
    'evakyriazo@gmail.com': 'Ευαγγελία Κυριαζοπούλου'
  };
  return teachers[email] || email.split('@')[0].split('.')[1]?.toUpperCase() || '';
}

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
    document.getElementById("adminMessage").textContent = "Η ύλη καταχωρίστηκε επιτυχώς!";
  } catch (error) {
    document.getElementById("adminMessage").textContent = "Σφάλμα καταχώρησης: " + error.message;
  }
}

async function viewLessons() {
  const querySnapshot = await getDocs(query(
    collection(db, "lessons"),
    where("school", "==", document.getElementById("schoolInputView").value),
    where("lesson", "==", document.getElementById("lessonFilter").value.trim().toUpperCase()),
    where("class", "==", document.getElementById("studentClass").value.trim().toUpperCase()),
    orderBy("timestamp", "desc")
  ));

  const container = document.getElementById("lessonsContainer");
  container.innerHTML = '';

  querySnapshot.forEach(doc => {
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
      deleteBtn.onclick = () => deleteDoc(doc.ref);
      card.appendChild(deleteBtn);
    }

    container.appendChild(card);
  });
}

// Αρχικοποίηση
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dateInput').valueAsDate = new Date();

  document.getElementById("loginBtn").addEventListener("click", async () => {
    try {
      await signInWithEmailAndPassword(
        auth,
        document.getElementById("email").value,
        document.getElementById("password").value
      );
    } catch (error) {
      document.getElementById("loginError").textContent = "Σφάλμα σύνδεσης: " + error.message;
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", () => signOut(auth));
  document.getElementById("submitLessonBtn").addEventListener("click", submitLesson);
  document.getElementById("viewLessonsBtn").addEventListener("click", viewLessons);

  onAuthStateChanged(auth, (user) => {
    document.getElementById("loginForm").style.display = user ? "none" : "block";
    document.getElementById("adminSection").style.display = user ? "block" : "none";
    document.getElementById("publicView").style.display = "block";
  });
});