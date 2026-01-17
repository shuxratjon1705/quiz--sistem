import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth"; // 1. Auth-ni import qilish

const firebaseConfig = {
  apiKey: "AIzaSyAhsOBu9LcrtsTRelq7hHnemWyZkdRtwZ4",
  authDomain: "quiz-sistem-shuxratjon.firebaseapp.com",
  projectId: "quiz-sistem-shuxratjon",
  storageBucket: "quiz-sistem-shuxratjon.firebasestorage.app",
  messagingSenderId: "138916347525",
  appId: "1:138916347525:web:1968dd660329004cd3b3ec",
  measurementId: "G-7XLXQLCTWE",
  databaseURL: "https://quiz-sistem-shuxratjon-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);

// 2. Eksport qilish
export const db = getDatabase(app);
export const auth = getAuth(app);