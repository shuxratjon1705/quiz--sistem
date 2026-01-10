import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAhsOBu9LcrtsTRelq7hHnemWyZkdRtwZ4",
  authDomain: "quiz-sistem-shuxratjon.firebaseapp.com",
  projectId: "quiz-sistem-shuxratjon",
  storageBucket: "quiz-sistem-shuxratjon.firebasestorage.app",
  messagingSenderId: "138916347525",
  appId: "1:138916347525:web:1968dd660329004cd3b3ec",
  measurementId: "G-7XLXQLCTWE",
  // Realtime Database uchun manzilni qo'shdik
  databaseURL: "https://quiz-sistem-shuxratjon-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);