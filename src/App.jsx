import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { db, auth } from './firebase';
import { ref, onValue, set, push, remove, update } from "firebase/database";
import { motion, AnimatePresence } from 'framer-motion';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

// ===== YANGI IMPORTLAR =====
import QuizModes from './components/QuizModes';
import PlayerStats from './components/PlayerStats';
import { calculateTimeBonus, formatTime } from './utils/TimerBonus';

// ===== YANGI IKONKALAR =====
import { 
  FiSun, FiMoon, FiLogOut, FiVolume2, FiVolumeX, 
  FiBell, FiBellOff, FiBarChart2, FiHome, FiUser,
  FiCheck, FiX, FiClock, FiAward, FiTrendingUp,
  FiChevronRight, FiChevronLeft, FiPlay, FiPause,
  FiFastForward, FiStar, FiUsers, FiTarget,
  FiSettings, FiGrid, FiRefreshCw, FiShuffle
} from 'react-icons/fi';
import { 
  GiTrophy, GiBrain, GiLightningHelix, GiRunningNinja,
  GiSurprisedSkull, GiTeacher, GiGraduateCap,
  GiHeartPlus, GiHeartMinus, GiPerspectiveDiceSixFacesRandom
} from 'react-icons/gi';

export default function App() {
  // ---- Kirish taymeri ---
  const [isLoading, setIsLoading] = useState(true);

  // --- AUTH STATES ---
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // --- APP STATES ---
  const [subjects, setSubjects] = useState([]);
  const [view, setView] = useState('auth');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeSubId, setActiveSubId] = useState(null);
  const [generatedPin, setGeneratedPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [players, setPlayers] = useState([]);
  const [score, setScore] = useState(0);
  const [liveScores, setLiveScores] = useState({});
  const [feedback, setFeedback] = useState(null); 

  // --- YANGI STATE: STREAK ---
  const [streak, setStreak] = useState(0);

  // ===== YANGI STATELAR =====
  const [quizMode, setQuizMode] = useState('normal');
  const [timeSettings, setTimeSettings] = useState({
    normal: 30,
    blitz: 10,
    survival: 15,
    marathon: 20
  });
  const [streakBonus, setStreakBonus] = useState(0);
  const [survivalLives, setSurvivalLives] = useState(3);
  const [marathonQuestions, setMarathonQuestions] = useState([]);
  const [questionCounter, setQuestionCounter] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [timeBonuses, setTimeBonuses] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState('👤');
  const [avatars] = useState(['👤', '🧑', '👩', '👨‍🎓', '👨‍💼', '👩‍🔬', '🦸', '🧙', '🤖', '👽']);
  const [gameHistory, setGameHistory] = useState([]);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [questionStatus, setQuestionStatus] = useState('waiting');
  const [answeredCount, setAnsweredCount] = useState(0);
  const [allStudentAnswers, setAllStudentAnswers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [themeColor, setThemeColor] = useState('#8C9460'); // Asosiy rang
  const [themeColors] = useState([
    '#8C9460', '#6C63FF', '#FF6584', '#36D1DC', '#FFB347', 
    '#9C27B0', '#4CAF50', '#FF5722', '#2196F3', '#FF9800',
    '#673AB7', '#00BCD4', '#E91E63', '#009688', '#FFC107',
    '#795548', '#CDDC39', '#FF9800', '#9E9E9E', '#3F51B5'
  ]);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [backgroundStyle, setBackgroundStyle] = useState('gradient');
  const [showBgModal, setShowBgModal] = useState(false);
  const [availableBackgrounds] = useState([
    { id: 'gradient', name: 'Gradient', value: `linear-gradient(135deg, ${themeColor} 0%, #000 100%)` },
    { id: 'pattern', name: 'Pattern', value: `repeating-linear-gradient(45deg, ${themeColor}20 0px, ${themeColor}20 10px, transparent 10px, transparent 20px)` },
    { id: 'stars', name: 'Stars', value: `radial-gradient(circle at 20% 50%, ${themeColor}40 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6C63FF40 0%, transparent 50%), #000` },
    { id: 'solid', name: 'Solid', value: themeColor },
    { id: 'light', name: 'Light', value: '#ffffff' },
    { id: 'dark', name: 'Dark', value: '#000000' }
  ]);

  const [newQ, setNewQ] = useState({
    text: '',
    options: ['', '', '', ''],
    correct: 0,
    time: 30,
    points: 100,
    difficulty: 'medium'
  });
  const [newSubName, setNewSubName] = useState('');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  
  // ===== TUZATILGAN STATELAR =====
  const [shuffledQuestions, setShuffledQuestions] = useState([]); // ⭐ YANGI: Aralashtirilgan savollar
  const [usedQuestionIds, setUsedQuestionIds] = useState(new Set()); // ⭐ YANGI: Ishlatilgan savollar
  const [allQuestionsAnswered, setAllQuestionsAnswered] = useState(false); // ⭐ YANGI: Barcha savol javoblanganmi
  const [currentShuffledIndex, setCurrentShuffledIndex] = useState(0); // ⭐ YANGI: Joriy aralashtirilgan indeks

  // ===== ASOSIY OZGARUVCHI - BU YERDA E'LON QILINDI =====
  const activeSub = subjects.find(s => s.id === activeSubId);

  // ===== YANGI FUNKSIYALAR =====

  // ⭐⭐ YANGI VA ASOSIY TUZATISH: Savol va uning variantlarini BIRGA aralashtirish ⭐⭐
  const shuffleQuestionWithOptions = (question) => {
    if (!question) return null;
    
    // 1. Variantlarni nusxa olish
    const originalOptions = [...question.options];
    const originalCorrect = question.correct;
    
    // 2. Variantlar va ularning indekslarini massivga olish
    const optionsWithIndex = originalOptions.map((option, index) => ({ option, index }));
    
    // 3. Variantlarni aralashtirish
    for (let i = optionsWithIndex.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]];
    }
    
    // 4. Yangi variantlar massivi va to'g'ri javob indeksini topish
    const newOptions = optionsWithIndex.map(item => item.option);
    const newCorrectIndex = optionsWithIndex.findIndex(item => item.index === originalCorrect);
    
    // 5. Yangi savol obyektini yaratish
    return {
      ...question,
      id: question.id || Date.now(), // Har bir savolga unique ID
      options: newOptions,
      correct: newCorrectIndex,
      originalCorrect: originalCorrect,
      originalOptions: originalOptions, // Asl variantlarni saqlash
      isShuffled: true
    };
  };

  // Savollarni aralashtirish funksiyasi (YANGILANDI)
  const shuffleQuestions = (questions) => {
    if (!questions || questions.length === 0) return [];
    
    // 1. Savollarga ID berish
    const questionsWithIds = questions.map((q, index) => ({
      ...q,
      id: q.id || `q_${Date.now()}_${index}`, // Unique ID
      originalIndex: index // Asl indeksni saqlash
    }));
    
    // 2. Savollarni aralashtirish
    const shuffled = [...questionsWithIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // 3. Har bir savolning variantlarini alohida aralashtirish
    const fullyShuffled = shuffled.map(q => shuffleQuestionWithOptions(q));
    
    console.log("✅ Savollar to'liq aralashtirildi:", fullyShuffled.map(q => ({ 
      text: q.text.substring(0, 50), 
      correct: q.correct,
      optionsCount: q.options.length 
    })));
    
    return fullyShuffled;
  };

  // Rejimlarga mos vaqtni olish
  const getModeTime = (mode) => {
    return timeSettings[mode] || 30;
  };

  // Blitz rejimi uchun tezkorlik bonusini hisoblash
  const calculateBlitzBonus = (timeSpent, basePoints) => {
    if (quizMode !== 'blitz') return { multiplier: 1, bonus: 0, message: '' };
    
    const totalTime = getModeTime('blitz');
    const timeRatio = timeSpent / totalTime;
    
    let multiplier = 1;
    let bonusType = '';
    
    if (timeRatio < 0.3) {
      multiplier = 1.5;
      bonusType = 'super tezkor';
    } else if (timeRatio < 0.6) {
      multiplier = 1.3;
      bonusType = 'tezkor';
    } else if (timeRatio < 0.8) {
      multiplier = 1.1;
      bonusType = 'yaxshi';
    }
    
    const bonusPoints = Math.round(basePoints * multiplier);
    return {
      multiplier,
      bonus: bonusPoints - basePoints,
      message: `⚡ ${bonusType} javob! +${bonusPoints - basePoints} ball`,
      bonusType: 'blitz'
    };
  };

  // Marathon rejimi uchun ketma-ketlik bonusini hisoblash
  const calculateMarathonBonus = (consecutiveCorrect) => {
    if (quizMode !== 'marathon') return { multiplier: 1, bonus: 0, message: '' };
    
    let multiplier = 1;
    let bonusType = '';
    
    if (consecutiveCorrect >= 10) {
      multiplier = 2.0;
      bonusType = '10+ ketma-ket';
    } else if (consecutiveCorrect >= 7) {
      multiplier = 1.7;
      bonusType = '7+ ketma-ket';
    } else if (consecutiveCorrect >= 5) {
      multiplier = 1.5;
      bonusType = '5+ ketma-ket';
    } else if (consecutiveCorrect >= 3) {
      multiplier = 1.2;
      bonusType = '3+ ketma-ket';
    }
    
    return {
      multiplier,
      bonus: multiplier - 1,
      message: `🏃 ${bonusType}! ×${multiplier}`,
      bonusType: 'marathon'
    };
  };

  // Survival rejimi uchun jonlarni tekshirish
  const checkSurvival = (isCorrect) => {
    if (quizMode === 'survival' && !isCorrect) {
      const newLives = survivalLives - 1;
      setSurvivalLives(newLives);
      
      if (newLives <= 0) {
        // O'yin tugadi
        setTimeout(() => {
          saveGameHistory();
          setView('results');
        }, 1500);
        return false;
      }
      return true;
    }
    return true;
  };

  // Marathon rejimi uchun yangi savollar generatsiya qilish
  const generateMarathonQuestion = () => {
    if (quizMode !== 'marathon' || !activeSub) return null;
    
    const baseQuestions = activeSub.questions || [];
    if (baseQuestions.length === 0) return null;
    
    // Random savol tanlash
    const randomIndex = Math.floor(Math.random() * baseQuestions.length);
    const baseQuestion = {...baseQuestions[randomIndex]};
    
    // Savolni to'liq aralashtirish
    const shuffledQuestion = shuffleQuestionWithOptions({
      ...baseQuestion,
      id: `marathon_${Date.now()}_${questionCounter}`,
      originalIndex: randomIndex
    });
    
    if (!shuffledQuestion) return null;
    
    const newQuestion = {
      ...shuffledQuestion,
      marathonId: questionCounter,
      marathonNumber: questionCounter + 1
    };
    
    setMarathonQuestions(prev => [...prev, newQuestion]);
    setQuestionCounter(prev => prev + 1);
    
    return newQuestion;
  };

  // Rejimni o'zgartirganda qayta sozlash
  const handleModeChange = (newMode) => {
    setQuizMode(newMode);
    setStreakBonus(0);
    setSurvivalLives(3);
    setMarathonQuestions([]);
    setQuestionCounter(0);
    setShuffledQuestions([]);
    setUsedQuestionIds(new Set());
    setAllQuestionsAnswered(false);
    setCurrentShuffledIndex(0);
    
    // Taymerni yangilash
    if (activeSub && view === 'quiz_mode') {
      const currentTime = getModeTime(newMode);
      setTimer(currentTime);
    }
  };

  const notifyGameStart = () => {
    if (!("Notification" in window)) return;
    
    if (notificationsEnabled && Notification.permission === "granted") {
      new Notification("🎮 Quiz Boshlandi!", {
        body: `Fan: ${activeSub?.name}, Rejim: ${quizMode}`,
        icon: "/logo.png"
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          setNotificationsEnabled(true);
        }
      });
    }
  };

  const saveGameHistory = () => {
    const history = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      subject: activeSub?.name,
      mode: quizMode,
      score: score,
      totalQuestions: activeSub?.questions?.length || 0,
      correctAnswers: correctAnswers.length,
      streak: streak,
      players: players.length,
      survivalLives: quizMode === 'survival' ? survivalLives : null,
      marathonQuestions: quizMode === 'marathon' ? questionCounter : null
    };

    setGameHistory(prev => [history, ...prev.slice(0, 9)]);
    
    if (user) {
      const historyRef = push(ref(db, `history/${user.uid}`));
      set(historyRef, history);
    }
  };

  const checkAchievements = () => {
    const newAchievements = [];
    
    if (streak >= 5) {
      newAchievements.push({
        id: 'streak5',
        name: '🔥 Streak Master',
        desc: '5 ta ketma-ket to\'g\'ri javob',
        icon: '🔥',
        color: '#FF9800'
      });
    }
    
    if (streak >= 10) {
      newAchievements.push({
        id: 'streak10',
        name: '⚡ Lightning Fast',
        desc: '10 ta ketma-ket to\'g\'ri javob',
        icon: '⚡',
        color: '#FFEB3B'
      });
    }
    
    if (score >= 500) {
      newAchievements.push({
        id: 'score500',
        name: '🏆 Score Champion',
        desc: '500 ball yig\'ish',
        icon: '🏆',
        color: '#FFD700'
      });
    }
    
    if (correctAnswers.length >= (activeSub?.questions?.length || 1)) {
      newAchievements.push({
        id: 'perfect',
        name: '💯 Perfect Score',
        desc: 'Barcha savollarga to\'g\'ri javob',
        icon: '💯',
        color: '#4CAF50'
      });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    // Survival rejimi achievements
    if (quizMode === 'survival' && survivalLives === 3) {
      newAchievements.push({
        id: 'survivalPerfect',
        name: '🛡️ Perfect Survival',
        desc: '3 jon bilan survival tugatish',
        icon: '🛡️',
        color: '#dc3545'
      });
    }

    // Marathon rejimi achievements
    if (quizMode === 'marathon' && questionCounter >= 20) {
      newAchievements.push({
        id: 'marathon20',
        name: '🏃 Marathon Runner',
        desc: '20+ savolga javob berish',
        icon: '🏃',
        color: '#198754'
      });
    }

    // Blitz rejimi achievements
    if (quizMode === 'blitz' && streak >= 7) {
      newAchievements.push({
        id: 'blitzStreak',
        name: '⚡ Blitz Master',
        desc: 'Blitz rejimida 7+ streak',
        icon: '⚡',
        color: '#ffc107'
      });
    }
    
    setAchievements(prev => {
      const existingIds = prev.map(a => a.id);
      const uniqueNew = newAchievements.filter(a => !existingIds.includes(a.id));
      return [...prev, ...uniqueNew];
    });
  };

  // --- Kirish taymeri ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3200); 
    return () => clearTimeout(timer);
  }, []);

  // --- OVOZ FUNKSIYASI ---
  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio(type === 'correct' ? '/correct.mp3' : '/wrong.mp3');
      audio.play();
    } catch (e) {
      console.log("Audio xatolik:", e);
    }
  };

  // --- ACHIEVEMENTS EFFECT ---
  useEffect(() => {
    if (view === 'quiz_mode' || view === 'results') {
      checkAchievements();
    }
  }, [streak, score, correctAnswers.length, survivalLives, questionCounter, quizMode, activeSub]);

  // --- PULSE ANIMATION ---
  useEffect(() => {
    if (timer < 10 && timer > 0) {
      setPulseAnimation(true);
    } else {
      setPulseAnimation(false);
    }
  }, [timer]);

  // --- Savollarni aralashtirish efekti (YANGILANDI) ---
  useEffect(() => {
    if (activeSub && activeSub.questions && view === 'quiz_mode' && !playerName) {
      // Faqat o'qituvchi rejimida yoki o'yin boshida
      if (shuffledQuestions.length === 0) {
        console.log("🔄 Savollarni aralashtirish boshlandi...");
        const shuffled = shuffleQuestions(activeSub.questions);
        setShuffledQuestions(shuffled);
        setCurrentShuffledIndex(0);
        console.log(`✅ ${shuffled.length} ta savol aralashtirildi`);
      }
    }
  }, [activeSub, view, playerName]);

  // --- AUTH OBSERVER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (view === 'auth') setView('teacher');
      } else {
        const studentViews = ['student_name', 'lobby', 'quiz_mode', 'results'];
        if (!studentViews.includes(view)) {
          setView('auth');
        }
      }
    });
    return () => unsubscribe();
  }, [view]);

  // --- DATABASE DATA ---
  useEffect(() => {
    const subjectsRef = ref(db, 'subjects');
    onValue(subjectsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
          questions: data[key].questions ? Object.values(data[key].questions) : []
        }));

        if (user) {
          setSubjects(list.filter(s => s.ownerId === user.uid));
        } else {
          setSubjects(list);
        }
      }
    });

    if (generatedPin) {
      const gameRef = ref(db, `games/${generatedPin}`);
      onValue(gameRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          if (data.players) {
            const playersList = Object.values(data.players);
            setPlayers(playersList);
          }
          if (data.scores) setLiveScores(data.scores);
          
          if (data.answers) {
            const answers = Object.values(data.answers);
            setAllStudentAnswers(answers);
            
            const answeredByQuestion = {};
            answers.forEach(answer => {
              if (!answeredByQuestion[answer.questionIndex]) {
                answeredByQuestion[answer.questionIndex] = 0;
              }
              answeredByQuestion[answer.questionIndex]++;
            });
            setStudentAnswers(answeredByQuestion);
          }

          if (data.status === 'started' && view === 'lobby' && playerName) {
            const currentSub = subjects.find(s => s.id === data.subjectId);
            if (currentSub && currentSub.questions.length > 0) {
              setActiveSubId(data.subjectId);
              setCurrentQIndex(0);
              setTimer(getModeTime(data.mode || 'normal'));
              setView('quiz_mode');
              setQuestionStatus('active');
              notifyGameStart();
              
              // O'quvchi uchun ham savollarni aralashtirish
              const shuffled = shuffleQuestions(currentSub.questions);
              setShuffledQuestions(shuffled);
              setCurrentShuffledIndex(0);
            }
          }
        }
      });
    }

    if (user) {
      const historyRef = ref(db, `history/${user.uid}`);
      onValue(historyRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const historyList = Object.values(data);
          setGameHistory(historyList.slice(-10).reverse());
        }
      });
    }
  }, [generatedPin, view, user, subjects, playerName]);

  // --- LOGIN / REGISTER LOGIC ---
  const handleAuth = async () => {
    if (!username || !password) {
      alert("Iltimos, username va parolni to'liq yozing!");
      return;
    }
    const cleanUsername = username.trim().toLowerCase();
    const virtualEmail = `${cleanUsername}@quiz.com`;

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, virtualEmail, password);
        alert("✅ Tabriklaymiz! Akkaunt ochildi.");
      } else {
        await signInWithEmailAndPassword(auth, virtualEmail, password);
      }
    } catch (err) {
      alert("❌ Xatolik! Username band yoki parol xato.");
    }
  };

  // --- LOGOUT ---
  const handleLogout = () => {
    signOut(auth).then(() => {
      setView('auth');
      setUsername('');
      setPassword('');
      setQuizMode('normal');
      setCorrectAnswers([]);
      setTimeBonuses([]);
      setStudentAnswers({});
      setAllStudentAnswers([]);
      setSurvivalLives(3);
      setMarathonQuestions([]);
      setQuestionCounter(0);
      setShuffledQuestions([]);
      setUsedQuestionIds(new Set());
      setAllQuestionsAnswered(false);
      setCurrentShuffledIndex(0);
    });
  };

  const goBackHome = () => {
    setScore(0);
    setStreak(0);
    setGeneratedPin('');
    setPlayerName('');
    setInputPin('');
    setLiveScores({});
    setFeedback(null);
    setCorrectAnswers([]);
    setTimeBonuses([]);
    setQuizMode('normal');
    setStudentAnswers({});
    setAllStudentAnswers([]);
    setAnsweredCount(0);
    setQuestionStatus('waiting');
    setAchievements([]);
    setSurvivalLives(3);
    setMarathonQuestions([]);
    setQuestionCounter(0);
    setShuffledQuestions([]);
    setUsedQuestionIds(new Set());
    setAllQuestionsAnswered(false);
    setCurrentShuffledIndex(0);
    setCurrentQIndex(0);
    
    if (user) setView('teacher');
    else setView('auth');
  };

  // --- SUBJECTS LOGIC ---
  const addSubject = () => {
    if (newSubName.trim() && user) {
      const subjectsRef = ref(db, 'subjects');
      push(subjectsRef, {
        name: newSubName,
        questions: [],
        ownerId: user.uid,
        color: themeColor,
        createdAt: new Date().toISOString()
      });
      setNewSubName('');
    }
  };

  const handleAddQuestion = () => {
    const activeSub = subjects.find(s => s.id === activeSubId);
    if (newQ.text && newQ.options.every(opt => opt !== '')) {
      const questionData = {
        text: newQ.text,
        options: newQ.options,
        correct: newQ.correct,
        time: parseInt(newQ.time) || 30,
        points: parseInt(newQ.points) || 100,
        difficulty: newQ.difficulty,
        createdAt: new Date().toISOString()
      };

      const updatedQuestions = [...(activeSub.questions || []), questionData];
      set(ref(db, `subjects/${activeSubId}/questions`), updatedQuestions);

      setNewQ({ 
        text: '', 
        options: ['', '', '', ''], 
        correct: 0, 
        time: 30, 
        points: 100,
        difficulty: 'medium'
      });
      
      // Success animation
      setPulseAnimation(true);
      setTimeout(() => setPulseAnimation(false), 1000);
    } else {
      alert("⚠️ Iltimos, hamma maydonlarni to'ldiring!");
    }
  };

  // --- SAVOLNI O'CHIRISH ---
  const deleteQuestion = (index) => {
    if (window.confirm("Haqiqatan ham bu savolni o'chirmoqchimisiz?")) {
      const activeSub = subjects.find(s => s.id === activeSubId);
      const updatedQuestions = activeSub.questions.filter((_, i) => i !== index);
      set(ref(db, `subjects/${activeSubId}/questions`), updatedQuestions);
    }
  };

  // --- GAME LOGIC ---
  const startLobby = (subId) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedPin(pin);
    setActiveSubId(subId);
    set(ref(db, `games/${pin}`), { 
      subjectId: subId, 
      status: 'waiting', 
      players: {}, 
      scores: {},
      mode: quizMode,
      timePerQuestion: getModeTime(quizMode),
      survivalLives: quizMode === 'survival' ? 3 : null,
      startedAt: new Date().toISOString()
    });
    setView('lobby');
  };

  const joinGame = () => {
    if (!playerName.trim()) {
      alert("⚠️ Iltimos, ismingizni kiriting!");
      return;
    }
    
    if (inputPin.length !== 6) {
      alert("⚠️ PIN 6 xonali bo'lishi kerak!");
      return;
    }

    const gameRef = ref(db, `games/${inputPin}`);
    onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const newPlayerRef = push(ref(db, `games/${inputPin}/players`));
        set(newPlayerRef, {
          name: playerName,
          avatar: selectedAvatar,
          joinedAt: new Date().toISOString()
        });
        set(ref(db, `games/${inputPin}/scores/${playerName}`), 0);
        setGeneratedPin(inputPin);
        setActiveSubId(data.subjectId);
        setQuizMode(data.mode || 'normal');
        setView('lobby');
      } else {
        alert("❌ PIN xato yoki o'yin mavjud emas!");
      }
    }, { onlyOnce: true });
  };

  const startActualGame = () => {
    const sub = subjects.find(s => s.id === activeSubId);
    if (!sub || sub.questions.length === 0) {
      alert("⚠️ Savollar mavjud emas!");
      return;
    }
    
    // Savollarni aralashtirish (YANGI LOGIKA)
    console.log("🎮 O'yin boshlanmoqda...");
    const shuffled = shuffleQuestions(sub.questions);
    setShuffledQuestions(shuffled);
    setCurrentShuffledIndex(0);
    setUsedQuestionIds(new Set());
    setAllQuestionsAnswered(false);
    
    console.log(`✅ ${shuffled.length} ta savol aralashtirildi`);
    
    update(ref(db, `games/${generatedPin}`), { 
      status: 'started',
      mode: quizMode,
      timePerQuestion: getModeTime(quizMode),
      startedAt: new Date().toISOString(),
      currentQuestion: 0
    });
    
    setCurrentQIndex(0);
    setTimer(getModeTime(quizMode));
    setQuestionStatus('active');
    setAnsweredCount(0);
    
    // Marathon rejimi uchun birinchi savolni generatsiya qilish
    if (quizMode === 'marathon') {
      generateMarathonQuestion();
    }
    
    setView('quiz_mode');
    notifyGameStart();
  };

  // --- YANGI KEYINGI SAVOL FUNKSIYASI (TUZATILGAN) ---
  const getNextQuestion = () => {
    if (!activeSub || shuffledQuestions.length === 0) {
      console.log("❌ Savollar mavjud emas");
      return null;
    }
    
    // Normal, Blitz, Survival rejimlari uchun
    if (quizMode !== 'marathon') {
      // Agar hamma savollar ishlatilgan bo'lsa
      if (currentShuffledIndex >= shuffledQuestions.length) {
        console.log("✅ Barcha savollar ishlatildi");
        setAllQuestionsAnswered(true);
        return null;
      }
      
      // Keyingi aralashtirilgan savolni olish
      const nextQuestion = shuffledQuestions[currentShuffledIndex];
      console.log(`📝 Savol ${currentShuffledIndex + 1}/${shuffledQuestions.length}:`, 
        nextQuestion.text.substring(0, 50) + "...");
      
      // Indeksni yangilash
      setCurrentShuffledIndex(prev => prev + 1);
      
      return nextQuestion;
    }
    
    // Marathon rejimi uchun yangi savol generatsiya qilish
    if (quizMode === 'marathon') {
      return generateMarathonQuestion();
    }
    
    return null;
  };

  // --- JAVOB BERISH LOGIKASI (YANGILANDI VA TUZATILGAN) ---
  const handleAnswer = (isCorrect) => {
    if (feedback || allQuestionsAnswered) return;

    // ⭐⭐ MUHIM: Joriy savolni to'g'ri olish ⭐⭐
    let currentQuestion;
    if (quizMode === 'marathon') {
      currentQuestion = marathonQuestions[questionCounter];
    } else {
      // Aralashtirilgan savollar ro'yxatidan joriy indeksdagi savol
      const currentIndex = currentShuffledIndex - 1; // Chunki indeks allaqachon oshirilgan
      if (currentIndex >= 0 && currentIndex < shuffledQuestions.length) {
        currentQuestion = shuffledQuestions[currentIndex];
      } else if (shuffledQuestions.length > 0) {
        currentQuestion = shuffledQuestions[0];
      }
    }

    if (!currentQuestion) {
      console.error("❌ Joriy savol topilmadi!");
      return;
    }

    console.log(`🤔 Javob tekshirilmoqda: ${isCorrect ? "To'g'ri" : "Noto'g'ri"}`);
    console.log(`📊 Savol: ${currentQuestion.text.substring(0, 50)}...`);
    console.log(`✅ To'g'ri javob indeksi: ${currentQuestion.correct}`);

    let newTotalScore = score;

    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (soundEnabled) playSound(isCorrect ? 'correct' : 'wrong');

    // Survival rejimi uchun tekshirish
    if (quizMode === 'survival' && !isCorrect) {
      const newLives = survivalLives - 1;
      setSurvivalLives(newLives);
      
      if (newLives <= 0) {
        // O'yin tugadi
        setTimeout(() => {
          saveGameHistory();
          setView('results');
        }, 1500);
        return;
      }
    }

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);

      let currentPoints = currentQuestion.points || 100;
      let bonusInfo = {};
      
      // Rejimlarga mos bonuslarni hisoblash
      if (quizMode === 'normal') {
        const totalTime = getModeTime('normal');
        const timeBonus = calculateTimeBonus(timer, totalTime, currentPoints);
        currentPoints = timeBonus.finalPoints;
        bonusInfo = timeBonus;
      }
      else if (quizMode === 'blitz') {
        const timeSpent = getModeTime('blitz') - timer;
        const blitzBonus = calculateBlitzBonus(timeSpent, currentPoints);
        currentPoints = Math.round(currentPoints * blitzBonus.multiplier);
        bonusInfo = blitzBonus;
      }
      else if (quizMode === 'marathon') {
        const marathonBonus = calculateMarathonBonus(newStreak);
        currentPoints = Math.round(currentPoints * marathonBonus.multiplier);
        bonusInfo = marathonBonus;
      }
      else if (quizMode === 'survival') {
        // Survival rejimi uchun qo'shimcha bonus
        const survivalMultiplier = 1 + (3 - survivalLives) * 0.2;
        currentPoints = Math.round(currentPoints * survivalMultiplier);
        bonusInfo = {
          message: `🔥 ${survivalLives} jon qoldi! ×${survivalMultiplier.toFixed(1)}`,
          bonusType: 'survival'
        };
      }

      // Streak bonus (marathon rejimida alohida hisoblanadi)
      if (newStreak >= 5 && quizMode !== 'marathon') {
        currentPoints = Math.round(currentPoints * 1.3);
        setStreakBonus(prev => prev + 1);
        bonusInfo.message += ` | 🔥 Streak ×1.3`;
      }

      setTimeBonuses(prev => [...prev, {
        question: (quizMode === 'marathon' ? questionCounter : currentShuffledIndex),
        bonus: currentPoints - (currentQuestion.points || 100),
        message: bonusInfo.message || 'Bonus',
        type: quizMode
      }]);

      setCorrectAnswers(prev => [...prev, {
        question: currentQuestion.text,
        points: currentPoints,
        time: new Date().toLocaleTimeString(),
        difficulty: currentQuestion.difficulty || 'medium',
        questionNumber: (quizMode === 'marathon' ? questionCounter + 1 : currentShuffledIndex),
        mode: quizMode
      }]);

      newTotalScore = score + currentPoints;
      setScore(newTotalScore);

      if (playerName && generatedPin) {
        update(ref(db, `games/${generatedPin}/scores`), {
          [playerName]: newTotalScore
        });
        
        const answerData = {
          playerName: playerName,
          questionIndex: quizMode === 'marathon' ? questionCounter : currentShuffledIndex - 1,
          isCorrect: true,
          timeSpent: currentQuestion.time - timer,
          points: currentPoints,
          answeredAt: new Date().toISOString(),
          mode: quizMode
        };
        
        const answerRef = push(ref(db, `games/${generatedPin}/answers`));
        set(answerRef, answerData);
      }
    } else {
      setStreak(0);
      
      if (playerName && generatedPin) {
        const answerData = {
          playerName: playerName,
          questionIndex: quizMode === 'marathon' ? questionCounter : currentShuffledIndex - 1,
          isCorrect: false,
          timeSpent: currentQuestion.time - timer,
          points: 0,
          answeredAt: new Date().toISOString(),
          mode: quizMode
        };
        
        const answerRef = push(ref(db, `games/${generatedPin}/answers`));
        set(answerRef, answerData);
      }
    }

    setTimeout(() => {
      setFeedback(null);
      
      // Keyingi savolga o'tish
      if (quizMode === 'marathon') {
        // Marathon rejimida cheksiz davom etadi
        const nextQuestion = generateMarathonQuestion();
        if (nextQuestion) {
          setTimer(getModeTime('marathon'));
        }
      } else {
        // Boshqa rejimlar uchun
        const nextQuestion = getNextQuestion();
        if (nextQuestion) {
          setTimer(getModeTime(quizMode));
        } else {
          // Barcha savollar tugadi
          console.log("🎯 Barcha savollar tugadi, natijalar sahifasiga o'tilmoqda...");
          setTimeout(() => {
            saveGameHistory();
            setView('results');
          }, 1000);
        }
      }
    }, 1500);
  };

  // --- O'QITUVCHI KEYINGI SAVOLGA O'TISH (YANGILANDI) ---
  const goToNextQuestion = () => {
    // Agar barcha savollar tugagan bo'lsa
    if (allQuestionsAnswered && quizMode !== 'marathon') {
      console.log("🎯 Barcha savollar tugadi");
      saveGameHistory();
      setView('results');
      return;
    }
    
    if (quizMode === 'marathon') {
      // Marathon rejimi - cheksiz davom etadi
      const nextQuestion = generateMarathonQuestion();
      if (nextQuestion) {
        setTimer(getModeTime('marathon'));
        setQuestionStatus('active');
        setAnsweredCount(0);
      }
      return;
    }
    
    // Normal, Blitz, Survival rejimlari uchun
    const nextQuestion = getNextQuestion();
    if (nextQuestion) {
      setTimer(getModeTime(quizMode));
      setQuestionStatus('active');
      setAnsweredCount(0);
      
      if (generatedPin) {
        update(ref(db, `games/${generatedPin}`), {
          currentQuestion: currentShuffledIndex
        });
      }
    } else {
      // Barcha savollar tugadi
      console.log("🏁 O'yin tugadi");
      setView('results');
    }
  };

  // --- TIMER EFFECT (YANGILANDI) ---
  useEffect(() => {
    let interval;
    if (view === 'quiz_mode' && timer > 0 && questionStatus === 'active') {
      interval = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            // Vaqt tugaganda
            if (quizMode === 'survival' && playerName) {
              // Survival rejimida vaqt tugasa xato hisoblanadi
              handleAnswer(false);
            } else if (quizMode === 'blitz') {
              // Blitz rejimida tez javob berishni rag'batlantirish
              if (!playerName) {
                goToNextQuestion();
              }
            } else if (!playerName) {
              // O'qituvchi rejimida avtomatik o'tish
              setTimeout(() => {
                goToNextQuestion();
              }, 1000);
            }
            return 0;
          }
          
          // O'qituvchi uchun auto-skip
          if (!playerName && view === 'quiz_mode') {
            const answeredCount = studentAnswers[currentShuffledIndex - 1] || 0;
            const totalPlayers = players.length;
            
            if (totalPlayers > 0) {
              const answeredPercent = (answeredCount / totalPlayers) * 100;
              
              if (answeredPercent >= 100 && t > 3) {
                return 3; // Darhol 3 soniyaga tushir
              }
              else if (answeredPercent >= 90 && t > 5) {
                return 5; // 5 soniyaga tushir
              }
              else if (answeredPercent >= 80 && t < (timeSettings[quizMode] - 10)) {
                return Math.max(5, t - 2);
              }
              else if (answeredPercent >= 70 && t < (timeSettings[quizMode] - 15)) {
                return Math.max(7, t - 1.5);
              }
            }
          }
          
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, view, questionStatus, playerName, quizMode, studentAnswers, currentShuffledIndex, players.length, timeSettings]);

  // ===== TUZATILGAN 390-QATOR ATROFIDAGI KOD =====
  const subStatus = activeSub ? 'Faol' : 'Faol emas';
  const subName = activeSub?.name || 'Obuna tanlanmagan';

  const lightPrimary = themeColor;

  // Podium uchun g'oliblarni hisoblash
  const sortedForPodium = Object.entries(liveScores).sort(([, a], [, b]) => b - a).slice(0, 3);

  // ===== YANGI FUNKSIYA: Savollarni qayta aralashtirish =====
  const reshuffleQuestions = () => {
    if (!activeSub || !activeSub.questions) return;
    
    console.log("🔄 Savollarni qayta aralashtirish...");
    const shuffled = shuffleQuestions(activeSub.questions);
    setShuffledQuestions(shuffled);
    setCurrentShuffledIndex(0);
    setUsedQuestionIds(new Set());
    setAllQuestionsAnswered(false);
    setTimer(getModeTime(quizMode));
    
    console.log(`✅ ${shuffled.length} ta savol qayta aralashtirildi`);
    
    // Ogohlantirish
    alert(`✅ ${shuffled.length} ta savol qayta aralashtirildi!\nEndi har bir savol o'z variantlari bilan birga ko'rsatiladi.`);
  };

  // ===== JORIY SAVOLNI OLISH FUNKSIYASI (MUHIM!) =====
  const getCurrentQuestion = () => {
    if (quizMode === 'marathon') {
      return marathonQuestions[questionCounter];
    } else {
      // ⭐⭐ MUHIM: Joriy indeksdan 1 ni ayirish kerak, chunki indeks allaqachon oshirilgan ⭐⭐
      const currentIndex = Math.max(0, currentShuffledIndex - 1);
      if (currentIndex < shuffledQuestions.length) {
        return shuffledQuestions[currentIndex];
      } else if (shuffledQuestions.length > 0) {
        return shuffledQuestions[0];
      }
    }
    return null;
  };

  // ===== JAVOB BERISH TUGMALARI UCHUN TO'G'RI JAVOBNI TEKSHIRISH =====
  const checkAnswer = (selectedIndex) => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return false;
    
    return selectedIndex === currentQuestion.correct;
  };

  return (
    <div 
      className="vh-100 d-flex flex-column" 
      data-bs-theme={isDarkMode ? 'dark' : 'light'} 
      style={{ 
        overflowX: 'hidden',
        background: backgroundStyle === 'gradient' 
          ? `linear-gradient(135deg, ${themeColor}20 0%, ${isDarkMode ? '#000' : '#fff'} 100%)`
          : backgroundStyle === 'pattern'
          ? `repeating-linear-gradient(45deg, ${themeColor}10 0px, ${themeColor}10 10px, transparent 10px, transparent 20px), ${isDarkMode ? '#000' : '#fff'}`
          : backgroundStyle === 'stars'
          ? `radial-gradient(circle at 20% 50%, ${themeColor}20 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6C63FF20 0%, transparent 50%), ${isDarkMode ? '#000' : '#fff'}`
          : backgroundStyle === 'solid'
          ? themeColor + '20'
          : backgroundStyle === 'light'
          ? '#ffffff'
          : backgroundStyle === 'dark'
          ? '#000000'
          : 'transparent'
      }}
    >

      {/* ===== CONFETTI ANIMATION ===== */}
      {showConfetti && (
        <div className="position-fixed top-0 start-0 w-100 h-100" style={{ zIndex: 9998, pointerEvents: 'none' }}>
          {[...Array(100)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -100, x: Math.random() * window.innerWidth }}
              animate={{ 
                y: window.innerHeight + 100,
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
              className="position-absolute"
              style={{
                fontSize: '20px',
                color: ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93'][Math.floor(Math.random() * 5)]
              }}
            >
              {['🎉', '🎊', '✨', '⭐', '🏆', '🔥', '💫'][Math.floor(Math.random() * 7)]}
            </motion.div>
          ))}
        </div>
      )}

      {/* ===== ORQA FON TANLASH MODALI ===== */}
      {showBgModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">🎨 Orqa fonni tanlang</h5>
                <button type="button" className="btn-close" onClick={() => setShowBgModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  {availableBackgrounds.map(bg => (
                    <div key={bg.id} className="col-6">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`card ${backgroundStyle === bg.id ? 'border-primary border-3' : 'border'}`}
                        style={{ 
                          height: '100px',
                          background: bg.value.replace('${themeColor}', themeColor),
                          cursor: 'pointer',
                          overflow: 'hidden'
                        }}
                        onClick={() => {
                          setBackgroundStyle(bg.id);
                          setShowBgModal(false);
                        }}
                      >
                        <div className="card-body d-flex align-items-center justify-content-center">
                          <span className={`fw-bold ${bg.id === 'dark' ? 'text-white' : bg.id === 'light' ? 'text-dark' : 'text-white'}`}>
                            {bg.name}
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SIDEBAR (YANGI) ===== */}
      <motion.div 
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        className="position-fixed start-0 top-0 h-100 shadow-lg"
        style={{ 
          width: '280px', 
          backgroundColor: isDarkMode ? '#1a1d20' : '#fff',
          zIndex: 9997,
          borderRight: `3px solid ${themeColor}`
        }}
      >
        <div className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="fw-bold">🚀 Tezkor O'tish</h5>
            <button className="btn-close" onClick={() => setSidebarOpen(false)}></button>
          </div>
          
          <div className="list-group list-group-flush">
            <button 
              className="list-group-item list-group-item-action border-0 py-3 d-flex align-items-center"
              onClick={() => { setView('teacher'); setSidebarOpen(false); }}
            >
              <FiHome className="me-3" size={20} />
              <span>Asosiy panel</span>
            </button>
            
            <button 
              className="list-group-item list-group-item-action border-0 py-3 d-flex align-items-center"
              onClick={() => { setShowStats(true); setSidebarOpen(false); }}
            >
              <FiBarChart2 className="me-3" size={20} />
              <span>Statistika</span>
            </button>
            
            <button 
              className="list-group-item list-group-item-action border-0 py-3 d-flex align-items-center"
              onClick={() => { setView('student_name'); setSidebarOpen(false); }}
            >
              <GiGraduateCap className="me-3" size={20} />
              <span>O'quvchi rejimi</span>
            </button>
            
            <button 
              className="list-group-item list-group-item-action border-0 py-3 d-flex align-items-center"
              onClick={() => { setShowBgModal(true); setSidebarOpen(false); }}
            >
              🎨 <span className="ms-3">Orqa fon</span>
            </button>
            
            {/* ⭐ YANGI: Savollarni aralashtirish tugmasi ⭐ */}
            {view === 'quiz_mode' && activeSub && (
              <button 
                className="list-group-item list-group-item-action border-0 py-3 d-flex align-items-center text-warning"
                onClick={() => { 
                  reshuffleQuestions(); 
                  setSidebarOpen(false); 
                }}
              >
                <FiShuffle className="me-3" size={20} />
                <span>Savollarni aralashtirish</span>
              </button>
            )}
            
            <div className="mt-4 pt-3 border-top">
              <h6 className="small text-uppercase text-muted mb-3">Ranglar ({themeColors.length} ta)</h6>
              <div className="d-flex flex-wrap gap-2">
                {themeColors.map((color, index) => (
                  <button
                    key={index}
                    className="btn btn-sm rounded-circle shadow-sm"
                    style={{ 
                      backgroundColor: color,
                      width: '30px',
                      height: '30px',
                      border: themeColor === color ? '3px solid white' : '1px solid rgba(0,0,0,0.1)',
                      boxShadow: themeColor === color ? `0 0 10px ${color}` : 'none'
                    }}
                    onClick={() => setThemeColor(color)}
                    title={`Rang #${index + 1}: ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-3 pt-3 border-top">
              <h6 className="small text-uppercase text-muted mb-3">Rejim vaqtlari</h6>
              {Object.entries(timeSettings).map(([mode, time]) => (
                <div key={mode} className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-capitalize">{mode}:</small>
                  <div className="d-flex align-items-center">
                    <button 
                      className="btn btn-sm btn-outline-secondary py-0 px-2"
                      onClick={() => setTimeSettings(prev => ({
                        ...prev,
                        [mode]: Math.max(5, prev[mode] - 5)
                      }))}
                    >
                      -
                    </button>
                    <span className="mx-2">{time}s</span>
                    <button 
                      className="btn btn-sm btn-outline-secondary py-0 px-2"
                      onClick={() => setTimeSettings(prev => ({
                        ...prev,
                        [mode]: Math.min(120, prev[mode] + 5)
                      }))}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* SPLASH SCREEN (YANGILANDI) */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
            style={{
              background: isDarkMode 
                ? `linear-gradient(135deg, #000 0%, ${themeColor} 100%)` 
                : `linear-gradient(135deg, #fff 0%, ${themeColor} 100%)`,
              zIndex: 9999,
              textAlign: 'center'
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, type: 'spring' }}
              className="display-1 mb-4"
              style={{ color: '#fff' }}
            >
              🧠
            </motion.div>
            
            <motion.h1
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="fw-bold text-white"
              style={{ 
                fontSize: '3.5rem',
                textShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}
            >
              QUIZ MASTER
            </motion.h1>
            
            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="fs-5 px-3 text-white opacity-75 mt-3"
            >
              Aqllarni sinab ko'ring
            </motion.p>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '200px' }}
              transition={{ delay: 1, duration: 1.5 }}
              className="mt-5"
            >
              <div className="progress" style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <div 
                  className="progress-bar" 
                  style={{ 
                    backgroundColor: '#fff',
                    width: '100%'
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoading && (
        <>
          {/* --- NAVBAR (YANGILANDI) --- */}
          <nav className="navbar px-3 px-md-4 flex-shrink-0 shadow" style={{ 
            minHeight: '70px', 
            background: isDarkMode 
              ? `linear-gradient(90deg, #000 0%, ${themeColor}40 100%)` 
              : `linear-gradient(90deg, ${themeColor} 0%, ${themeColor}80 100%)`,
            borderBottom: `3px solid ${themeColor}30`
          }}>
            <div className="d-flex align-items-center w-100">
              <button 
                className="btn btn-outline-light rounded-circle me-3"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ width: '40px', height: '40px' }}
              >
                ☰
              </button>
              
              <motion.span 
                className="navbar-brand fw-bold text-white fs-4" 
                onClick={goBackHome} 
                style={{ cursor: 'pointer' }}
                whileHover={{ scale: 1.05 }}
              >
                🧠 QUIZ MASTER
              </motion.span>
              
              <div className="ms-auto d-flex gap-2 align-items-center">
                {/* Rejim ko'rsatgichi */}
                <div className="me-2">
                  <span className={`badge ${quizMode === 'blitz' ? 'bg-warning' : quizMode === 'survival' ? 'bg-danger' : quizMode === 'marathon' ? 'bg-success' : 'bg-primary'}`}>
                    {quizMode === 'normal' && '📝 Normal'}
                    {quizMode === 'blitz' && '⚡ Blitz'}
                    {quizMode === 'survival' && '🔥 Survival'}
                    {quizMode === 'marathon' && '🏃 Marathon'}
                  </span>
                </div>
                
                {/* ⭐ YANGI: Random rejim ko'rsatgichi ⭐ */}
                {view === 'quiz_mode' && (
                  <div className="me-2">
                    <span className="badge bg-info">
                      <GiPerspectiveDiceSixFacesRandom className="me-1" />
                      Random
                    </span>
                  </div>
                )}
                
                {/* Survival jonlari ko'rsatgichi */}
                {quizMode === 'survival' && view === 'quiz_mode' && (
                  <div className="me-2 d-flex align-items-center">
                    {[...Array(3)].map((_, i) => (
                      <div 
                        key={i}
                        className={`heart ${i < survivalLives ? 'active' : 'inactive'} mx-1`}
                        style={{
                          width: '20px',
                          height: '20px',
                          background: i < survivalLives ? '#dc3545' : '#6c757d',
                          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                        }}
                      />
                    ))}
                  </div>
                )}
                
                {/* Achievements Indicator */}
                {achievements.length > 0 && (
                  <div className="position-relative me-2">
                    <button 
                      className="btn btn-warning btn-sm rounded-pill"
                      onClick={() => setShowStats(true)}
                    >
                      <FiAward className="me-1" />
                      {achievements.length}
                    </button>
                  </div>
                )}
                
                <button 
                  className="btn btn-sm btn-outline-light rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: '38px', height: '38px' }}
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? "Ovoz yoqilgan" : "Ovoz o'chirilgan"}
                >
                  {soundEnabled ? <FiVolume2 size={18} /> : <FiVolumeX size={18} />}
                </button>
                
                <button 
                  className="btn btn-sm btn-outline-light rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: '38px', height: '38px' }}
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  title={notificationsEnabled ? "Bildirishnomalar yoqilgan" : "Bildirishnomalar o'chirilgan"}
                >
                  {notificationsEnabled ? <FiBell size={18} /> : <FiBellOff size={18} />}
                </button>
                
                <button 
                  className="btn btn-sm btn-outline-light rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: '38px', height: '38px' }}
                  onClick={() => setShowBgModal(true)}
                  title="Orqa fonni o'zgartirish"
                >
                  🎨
                </button>
                
                {/* ⭐ YANGI: Savollarni aralashtirish tugmasi ⭐ */}
                {view === 'quiz_mode' && activeSub && (
                  <button 
                    className="btn btn-sm btn-outline-light rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: '38px', height: '38px' }}
                    onClick={reshuffleQuestions}
                    title="Savollarni qayta aralashtirish"
                  >
                    <FiShuffle size={18} />
                  </button>
                )}
                
                {user && view === 'teacher' && (
                  <button 
                    className="btn btn-sm btn-info d-flex align-items-center"
                    onClick={() => setShowStats(!showStats)}
                  >
                    <FiBarChart2 className="me-1" />
                    Statistika
                  </button>
                )}
                
                {user && (
                  <button 
                    className="btn btn-sm btn-danger d-flex align-items-center"
                    onClick={handleLogout}
                  >
                    <FiLogOut className="me-1" />
                    Chiqish
                  </button>
                )}
                
                <button 
                  className="btn btn-sm btn-outline-light rounded-pill px-3 d-flex align-items-center"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                >
                  {isDarkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
                  <span className="ms-1">{isDarkMode ? 'Kunduz' : 'Tun'}</span>
                </button>
              </div>
            </div>
          </nav>

          <div className="flex-grow-1 overflow-auto d-flex flex-column position-relative">
            {/* ===== ACHIEVEMENTS TOAST ===== */}
            <AnimatePresence>
              {achievements.slice(-2).map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 300, opacity: 0 }}
                  transition={{ delay: index * 0.2 }}
                  className="position-fixed end-3 top-3"
                  style={{ zIndex: 9999 }}
                >
                  <div 
                    className="toast show shadow-lg border-0"
                    style={{ 
                      backgroundColor: achievement.color,
                      borderLeft: `5px solid ${isDarkMode ? '#000' : '#fff'}`
                    }}
                  >
                    <div className="toast-body text-white d-flex align-items-center">
                      <span className="fs-4 me-3">{achievement.icon}</span>
                      <div>
                        <strong>{achievement.name}</strong>
                        <div className="small">{achievement.desc}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* ===== STATISTIKA MODALI (YANGILANDI) ===== */}
            {showStats && user && (
              <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.7)' }}>
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="card shadow-lg border-0 overflow-hidden"
                  style={{ width: '95%', maxWidth: '900px', maxHeight: '85vh', border: `3px solid ${themeColor}` }}
                >
                  <div className="card-header d-flex justify-content-between align-items-center" style={{ backgroundColor: themeColor }}>
                    <h5 className="mb-0 text-white d-flex align-items-center">
                      <FiBarChart2 className="me-2" />
                      O'yin statistikasi
                    </h5>
                    <button className="btn-close btn-close-white" onClick={() => setShowStats(false)}></button>
                  </div>
                  <div className="card-body overflow-auto">
                    <div className="row">
                      <div className="col-md-8">
                        {gameHistory.length > 0 ? (
                          <div className="table-responsive">
                            <table className="table table-hover">
                              <thead className="table-dark">
                                <tr>
                                  <th>Sana</th>
                                  <th>Fan</th>
                                  <th>Rejim</th>
                                  <th>Ball</th>
                                  <th>To'g'ri</th>
                                  <th>Streak</th>
                                  <th>Qo'shimcha</th>
                                </tr>
                              </thead>
                              <tbody>
                                {gameHistory.map((game, idx) => (
                                  <tr key={game.id || idx} className={idx % 2 === 0 ? 'table-light' : ''}>
                                    <td>{game.date}</td>
                                    <td><strong>{game.subject}</strong></td>
                                    <td>
                                      <span className={`badge ${game.mode === 'blitz' ? 'bg-warning' : game.mode === 'survival' ? 'bg-danger' : game.mode === 'marathon' ? 'bg-success' : 'bg-primary'}`}>
                                        {game.mode}
                                      </span>
                                    </td>
                                    <td><strong className="text-primary">{game.score}</strong></td>
                                    <td>
                                      <div className="progress" style={{ height: '8px' }}>
                                        <div 
                                          className="progress-bar bg-success" 
                                          style={{ 
                                            width: `${(game.correctAnswers / (game.totalQuestions || 1)) * 100}%` 
                                          }}
                                        />
                                      </div>
                                      <small>{game.correctAnswers}/{game.totalQuestions || 'N/A'}</small>
                                    </td>
                                    <td>
                                      <span className={`badge ${game.streak >= 5 ? 'bg-warning' : 'bg-secondary'}`}>
                                        {game.streak} 🔥
                                      </span>
                                    </td>
                                    <td>
                                      {game.mode === 'survival' && game.survivalLives && (
                                        <span className="badge bg-danger">
                                          {game.survivalLives} ❤️
                                        </span>
                                      )}
                                      {game.mode === 'marathon' && game.marathonQuestions && (
                                        <span className="badge bg-success">
                                          {game.marathonQuestions} ♾️
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-5">
                            <div className="display-4 text-muted mb-3">📊</div>
                            <p className="text-muted">Hali statistika mavjud emas</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="col-md-4">
                        <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: isDarkMode ? '#1a1d20' : '#f8f9fa' }}>
                          <div className="card-body">
                            <h6 className="fw-bold border-bottom pb-2">🏆 Achievements</h6>
                            <div className="mt-3">
                              {achievements.length > 0 ? (
                                achievements.map(ach => (
                                  <div key={ach.id} className="d-flex align-items-center mb-3 p-2 rounded" style={{ backgroundColor: `${ach.color}20` }}>
                                    <span className="fs-4 me-3">{ach.icon}</span>
                                    <div>
                                      <strong className="small">{ach.name}</strong>
                                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>{ach.desc}</div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-muted small text-center py-3">Hali achievement yo'q</p>
                              )}
                            </div>
                            
                            <h6 className="fw-bold border-bottom pb-2 mt-4">⏱️ Bonuslar</h6>
                            {timeBonuses.length > 0 ? (
                              <div className="mt-3">
                                {timeBonuses.slice(-5).map((bonus, idx) => (
                                  <div key={idx} className="small border-bottom py-2">
                                    <span className={`badge ${
                                      bonus.type === 'blitz' ? 'bg-warning' : 
                                      bonus.type === 'survival' ? 'bg-danger' : 
                                      bonus.type === 'marathon' ? 'bg-success' : 'bg-info'
                                    } me-2`}>
                                      {bonus.question}-savol
                                    </span>
                                    {bonus.message}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted small text-center py-3">Hali bonus yo'q</p>
                            )}

                            <h6 className="fw-bold border-bottom pb-2 mt-4">⚙️ Rejim vaqtlari</h6>
                            <div className="mt-3">
                              {Object.entries(timeSettings).map(([mode, time]) => (
                                <div key={mode} className="d-flex justify-content-between align-items-center mb-2">
                                  <small className="text-capitalize">
                                    {mode === 'normal' && '📝 Normal'}
                                    {mode === 'blitz' && '⚡ Blitz'}
                                    {mode === 'survival' && '🔥 Survival'}
                                    {mode === 'marathon' && '🏃 Marathon'}
                                  </small>
                                  <span className="badge bg-secondary">{time}s</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* --- AUTH VIEW (YANGILANDI) --- */}
            {(view === 'auth' || (!user && !['student_name', 'lobby', 'quiz_mode', 'results'].includes(view))) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="m-auto card p-4 p-md-5 shadow-lg border-0 mx-2 mx-md-auto"
                style={{ 
                  width: '95%', 
                  maxWidth: '420px', 
                  borderRadius: '20px',
                  border: `2px solid ${themeColor}`,
                  background: isDarkMode ? '#1a1d20' : '#fff'
                }}
              >
                <div className="text-center mb-4">
                  <div className="display-4 mb-3" style={{ color: themeColor }}>🧠</div>
                  <h2 className="fw-bold">{isSignUp ? "Ro'yxatdan o'tish" : "Kirish"}</h2>
                  <p className="text-muted">Quiz Master hisobingizga kiring</p>
                </div>
                
                <div className="mb-3">
                  <label className="form-label small text-uppercase text-muted">Username</label>
                  <div className="input-group">
                    <span className="input-group-text bg-transparent border-end-0">
                      <FiUser />
                    </span>
                    <input 
                      type="text" 
                      className="form-control border-start-0" 
                      placeholder="foydalanuvchi" 
                      value={username} 
                      onChange={e => setUsername(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="form-label small text-uppercase text-muted">Parol</label>
                  <div className="input-group">
                    <span className="input-group-text bg-transparent border-end-0">🔒</span>
                    <input 
                      type="password" 
                      className="form-control border-start-0" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                  </div>
                </div>
                
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn w-100 py-3 fw-bold mb-3 shadow-sm border-0"
                  style={{ 
                    background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}80 100%)`,
                    color: '#fff'
                  }}
                  onClick={handleAuth}
                >
                  {isSignUp ? 'RO‘YXATDAN O‘TISH' : 'KIRISH'}
                </motion.button>
                
                <div className="text-center mb-3">
                  <button className="btn btn-link btn-sm text-decoration-none" onClick={() => setIsSignUp(!isSignUp)}>
                    {isSignUp ? "Akkauntingiz bormi? Kirish" : "Yangi akkaunt? Ro'yxatdan o'tish"}
                  </button>
                </div>
                
                <div className="border-top pt-3 text-center">
                  <button 
                    className="btn btn-outline-success rounded-pill w-100 fw-bold d-flex align-items-center justify-content-center"
                    onClick={() => setView('student_name')}
                  >
                    <GiGraduateCap className="me-2" />
                    Men o'quvchiman
                  </button>
                </div>
              </motion.div>
            )}

            {/* --- TEACHER VIEW (YANGILANDI) --- */}
            {view === 'teacher' && user && (
              <div className="container py-4 py-md-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h2 className="fw-bold">📚 Mening Fanlarim</h2>
                    <p className="text-muted">Fanlaringizni boshqaring va quizlar yarating</p>
                  </div>
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-outline-info btn-sm d-flex align-items-center"
                      onClick={() => setShowStats(true)}
                    >
                      <FiBarChart2 className="me-1" />
                      Statistika
                    </button>
                    <div className="dropdown">
                      <button className="btn btn-outline-secondary btn-sm dropdown-toggle d-flex align-items-center" data-bs-toggle="dropdown">
                        <GiLightningHelix className="me-1" />
                        {quizMode.toUpperCase()}
                      </button>
                      <div className="dropdown-menu">
                        {['normal', 'blitz', 'survival', 'marathon'].map(mode => (
                          <button key={mode} className="dropdown-item" onClick={() => handleModeChange(mode)}>
                            {mode === 'normal' && '📝 Normal (Random)'}
                            {mode === 'blitz' && '⚡ Blitz (Random)'}
                            {mode === 'survival' && '🔥 Survival (Random)'}
                            {mode === 'marathon' && '🏃 Marathon (Random)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* ===== QUIZ MODES KOMPONENTI ===== */}
                <QuizModes 
                  quizMode={quizMode} 
                  setQuizMode={handleModeChange} 
                  isDarkMode={isDarkMode}
                  timeSettings={timeSettings}
                  setTimeSettings={setTimeSettings}
                />
                
                {/* Yangi fan qo'shish */}
                <div className="card border-0 shadow-sm mb-5" style={{ background: isDarkMode ? '#1a1d20' : '#f8f9fa' }}>
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-3">➕ Yangi fan qo'shish</h5>
                    <div className="input-group input-group-lg">
                      <input 
                        type="text" 
                        className="form-control border-0 shadow-none" 
                        placeholder="Fan nomi..." 
                        value={newSubName} 
                        onChange={e => setNewSubName(e.target.value)} 
                        style={{ background: 'transparent' }}
                      />
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn fw-bold text-white border-0 px-4"
                        style={{ backgroundColor: themeColor }}
                        onClick={addSubject}
                      >
                        <FiChevronRight size={20} />
                      </motion.button>
                    </div>
                  </div>
                </div>
                
                {/* Fanlar kartalari */}
                <div className="row g-4">
                  {subjects.map(s => {
                    const subColor = s.color || themeColor;
                    return (
                      <div key={s.id} className="col-12 col-md-6 col-lg-4">
                        <motion.div
                          whileHover={{ y: -5 }}
                          className="card h-100 border-0 shadow-lg overflow-hidden"
                          style={{ borderRadius: '15px' }}
                        >
                          <div 
                            className="card-header border-0 py-3 text-white d-flex justify-content-between align-items-center"
                            style={{ backgroundColor: subColor }}
                          >
                            <h5 className="fw-bold mb-0 text-truncate">{s.name}</h5>
                            <button 
                              className="btn btn-sm btn-light rounded-circle"
                              onClick={() => remove(ref(db, `subjects/${s.id}`))}
                            >
                              ×
                            </button>
                          </div>
                          
                          <div className="card-body d-flex flex-column">
                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-muted">Savollar:</span>
                                <span className="badge rounded-pill" style={{ backgroundColor: `${subColor}30`, color: subColor }}>
                                  {s.questions.length} ta
                                </span>
                              </div>
                              
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="text-muted">Rejim:</span>
                                <span className={`badge ${quizMode === 'blitz' ? 'bg-warning' : quizMode === 'survival' ? 'bg-danger' : quizMode === 'marathon' ? 'bg-success' : 'bg-primary'}`}>
                                  {quizMode} (Random)
                                </span>
                              </div>

                              <div className="d-flex justify-content-between align-items-center mt-2">
                                <span className="text-muted">Vaqt:</span>
                                <span className="badge bg-secondary">
                                  {timeSettings[quizMode]} soniya
                                </span>
                              </div>
                            </div>
                            
                            {s.questions.length > 0 && (
                              <div className="mt-auto">
                                <div className="progress mb-3" style={{ height: '6px' }}>
                                  <div 
                                    className="progress-bar" 
                                    style={{ 
                                      width: '100%',
                                      backgroundColor: subColor
                                    }}
                                  />
                                </div>
                                <small className="text-muted">So'ngi o'zgartirish: {new Date().toLocaleDateString()}</small>
                              </div>
                            )}
                            
                            <div className="mt-4 d-grid gap-2">
                              <button 
                                className="btn btn-outline-primary"
                                onClick={() => { setActiveSubId(s.id); setView('add_questions'); }}
                              >
                                ✏️ Tahrirlash
                              </button>
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="btn fw-bold text-white shadow-sm"
                                style={{ backgroundColor: subColor }}
                                onClick={() => startLobby(s.id)}
                              >
                                <FiPlay className="me-2" />
                                LIVE START
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                  
                  {subjects.length === 0 && (
                    <div className="col-12">
                      <div className="text-center py-5">
                        <div className="display-4 text-muted mb-3">📚</div>
                        <h5 className="text-muted">Hali fanlar mavjud emas</h5>
                        <p className="text-muted">Yuqoridagi formadan yangi fan qo'shing</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- ADD QUESTIONS (YANGILANDI) --- */}
            {view === 'add_questions' && (
              <div className="container py-4">
                <div className="row justify-content-center">
                  <div className="col-12 col-lg-10">
                    <div className="card border-0 shadow-lg overflow-hidden">
                      <div 
                        className="card-header border-0 py-3 text-white d-flex justify-content-between align-items-center"
                        style={{ backgroundColor: themeColor }}
                      >
                        <h5 className="fw-bold mb-0 d-flex align-items-center">
                          <GiTeacher className="me-2" />
                          Savollar Boshqaruvi
                        </h5>
                        <button 
                          className="btn btn-light btn-sm rounded-circle"
                          onClick={() => setView('teacher')}
                        >
                          <FiChevronLeft />
                        </button>
                      </div>
                      
                      <div className="card-body p-4">
                        <div className="row">
                          <div className="col-lg-6">
                            {/* Yangi savol formasi */}
                            <h6 className="fw-bold mb-3">➕ Yangi savol qo'shish</h6>
                            
                            <div className="mb-4">
                              <label className="form-label fw-bold">Savol matni</label>
                              <textarea 
                                className="form-control shadow-sm" 
                                placeholder="Savolni kiriting..." 
                                rows={3}
                                value={newQ.text} 
                                onChange={e => setNewQ({ ...newQ, text: e.target.value })} 
                              />
                            </div>
                            
                            <div className="mb-4">
                              <label className="form-label fw-bold">Darajasi</label>
                              <div className="d-flex gap-2 flex-wrap">
                                {[
                                  { value: 'easy', label: '😊 Oson', color: 'success' },
                                  { value: 'medium', label: '😐 O\'rtacha', color: 'warning' },
                                  { value: 'hard', label: '😓 Qiyin', color: 'danger' }
                                ].map(diff => (
                                  <button
                                    key={diff.value}
                                    className={`btn btn-${newQ.difficulty === diff.value ? diff.color : 'outline-' + diff.color} flex-fill`}
                                    onClick={() => setNewQ({ ...newQ, difficulty: diff.value })}
                                  >
                                    {diff.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {/* Variantlar */}
                            <div className="mb-4">
                              <label className="form-label fw-bold">Variantlar (Random tartibda ko'rsatiladi)</label>
                              {newQ.options.map((opt, i) => (
                                <div key={i} className="input-group mb-2">
                                  <div className="input-group-text">
                                    <input 
                                      type="radio" 
                                      className="form-check-input mt-0"
                                      name="correctAnswer"
                                      checked={newQ.correct === i}
                                      onChange={() => setNewQ({ ...newQ, correct: i })}
                                    />
                                  </div>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    placeholder={`Variant ${i + 1}`}
                                    value={opt}
                                    onChange={e => {
                                      let opts = [...newQ.options];
                                      opts[i] = e.target.value;
                                      setNewQ({ ...newQ, options: opts });
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                            
                            <div className="row g-3">
                              <div className="col-6">
                                <label className="form-label fw-bold">⏱️ Vaqt (soniya)</label>
                                <input 
                                  type="number" 
                                  className="form-control"
                                  min="5"
                                  max="120"
                                  value={newQ.time}
                                  onChange={e => setNewQ({ ...newQ, time: e.target.value })}
                                />
                              </div>
                              <div className="col-6">
                                <label className="form-label fw-bold">⭐ Ball</label>
                                <input 
                                  type="number" 
                                  className="form-control"
                                  min="10"
                                  max="1000"
                                  value={newQ.points}
                                  onChange={e => setNewQ({ ...newQ, points: e.target.value })}
                                />
                              </div>
                            </div>
                            
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="btn w-100 mt-4 py-3 fw-bold text-white shadow"
                              style={{ backgroundColor: themeColor }}
                              onClick={handleAddQuestion}
                              disabled={!newQ.text || newQ.options.some(opt => !opt.trim())}
                            >
                              <FiCheck className="me-2" />
                              SAVOLNI QO'SHISH
                            </motion.button>
                          </div>
                          
                          <div className="col-lg-6">
                            {/* Mavjud savollar */}
                            <h6 className="fw-bold mb-3">📋 Fan savollari ({activeSub?.questions?.length || 0})</h6>
                            <div className="border rounded p-3" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                              {activeSub?.questions?.length > 0 ? (
                                activeSub.questions.map((q, idx) => (
                                  <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="card mb-3 border-0 shadow-sm"
                                  >
                                    <div className="card-body">
                                      <div className="d-flex justify-content-between align-items-start mb-2">
                                        <div className="d-flex align-items-center">
                                          <span className="badge bg-primary me-2">{idx + 1}</span>
                                          <span className={`badge ${q.difficulty === 'easy' ? 'bg-success' : q.difficulty === 'hard' ? 'bg-danger' : 'bg-warning'}`}>
                                            {q.difficulty}
                                          </span>
                                        </div>
                                        <button 
                                          className="btn btn-sm btn-outline-danger"
                                          onClick={() => deleteQuestion(idx)}
                                        >
                                          <FiX />
                                        </button>
                                      </div>
                                      <p className="mb-2">{q.text}</p>
                                      <div className="small text-muted">
                                        <span className="me-3">⏱️ {q.time}s</span>
                                        <span>⭐ {q.points} ball</span>
                                        <span className="ms-3">🔀 Random variantlar</span>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))
                              ) : (
                                <div className="text-center py-5">
                                  <div className="display-4 text-muted mb-3">❓</div>
                                  <p className="text-muted">Hali savollar mavjud emas</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- STUDENT JOIN (YANGILANDI) --- */}
            {view === 'student_name' && (
              <div className="container py-5">
                <div className="row justify-content-center">
                  <div className="col-12 col-md-8 col-lg-6">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="card border-0 shadow-lg overflow-hidden"
                    >
                      <div 
                        className="card-header border-0 py-4 text-white text-center"
                        style={{ backgroundColor: themeColor }}
                      >
                        <h3 className="fw-bold mb-0 d-flex align-items-center justify-content-center">
                          <GiGraduateCap className="me-3" />
                          O'quvchi Profili
                        </h3>
                      </div>
                      
                      <div className="card-body p-4 p-md-5">
                        {/* Avatar tanlash */}
                        <div className="text-center mb-5">
                          <div className="display-1 mb-3">{selectedAvatar}</div>
                          <h5 className="fw-bold mb-3">Avatar tanlang</h5>
                          <div className="d-flex flex-wrap justify-content-center gap-2">
                            {avatars.map((av, idx) => (
                              <motion.button
                                key={idx}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                className={`btn btn-lg ${selectedAvatar === av ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => setSelectedAvatar(av)}
                                style={{ fontSize: '1.5rem' }}
                              >
                                {av}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Ism kiritish */}
                        <div className="mb-4">
                          <label className="form-label fw-bold">👤 Ismingiz</label>
                          <input 
                            type="text" 
                            className="form-control form-control-lg text-center" 
                            placeholder="Ismingizni kiriting" 
                            value={playerName} 
                            onChange={e => setPlayerName(e.target.value)} 
                          />
                        </div>
                        
                        {/* PIN kiritish */}
                        <div className="mb-5">
                          <label className="form-label fw-bold">🔑 O'yin kodi (PIN)</label>
                          <input 
                            type="text" 
                            className="form-control form-control-lg text-center fs-2" 
                            placeholder="000000" 
                            maxLength="6" 
                            value={inputPin} 
                            onChange={e => setInputPin(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                          />
                          <div className="form-text text-center">O'qituvchidan olingan 6 xonali kod</div>
                        </div>
                        
                        <div className="d-grid gap-3">
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="btn btn-lg py-3 fw-bold text-white shadow"
                            style={{ backgroundColor: themeColor }}
                            onClick={joinGame}
                            disabled={!playerName.trim() || inputPin.length !== 6}
                          >
                            <FiChevronRight className="me-2" />
                            {selectedAvatar} {playerName ? `${playerName} sifatida kirish` : 'KIRISH'}
                          </motion.button>
                          
                          <button 
                            className="btn btn-outline-secondary"
                            onClick={() => setView('auth')}
                          >
                            <FiChevronLeft className="me-2" />
                            Orqaga
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            )}

            {/* --- LOBBY (YANGILANDI) --- */}
            {view === 'lobby' && (
              <div className="container-fluid h-100" style={{ 
                background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}60 100%)`
              }}>
                <div className="container h-100 py-5">
                  <div className="row h-100 align-items-center">
                    <div className="col-12">
                      <div className="text-center text-white">
                        {/* PIN kodi */}
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 200 }}
                          className="display-1 fw-bold mb-3"
                          style={{ textShadow: '0 5px 15px rgba(0,0,0,0.3)' }}
                        >
                          {generatedPin}
                        </motion.div>
                        
                        <p className="fs-4 mb-4 opacity-75">O'quvchilar ushbu kodni kiritsin</p>
                        
                        {/* Rejim va holat */}
                        <div className="d-flex justify-content-center gap-3 mb-5">
                          <span className={`badge ${quizMode === 'blitz' ? 'bg-warning' : quizMode === 'survival' ? 'bg-danger' : quizMode === 'marathon' ? 'bg-success' : 'bg-dark'} fs-5 px-4 py-2 rounded-pill`}>
                            {quizMode === 'normal' && '📝 Normal (Random)'}
                            {quizMode === 'blitz' && '⚡ Blitz (Random)'}
                            {quizMode === 'survival' && '🔥 Survival (Random)'}
                            {quizMode === 'marathon' && '🏃 Marathon (Random)'}
                          </span>
                          <span className="badge bg-white text-dark fs-5 px-4 py-2 rounded-pill">
                            <FiUsers className="me-2" />
                            {players.length} o'yinchi
                          </span>
                          <span className="badge bg-info fs-5 px-4 py-2 rounded-pill">
                            ⏱️ {timeSettings[quizMode]}s
                          </span>
                        </div>
                        
                        {/* O'yinchilar ro'yxati */}
                        <motion.div 
                          initial={{ y: 50, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="mb-5"
                        >
                          <h4 className="mb-4">👥 O'yinchilar ro'yxati</h4>
                          <div className="row g-3 justify-content-center">
                            {players.length === 0 ? (
                              <div className="col-12">
                                <div className="alert alert-light shadow-sm">
                                  <p className="mb-0">⏳ O'yinchilar kutilmoqda...</p>
                                </div>
                              </div>
                            ) : (
                              players.map((p, i) => (
                                <div key={i} className="col-6 col-md-3 col-lg-2">
                                  <motion.div
                                    whileHover={{ y: -5 }}
                                    className="card border-0 shadow-lg text-center py-3"
                                    style={{ borderRadius: '15px' }}
                                  >
                                    <div className="display-5 mb-2">{p.avatar || '👤'}</div>
                                    <h6 className="fw-bold text-truncate px-2">{p.name || p}</h6>
                                    <small className="text-muted">Kutish...</small>
                                  </motion.div>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                        
                        {/* Boshlash tugmasi */}
                        <div className="mt-5">
                          {!playerName ? (
                            <motion.div
                              initial={{ scale: 0.9 }}
                              animate={{ scale: 1 }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <button 
                                className="btn btn-light btn-lg px-5 py-4 fs-3 fw-bold rounded-pill shadow-lg"
                                onClick={startActualGame}
                                style={{ minWidth: '250px' }}
                              >
                                <FiPlay className="me-3" />
                                BOSHLASH
                              </button>
                              <p className="mt-3 text-white opacity-75">
                                Barcha o'quvchilar tayyor bo'lgach boshlang
                              </p>
                            </motion.div>
                          ) : (
                            <div className="alert alert-light shadow-lg">
                              <div className="display-4 mb-3">{selectedAvatar}</div>
                              <h4 className="fw-bold">{playerName}</h4>
                              <p className="fs-5 mb-0">✅ Tizimga kirdingiz!</p>
                              <p className="mt-2 opacity-75">O'qituvchi o'yinni boshlashini kuting...</p>
                              <div className="mt-3">
                                <span className={`badge ${quizMode === 'blitz' ? 'bg-warning' : quizMode === 'survival' ? 'bg-danger' : quizMode === 'marathon' ? 'bg-success' : 'bg-primary'}`}>
                                  Rejim: {quizMode} (Random)
                                </span>
                                <span className="badge bg-secondary ms-2">
                                  Vaqt: {timeSettings[quizMode]}s
                                </span>
                                <span className="badge bg-info ms-2">
                                  <GiPerspectiveDiceSixFacesRandom className="me-1" />
                                  Random tartib
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- QUIZ MODE (O'QUVCHI UCHUN - YANGILANDI VA TUZATILGAN) --- */}
            {view === 'quiz_mode' && activeSub && playerName && (
              <div className="container py-4">
                <div className="row g-4">
                  <div className="col-12">
                    {/* O'quvchi statistikasi */}
                    <PlayerStats
                      playerName={playerName}
                      score={score}
                      streak={streak}
                      correctAnswers={correctAnswers}
                      liveScores={liveScores}
                      isDarkMode={isDarkMode}
                      quizMode={quizMode}
                      survivalLives={survivalLives}
                      questionCounter={quizMode === 'marathon' ? questionCounter + 1 : currentShuffledIndex}
                      totalQuestions={quizMode === 'marathon' ? null : shuffledQuestions.length}
                      usedQuestions={currentShuffledIndex}
                    />
                    
                    {/* Savol kartasi */}
                    <div className="card border-0 shadow-lg overflow-hidden mb-4">
                      <div className="card-body p-4 p-md-5">
                        {/* Progress bar va vaqt */}
                        <div className="row align-items-center mb-5">
                          <div className="col-md-6">
                            <div className="d-flex align-items-center">
                              {quizMode !== 'marathon' ? (
                                <div className="d-flex align-items-center">
                                  <span className="badge bg-info me-2">
                                    <GiPerspectiveDiceSixFacesRandom className="me-1" />
                                    Random
                                  </span>
                                  <span className="text-muted">
                                    Savol: {currentShuffledIndex}/{shuffledQuestions.length}
                                  </span>
                                </div>
                              ) : (
                                <div className="d-flex align-items-center">
                                  <div className="badge bg-success me-2">♾️ Marathon</div>
                                  <span className="text-muted">Savol: {questionCounter + 1}</span>
                                </div>
                              )}
                            </div>
                            <div className="progress mt-2" style={{ height: '4px' }}>
                              <div 
                                className="progress-bar"
                                style={{ 
                                  width: quizMode === 'marathon' 
                                    ? `${((questionCounter % 10) / 10) * 100}%`
                                    : `${((currentShuffledIndex) / shuffledQuestions.length) * 100}%`,
                                  backgroundColor: themeColor
                                }}
                              />
                            </div>
                            {quizMode !== 'marathon' && (
                              <small className="text-muted mt-1">
                                {currentShuffledIndex} ta savol ko'rsatildi
                              </small>
                            )}
                          </div>
                          
                          <div className="col-md-6 text-end">
                            <div className="d-flex justify-content-end align-items-center gap-3">
                              {/* Survival jonlari */}
                              {quizMode === 'survival' && (
                                <div className="d-flex align-items-center">
                                  {[...Array(3)].map((_, i) => (
                                    <div 
                                      key={i}
                                      className={`heart ${i < survivalLives ? 'active' : 'inactive'} mx-1`}
                                      style={{
                                        width: '25px',
                                        height: '25px',
                                        background: i < survivalLives ? '#dc3545' : '#6c757d',
                                        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                              
                              {/* Taymer */}
                              <motion.div
                                animate={pulseAnimation || quizMode === 'blitz' ? { scale: [1, 1.1, 1] } : {}}
                                transition={{ repeat: quizMode === 'blitz' ? Infinity : 0, duration: 0.5 }}
                                className={`badge fs-5 px-4 py-2 rounded-pill ${timer < 10 ? 'bg-danger' : quizMode === 'blitz' ? 'bg-warning blitz-timer' : 'bg-warning'}`}
                              >
                                <FiClock className="me-2" />
                                {formatTime(timer)}
                              </motion.div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Savol (MUHIM: Joriy savolni to'g'ri olish) */}
                        <motion.div
                          key={quizMode === 'marathon' ? questionCounter : currentShuffledIndex}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center mb-5"
                        >
                          <div className="d-flex justify-content-center mb-4">
                            <span className="badge bg-primary me-3">
                              {quizMode === 'marathon' ? `Savol ${questionCounter + 1} ♾️` : `Savol ${currentShuffledIndex}`}
                            </span>
                            
                            {/* ⭐⭐ ASOSIY TUZATISH: Joriy savolni to'g'ri olish ⭐⭐ */}
                            {quizMode !== 'marathon' && currentShuffledIndex > 0 && shuffledQuestions[currentShuffledIndex - 1]?.difficulty && (
                              <span className={`badge ${shuffledQuestions[currentShuffledIndex - 1].difficulty === 'easy' ? 'bg-success' : shuffledQuestions[currentShuffledIndex - 1].difficulty === 'hard' ? 'bg-danger' : 'bg-warning'}`}>
                                {shuffledQuestions[currentShuffledIndex - 1].difficulty === 'easy' ? '😊 Oson' : 
                                 shuffledQuestions[currentShuffledIndex - 1].difficulty === 'hard' ? '😓 Qiyin' : '😐 O\'rtacha'}
                              </span>
                            )}
                            
                            {quizMode === 'marathon' && marathonQuestions[questionCounter]?.difficulty && (
                              <span className={`badge ${marathonQuestions[questionCounter].difficulty === 'easy' ? 'bg-success' : marathonQuestions[questionCounter].difficulty === 'hard' ? 'bg-danger' : 'bg-warning'}`}>
                                {marathonQuestions[questionCounter].difficulty === 'easy' ? '😊 Oson' : 
                                 marathonQuestions[questionCounter].difficulty === 'hard' ? '😓 Qiyin' : '😐 O\'rtacha'}
                              </span>
                            )}
                            
                            {streak >= 5 && (
                              <span className="badge bg-warning ms-3">
                                🔥 Streak {streak}
                              </span>
                            )}
                            
                            {quizMode === 'marathon' && streak >= 3 && (
                              <span className="badge bg-success ms-3">
                                🏃 Ketma-ket {streak}
                              </span>
                            )}
                            
                            <span className="badge bg-info ms-3">
                              <GiPerspectiveDiceSixFacesRandom className="me-1" />
                              Random
                            </span>
                          </div>
                          
                          {/* ⭐⭐ ASOSIY TUZATISH: Savol matnini to'g'ri olish ⭐⭐ */}
                          <h2 className="display-6 fw-bold mb-5">
                            {quizMode === 'marathon' 
                              ? marathonQuestions[questionCounter]?.text
                              : (currentShuffledIndex > 0 ? shuffledQuestions[currentShuffledIndex - 1]?.text : shuffledQuestions[0]?.text)}
                          </h2>
                          
                          {/* Variantlar (MUHIM: To'g'ri savolning variantlarini olish) */}
                          <div className="row g-4">
                            {(quizMode === 'marathon' 
                              ? marathonQuestions[questionCounter]?.options 
                              : (currentShuffledIndex > 0 ? shuffledQuestions[currentShuffledIndex - 1]?.options : shuffledQuestions[0]?.options)
                            )?.map((opt, i) => (
                              <div key={i} className="col-12 col-md-6">
                                <motion.button
                                  whileHover={{ scale: 1.03, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
                                  whileTap={{ scale: 0.97 }}
                                  disabled={!!feedback || allQuestionsAnswered}
                                  className={`btn w-100 py-4 fs-5 fw-bold border-3 ${feedback && checkAnswer(i) ? 'btn-success border-success' : feedback && !checkAnswer(i) ? 'btn-danger border-danger' : 'btn-outline-primary border-primary'}`}
                                  onClick={() => handleAnswer(checkAnswer(i))}
                                  style={{ 
                                    height: '100px',
                                    borderRadius: '15px'
                                  }}
                                >
                                  {opt}
                                </motion.button>
                              </div>
                            ))}
                          </div>
                          
                          {/* Barcha savollar tugaganda xabar */}
                          {allQuestionsAnswered && (
                            <div className="alert alert-info mt-4">
                              <h5>✅ Barcha savollarga javob berdingiz!</h5>
                              <p>Natijalarni ko'rish uchun kuting...</p>
                            </div>
                          )}
                        </motion.div>
                        
                        {/* Feedback animatsiya */}
                        <AnimatePresence>
                          {feedback && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className={`text-center mt-4 ${feedback === 'correct' ? 'text-success' : 'text-danger'}`}
                            >
                              <div className="display-1">
                                {feedback === 'correct' ? '✅' : '❌'}
                              </div>
                              <h3 className="fw-bold">
                                {feedback === 'correct' ? 'TO\'G\'RI!' : 'NOTO\'G\'RI!'}
                              </h3>
                              {feedback === 'wrong' && quizMode === 'survival' && (
                                <p className="text-danger">
                                  ❤️ {survivalLives} jon qoldi!
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- QUIZ MODE (O'QITUVCHI UCHUN - YANGILANDI) --- */}
            {view === 'quiz_mode' && activeSub && !playerName && (
              <div className="container py-4">
                <div className="row g-4">
                  <div className="col-12">
                    {/* O'qituvchi dashboard */}
                    <div className="card border-0 shadow-lg overflow-hidden mb-4">
                      <div 
                        className="card-header border-0 py-4 text-white d-flex justify-content-between align-items-center"
                        style={{ backgroundColor: themeColor }}
                      >
                        <h3 className="fw-bold mb-0 d-flex align-items-center">
                          <GiTeacher className="me-3" />
                          O'qituvchi Nazorat Paneli
                        </h3>
                        <div className="d-flex gap-2">
                          <span className={`badge ${quizMode === 'blitz' ? 'bg-warning' : quizMode === 'survival' ? 'bg-danger' : quizMode === 'marathon' ? 'bg-success' : 'bg-dark'} fs-6`}>
                            {quizMode.toUpperCase()} (Random)
                          </span>
                          <span className="badge bg-info fs-6">
                            <GiPerspectiveDiceSixFacesRandom className="me-1" />
                            Random
                          </span>
                          <span className="badge bg-light text-dark fs-6">
                            ⏱️ {timeSettings[quizMode]}s
                          </span>
                        </div>
                      </div>
                      
                      <div className="card-body p-4">
                        {/* Statistik kartalar */}
                        <div className="row g-4 mb-5">
                          <div className="col-md-3">
                            <div className="card border-0 shadow-sm h-100 text-center py-4">
                              <div className="display-6 text-primary mb-2">
                                {quizMode === 'marathon' ? questionCounter + 1 : currentShuffledIndex}
                              </div>
                              <div className="small text-muted">Joriy savol</div>
                              <div className="mt-2">
                                <small className="text-muted">
                                  {quizMode === 'marathon' ? '♾️ Cheksiz' : `Jami: ${shuffledQuestions.length}`}
                                </small>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-md-3">
                            <div className="card border-0 shadow-sm h-100 text-center py-4">
                              <motion.div
                                animate={pulseAnimation || quizMode === 'blitz' ? { scale: [1, 1.1, 1] } : {}}
                                transition={{ repeat: quizMode === 'blitz' ? Infinity : 0, duration: 0.5 }}
                                className={`display-6 ${timer < 10 ? 'text-danger' : quizMode === 'blitz' ? 'text-warning' : 'text-warning'} mb-2`}
                              >
                                {formatTime(timer)}
                              </motion.div>
                              <div className="small text-muted">Qolgan vaqt</div>
                              <div className="mt-2">
                                <small className="text-muted">
                                  Jami: {timeSettings[quizMode]}s
                                </small>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-md-3">
                            <div className="card border-0 shadow-sm h-100 text-center py-4">
                              <div className="display-6 text-success mb-2">
                                {studentAnswers[currentShuffledIndex - 1] || 0}
                              </div>
                              <div className="small text-muted">Javob berganlar</div>
                              <div className="progress mt-2" style={{ height: '6px' }}>
                                <div 
                                  className="progress-bar bg-success" 
                                  style={{ 
                                    width: `${players.length > 0 ? ((studentAnswers[currentShuffledIndex - 1] || 0) / players.length) * 100 : 0}%` 
                                  }}
                                />
                              </div>
                              <small className="text-muted">
                                {players.length > 0 
                                  ? `${Math.round(((studentAnswers[currentShuffledIndex - 1] || 0) / players.length) * 100)}%`
                                  : '0%'}
                              </small>
                            </div>
                          </div>
                          
                          <div className="col-md-3">
                            <div className="card border-0 shadow-sm h-100 text-center py-4">
                              <div className="display-6 text-info mb-2">
                                {players.length > 0 
                                  ? Math.round(Object.values(liveScores).reduce((a, b) => a + b, 0) / players.length) 
                                  : 0}
                              </div>
                              <div className="small text-muted">O'rtacha ball</div>
                              <div className="mt-2">
                                <small className="text-muted">
                                  Eng yuqori: {Math.max(...Object.values(liveScores), 0)}
                                </small>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Joriy savol */}
                        <div className="card border-0 shadow-sm mb-5">
                          <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                              <h4 className="fw-bold mb-0">
                                <span className="badge bg-primary me-3">
                                  #{quizMode === 'marathon' ? questionCounter + 1 : currentShuffledIndex}
                                </span>
                                Savol (Random tartib)
                              </h4>
                              
                              {/* ⭐⭐ TUZATISH: Joriy savolni to'g'ri olish ⭐⭐ */}
                              {quizMode !== 'marathon' && currentShuffledIndex > 0 && shuffledQuestions[currentShuffledIndex - 1]?.difficulty && (
                                <span className={`badge ${shuffledQuestions[currentShuffledIndex - 1].difficulty === 'easy' ? 'bg-success' : shuffledQuestions[currentShuffledIndex - 1].difficulty === 'hard' ? 'bg-danger' : 'bg-warning'}`}>
                                  {shuffledQuestions[currentShuffledIndex - 1].difficulty === 'easy' ? '😊 OSON' : 
                                   shuffledQuestions[currentShuffledIndex - 1].difficulty === 'hard' ? '😓 QIYIN' : '😐 O\'RTACHA'}
                                </span>
                              )}
                              
                              {quizMode === 'marathon' && marathonQuestions[questionCounter]?.difficulty && (
                                <span className={`badge ${marathonQuestions[questionCounter].difficulty === 'easy' ? 'bg-success' : marathonQuestions[questionCounter].difficulty === 'hard' ? 'bg-danger' : 'bg-warning'}`}>
                                  {marathonQuestions[questionCounter].difficulty === 'easy' ? '😊 OSON' : 
                                   marathonQuestions[questionCounter].difficulty === 'hard' ? '😓 QIYIN' : '😐 O\'RTACHA'}
                                </span>
                              )}
                              
                              <span className="badge bg-info">
                                <GiPerspectiveDiceSixFacesRandom className="me-1" />
                                Random
                              </span>
                            </div>
                            
                            {/* ⭐⭐ TUZATISH: Savol matnini to'g'ri olish ⭐⭐ */}
                            <h3 className="mb-5">
                              {quizMode === 'marathon' 
                                ? marathonQuestions[questionCounter]?.text
                                : (currentShuffledIndex > 0 ? shuffledQuestions[currentShuffledIndex - 1]?.text : "Savol yuklanmoqda...")}
                            </h3>
                            
                            {/* Variantlar (To'g'ri savolning variantlarini olish) */}
                            <div className="row g-4">
                              {(quizMode === 'marathon' 
                                ? marathonQuestions[questionCounter]?.options 
                                : (currentShuffledIndex > 0 ? shuffledQuestions[currentShuffledIndex - 1]?.options : [])
                              )?.map((opt, i) => (
                                <div key={i} className="col-12 col-md-6">
                                  <div className={`card border-3 ${i === (quizMode === 'marathon' 
                                    ? marathonQuestions[questionCounter]?.correct 
                                    : (currentShuffledIndex > 0 ? shuffledQuestions[currentShuffledIndex - 1]?.correct : 0)) ? 'border-success bg-success bg-opacity-10' : 'border-light'}`}>
                                    <div className="card-body">
                                      <div className="d-flex align-items-center">
                                        <div className={`rounded-circle me-3 ${i === (quizMode === 'marathon' 
                                          ? marathonQuestions[questionCounter]?.correct 
                                          : (currentShuffledIndex > 0 ? shuffledQuestions[currentShuffledIndex - 1]?.correct : 0)) ? 'bg-success text-white' : 'bg-light'}`}
                                          style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          {String.fromCharCode(65 + i)}
                                        </div>
                                        <div className="fs-5">{opt}</div>
                                        {i === (quizMode === 'marathon' 
                                          ? marathonQuestions[questionCounter]?.correct 
                                          : (currentShuffledIndex > 0 ? shuffledQuestions[currentShuffledIndex - 1]?.correct : 0)) && (
                                          <span className="badge bg-success ms-auto">To'g'ri javob</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {/* Kontrol tugmalari */}
                        <div className="d-flex flex-wrap gap-3 justify-content-center mb-5">
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="btn btn-primary btn-lg px-5 py-3"
                            onClick={goToNextQuestion}
                            disabled={(timer > 0 && questionStatus === 'active' && quizMode !== 'marathon') || allQuestionsAnswered}
                          >
                            <FiChevronRight className="me-2" />
                            {allQuestionsAnswered ? 'Natijalarni ko\'rish' : 
                             quizMode === 'marathon' 
                               ? 'Keyingi savol (Marathon)' 
                               : 'Keyingi savol (Random)'}
                          </motion.button>
                          
                          {/* Savollarni qayta aralashtirish tugmasi */}
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="btn btn-warning btn-lg px-5 py-3 d-flex align-items-center"
                            onClick={reshuffleQuestions}
                          >
                            <FiShuffle className="me-2" />
                            Qayta aralashtirish
                          </motion.button>
                          
                          {/* Tezlashtirish tugmasi */}
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="btn btn-success btn-lg px-5 py-3"
                            onClick={() => {
                              const answeredCount = studentAnswers[currentShuffledIndex - 1] || 0;
                              const totalPlayers = players.length;
                              
                              if (totalPlayers === 0) {
                                alert("⚠️ Hali o'quvchilar qo'shilmagan!");
                                return;
                              }
                              
                              const answeredPercent = (answeredCount / totalPlayers) * 100;
                              
                              if (answeredPercent >= 80) {
                                setTimer(3);
                                setQuestionStatus('completed');
                                
                                setTimeout(() => {
                                  goToNextQuestion();
                                }, 3000);
                              } else {
                                alert(`⏳ Hali ${Math.round(100 - answeredPercent)}% o'quvchi javob bermadi!`);
                              }
                            }}
                            disabled={players.length === 0 || questionStatus !== 'active' || allQuestionsAnswered}
                          >
                            <FiFastForward className="me-2" />
                            Tezlashtirish ({players.length > 0 
                              ? `${Math.round(((studentAnswers[currentShuffledIndex - 1] || 0) / players.length) * 100)}% javob bergan`
                              : '0%'})
                          </motion.button>
                          
                          {quizMode !== 'marathon' && (
                            <>
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="btn btn-warning btn-lg px-5 py-3"
                                onClick={() => {
                                  if (timer > 5) {
                                    setTimer(5);
                                  }
                                }}
                                disabled={timer <= 5 || allQuestionsAnswered}
                              >
                                <FiFastForward className="me-2" />
                                Vaqtni tezlashtirish (5s)
                              </motion.button>
                              
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="btn btn-danger btn-lg px-5 py-3"
                                onClick={() => {
                                  setTimer(0);
                                  setQuestionStatus('completed');
                                  setTimeout(() => {
                                    goToNextQuestion();
                                  }, 1000);
                                }}
                                disabled={allQuestionsAnswered}
                              >
                                <FiPause className="me-2" />
                                Savolni tugatish
                              </motion.button>
                            </>
                          )}
                        </div>
                        
                        {/* Barcha savollar tugaganda xabar */}
                        {allQuestionsAnswered && (
                          <div className="alert alert-success text-center mb-4">
                            <h5>✅ Barcha savollar tugadi!</h5>
                            <p>O'quvchilar natijalarni kutmoqda. Natijalarni ko'rish tugmasini bosing.</p>
                            <button 
                              className="btn btn-primary btn-lg mt-2"
                              onClick={() => {
                                saveGameHistory();
                                setView('results');
                              }}
                            >
                              Natijalarni ko'rish
                            </button>
                          </div>
                        )}
                        
                        {/* O'quvchilar holati */}
                        <div className="card border-0 shadow-sm">
                          <div className="card-body">
                            <h5 className="fw-bold mb-4 d-flex align-items-center">
                              <FiUsers className="me-2" />
                              O'quvchilar holati ({players.length} ta)
                              <div className="ms-auto">
                                <span className={`badge ${players.length > 0 && ((studentAnswers[currentShuffledIndex - 1] || 0) / players.length) >= 0.8 
                                  ? 'bg-success' 
                                  : 'bg-warning'}`}>
                                  {players.length > 0 
                                    ? `${Math.round(((studentAnswers[currentShuffledIndex - 1] || 0) / players.length) * 100)}% javob bergan`
                                    : '0%'}
                                </span>
                              </div>
                            </h5>
                            
                            <div className="row g-3">
                              {players.map((player, index) => {
                                const playerScore = liveScores[player.name || player] || 0;
                                const playerAnswers = allStudentAnswers.filter(a => a.playerName === (player.name || player));
                                const currentAnswer = playerAnswers.find(a => a.questionIndex === (currentShuffledIndex - 1));
                                const correctCount = playerAnswers.filter(a => a.isCorrect).length;
                                
                                return (
                                  <div key={index} className="col-6 col-md-4 col-lg-3">
                                    <motion.div
                                      whileHover={{ y: -5 }}
                                      className="card border-0 shadow-sm h-100"
                                    >
                                      <div className="card-body text-center p-3">
                                        <div className="display-6 mb-2">{player.avatar || '👤'}</div>
                                        <h6 className="fw-bold text-truncate mb-2">{player.name || player}</h6>
                                        
                                        <div className="mb-3">
                                          <span className="badge bg-primary rounded-pill">
                                            {playerScore} ball
                                          </span>
                                        </div>
                                        
                                        <div className="mb-2">
                                          {currentAnswer ? (
                                            <span className={`badge ${currentAnswer.isCorrect ? 'bg-success' : 'bg-danger'}`}>
                                              {currentAnswer.isCorrect ? '✅ Togri' : '❌ Xato'} 
                                              <br />
                                              <small>{currentAnswer.timeSpent}s</small>
                                            </span>
                                          ) : questionStatus === 'completed' ? (
                                            <span className="badge bg-secondary">❌ Javob bermadi</span>
                                          ) : (
                                            <span className="badge bg-light text-dark">⏳ Kutyapti</span>
                                          )}
                                        </div>
                                        
                                        <div className="small text-muted">
                                          To'g'ri: {correctCount}/{playerAnswers.length}
                                        </div>
                                      </div>
                                    </motion.div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- RESULTS + PODIUM (YANGILANDI) --- */}
            {view === 'results' && (
              <div className="container py-5">
                <div className="row justify-content-center">
                  <div className="col-12 col-lg-10">
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="card border-0 shadow-lg overflow-hidden"
                    >
                      <div 
                        className="card-header border-0 py-5 text-white text-center"
                        style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}80 100%)` }}
                      >
                        <div className="display-1 mb-3">
                          {quizMode === 'survival' && survivalLives === 0 ? '💀' : 
                           quizMode === 'marathon' ? '🏃' : 
                           quizMode === 'blitz' ? '⚡' : '🏆'}
                        </div>
                        <h1 className="display-4 fw-bold">
                          {quizMode === 'survival' && survivalLives === 0 ? 'O\'YIN TUGADI!' : 'TABRIKLAYMIZ!'}
                        </h1>
                        <p className="fs-5 opacity-75">
                          {quizMode === 'survival' && survivalLives === 0 
                            ? 'Sizning jonlaringiz tugadi!' 
                            : quizMode === 'marathon' 
                            ? 'Marathon yakunlandi!' 
                            : 'Quiz muvaffaqiyatli yakunlandi'}
                        </p>
                        {quizMode !== 'marathon' && (
                          <div className="mt-3">
                            <span className="badge bg-info">
                              <GiPerspectiveDiceSixFacesRandom className="me-1" />
                              Random tartibda o'ynaldi
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="card-body p-4 p-md-5">
                        {/* O'quvchi statistikasi */}
                        {playerName && (
                          <div className="card border-0 shadow-sm mb-5" style={{ backgroundColor: `${themeColor}10` }}>
                            <div className="card-body p-4">
                              <div className="text-center mb-4">
                                <div className="display-1 mb-3">{selectedAvatar}</div>
                                <h3 className="fw-bold">{playerName}</h3>
                                <span className={`badge ${quizMode === 'blitz' ? 'bg-warning' : quizMode === 'survival' ? 'bg-danger' : quizMode === 'marathon' ? 'bg-success' : 'bg-primary'}`}>
                                  Rejim: {quizMode}
                                </span>
                                {quizMode !== 'marathon' && (
                                  <span className="badge bg-info ms-2">
                                    Random tartib
                                  </span>
                                )}
                              </div>
                              
                              <div className="row text-center">
                                <div className="col-4">
                                  <div className="display-4 fw-bold" style={{ color: themeColor }}>{score}</div>
                                  <div className="small text-muted">Umumiy ball</div>
                                </div>
                                <div className="col-4">
                                  <div className="display-4 fw-bold text-success">{correctAnswers.length}</div>
                                  <div className="small text-muted">To'g'ri javob</div>
                                </div>
                                <div className="col-4">
                                  <div className="display-4 fw-bold text-warning">{streak}</div>
                                  <div className="small text-muted">Maksimal streak</div>
                                </div>
                              </div>

                              {/* Rejimga xos statistikalar */}
                              <div className="row text-center mt-4">
                                {quizMode === 'survival' && (
                                  <div className="col-6">
                                    <div className="display-4 fw-bold text-danger">{survivalLives}</div>
                                    <div className="small text-muted">Qolgan jonlar</div>
                                  </div>
                                )}
                                {quizMode === 'marathon' && (
                                  <div className="col-6">
                                    <div className="display-4 fw-bold text-success">{questionCounter}</div>
                                    <div className="small text-muted">Javob berilgan savollar</div>
                                  </div>
                                )}
                                {quizMode !== 'marathon' && (
                                  <div className="col-6">
                                    <div className="display-6 fw-bold text-primary">{shuffledQuestions.length}</div>
                                    <div className="small text-muted">Jami savollar</div>
                                  </div>
                                )}
                                <div className="col-6">
                                  <div className="display-6 fw-bold text-info">{timeSettings[quizMode]}s</div>
                                  <div className="small text-muted">O'rtacha vaqt</div>
                                </div>
                              </div>
                              
                              <div className="progress mt-4" style={{ height: '10px' }}>
                                <div 
                                  className="progress-bar"
                                  style={{ 
                                    width: `${quizMode === 'marathon' 
                                      ? Math.min((questionCounter / 20) * 100, 100)
                                      : shuffledQuestions.length 
                                        ? (correctAnswers.length / shuffledQuestions.length) * 100 
                                        : 0}%`,
                                    backgroundColor: themeColor
                                  }}
                                />
                              </div>
                              <div className="text-center mt-2">
                                <small>
                                  {quizMode === 'marathon' 
                                    ? `Marathon: ${questionCounter} savol`
                                    : `Natija: ${correctAnswers.length}/${shuffledQuestions.length} (${Math.round((correctAnswers.length / shuffledQuestions.length) * 100)}%)`}
                                </small>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Podium */}
                        {sortedForPodium.length > 0 && (
                          <div className="mb-5">
                            <h3 className="fw-bold text-center mb-4">🏆 G'oliblar podiumi</h3>
                            <div className="d-flex justify-content-center align-items-end gap-4" style={{ height: '220px' }}>
                              {/* 2-o'rin */}
                              {sortedForPodium[1] && (
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: '150px' }}
                                  transition={{ delay: 0.3 }}
                                  className="card border-0 text-center"
                                  style={{ 
                                    width: '120px',
                                    backgroundColor: '#6c757d',
                                    borderBottom: `5px solid #495057`
                                  }}
                                >
                                  <div className="card-body d-flex flex-column justify-content-end">
                                    <div className="display-4 mb-2">🥈</div>
                                    <h6 className="fw-bold text-white text-truncate">{sortedForPodium[1][0]}</h6>
                                    <div className="text-white">{sortedForPodium[1][1]} ball</div>
                                  </div>
                                </motion.div>
                              )}
                              
                              {/* 1-o'rin */}
                              {sortedForPodium[0] && (
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: '200px' }}
                                  transition={{ delay: 0.1 }}
                                  className="card border-0 text-center shadow-lg"
                                  style={{ 
                                    width: '140px',
                                    backgroundColor: '#ffc107',
                                    borderBottom: `5px solid #e0a800`
                                  }}
                                >
                                  <div className="card-body d-flex flex-column justify-content-end">
                                    <div className="display-4 mb-2">🥇</div>
                                    <h5 className="fw-bold text-dark text-truncate">{sortedForPodium[0][0]}</h5>
                                    <div className="fw-bold text-dark">{sortedForPodium[0][1]} ball</div>
                                  </div>
                                </motion.div>
                              )}
                              
                              {/* 3-o'rin */}
                              {sortedForPodium[2] && (
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: '120px' }}
                                  transition={{ delay: 0.5 }}
                                  className="card border-0 text-center"
                                  style={{ 
                                    width: '120px',
                                    backgroundColor: '#0d6efd',
                                    borderBottom: `5px solid #0b5ed7`
                                  }}
                                >
                                  <div className="card-body d-flex flex-column justify-content-end">
                                    <div className="display-4 mb-2">🥉</div>
                                    <h6 className="fw-bold text-white text-truncate">{sortedForPodium[2][0]}</h6>
                                    <div className="text-white">{sortedForPodium[2][1]} ball</div>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* To'g'ri javoblar */}
                        {correctAnswers.length > 0 && playerName && (
                          <div className="card border-0 shadow-sm mb-5">
                            <div className="card-body">
                              <h5 className="fw-bold mb-3 d-flex align-items-center">
                                <FiCheck className="me-2 text-success" />
                                To'g'ri javoblaringiz
                              </h5>
                              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {correctAnswers.map((item, idx) => (
                                  <div key={idx} className="border-bottom py-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                      <div>
                                        <span className="badge bg-primary me-3">#{idx + 1}</span>
                                        <span className="text-truncate" style={{ maxWidth: '300px', display: 'inline-block' }}>
                                          {item.question}
                                        </span>
                                      </div>
                                      <span className="badge bg-success">+{item.points} ball</span>
                                    </div>
                                    <div className="small text-muted mt-1">
                                      <span className="me-3">Daraja: {item.difficulty}</span>
                                      <span>Vaqt: {item.time}</span>
                                      {item.mode && <span className="ms-3">Rejim: {item.mode}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Barcha natijalar */}
                        {!playerName && (
                          <div className="card border-0 shadow-sm mb-5">
                            <div className="card-body">
                              <h5 className="fw-bold mb-3">📊 Barcha o'yinchilar natijasi</h5>
                              <div className="mb-3">
                                <span className="badge bg-info">
                                  <GiPerspectiveDiceSixFacesRandom className="me-1" />
                                  Savollar random tartibda berildi
                                </span>
                              </div>
                              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {Object.entries(liveScores).sort(([, a], [, b]) => b - a).map(([n, s], index) => (
                                  <motion.div
                                    key={n}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="border-bottom py-3"
                                  >
                                    <div className="d-flex justify-content-between align-items-center">
                                      <div className="d-flex align-items-center">
                                        <span className="badge bg-secondary me-3" style={{ width: '40px' }}>
                                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                                        </span>
                                        <h6 className="fw-bold mb-0 text-capitalize">{n}</h6>
                                      </div>
                                      <div>
                                        <span className="badge bg-primary me-2">{s} ball</span>
                                        <span className={`badge ${quizMode === 'blitz' ? 'bg-warning' : quizMode === 'survival' ? 'bg-danger' : quizMode === 'marathon' ? 'bg-success' : 'bg-secondary'}`}>
                                          {quizMode}
                                        </span>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Tugmalar */}
                        <div className="text-center">
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="btn btn-primary btn-lg px-5 py-3 fw-bold me-3"
                            onClick={goBackHome}
                          >
                            <FiHome className="me-2" />
                            ASOSIYGA QAYTISH
                          </motion.button>
                          
                          {playerName && (
                            <button 
                              className="btn btn-outline-secondary btn-lg px-5 py-3 fw-bold"
                              onClick={saveGameHistory}
                            >
                              <FiBarChart2 className="me-2" />
                              Natijani saqlash
                            </button>
                          )}
                          
                          {/* Yangi o'yin boshlash */}
                          {!playerName && activeSub && (
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="btn btn-success btn-lg px-5 py-3 fw-bold ms-3"
                              onClick={() => {
                                // Yangi o'yinni boshlash
                                setScore(0);
                                setStreak(0);
                                setCorrectAnswers([]);
                                setTimeBonuses([]);
                                setAchievements([]);
                                setSurvivalLives(3);
                                setMarathonQuestions([]);
                                setQuestionCounter(0);
                                setShuffledQuestions([]);
                                setUsedQuestionIds(new Set());
                                setAllQuestionsAnswered(false);
                                setCurrentShuffledIndex(0);
                                setFeedback(null);
                                setView('quiz_mode');
                              }}
                            >
                              <FiRefreshCw className="me-2" />
                              YANGI O'YIN
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* --- FOOTER (YANGILANDI) --- */}
          <footer className="py-4 px-3 border-top flex-shrink-0" style={{ 
            background: isDarkMode 
              ? `linear-gradient(90deg, #000 0%, ${themeColor}40 100%)` 
              : `linear-gradient(90deg, ${themeColor}20 0%, ${themeColor}40 100%)`,
            borderTop: `3px solid ${themeColor}30`
          }}>
            <div className="container-fluid">
              <div className="row align-items-center g-3 text-center text-md-start">
                <div className="col-md-4">
                  <h5 className="fw-bold mb-1 text-white">🧠 QUIZ MASTER</h5>
                  <p className="small mb-0 opacity-75 text-white">Eng zo'r quiz tizimi (Random tartib)</p>
                </div>
                <div className="col-md-4 text-center">
                  <h6 className="mb-1 small text-white">
                    Holat: <span className="badge bg-warning">{view.toUpperCase()}</span>
                  </h6>
                  <small className='opacity-75 d-block text-white'>
                    O'quvchilar: {players.length} ta | Rejim: {quizMode} (Random) | Vaqt: {timeSettings[quizMode]}s
                  </small>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="d-flex justify-content-center justify-content-md-end gap-2">
                    <button 
                      className="btn btn-sm btn-outline-light rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: '36px', height: '36px' }}
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      title={soundEnabled ? "Ovoz yoqilgan" : "Ovoz o'chirilgan"}
                    >
                      {soundEnabled ? <FiVolume2 size={16} /> : <FiVolumeX size={16} />}
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-light rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: '36px', height: '36px' }}
                      onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    >
                      {notificationsEnabled ? <FiBell size={16} /> : <FiBellOff size={16} />}
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-light rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: '36px', height: '36px' }}
                      onClick={() => setShowBgModal(true)}
                    >
                      🎨
                    </button>
                    {/* Savollarni aralashtirish tugmasi */}
                    {view === 'quiz_mode' && activeSub && (
                      <button 
                        className="btn btn-sm btn-outline-light rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: '36px', height: '36px' }}
                        onClick={reshuffleQuestions}
                        title="Savollarni qayta aralashtirish"
                      >
                        <FiShuffle size={16} />
                      </button>
                    )}
                    <button 
                      className="btn btn-sm btn-outline-light"
                      onClick={() => setSidebarOpen(true)}
                    >
                      ☰ Menu
                    </button>
                  </div>
                  <small className='opacity-75 d-block mt-2 text-white'>
                    &copy; {new Date().getFullYear()} QUIZ MASTER | Premium versiya | Random tartib
                  </small>
                </div>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}