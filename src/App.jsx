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

  const [newQ, setNewQ] = useState({
    text: '',
    options: ['', '', '', ''],
    correct: 0,
    time: 30,
    points: 100
  });
  const [newSubName, setNewSubName] = useState('');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timer, setTimer] = useState(0);

  // --- Kirish taymeri ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 4700); 
    return () => clearTimeout(timer);
  }, []);

  // --- OVOZ FUNKSIYASI ---
  const playSound = (type) => {
    try {
      const audio = new Audio(type === 'correct' ? '/correct.mp3' : '/wrong.mp3');
      audio.play();
    } catch (e) {
      console.log("Audio xatolik:", e);
    }
  };

  // --- AUTH OBSERVER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && view === 'auth') setView('teacher');
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
          if (data.players) setPlayers(Object.values(data.players));
          if (data.scores) setLiveScores(data.scores);

          if (data.status === 'started' && view === 'lobby' && playerName) {
            const currentSub = subjects.find(s => s.id === data.subjectId);
            if (currentSub && currentSub.questions.length > 0) {
              setActiveSubId(data.subjectId);
              setCurrentQIndex(0);
              setTimer(currentSub.questions[0].time);
              setView('quiz_mode');
            }
          }
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
        alert("Tabriklaymiz! Akkaunt ochildi.");
      } else {
        await signInWithEmailAndPassword(auth, virtualEmail, password);
      }
    } catch (err) {
      alert("Xatolik yuz berdi! Username band bo'lishi yoki parol xato bo'lishi mumkin.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setView('auth');
    setUsername('');
    setPassword('');
  };

  const goBackHome = () => {
    setScore(0);
    setStreak(0);
    setGeneratedPin('');
    setPlayerName('');
    setInputPin('');
    setLiveScores({});
    setFeedback(null);
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
        ownerId: user.uid
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
        points: parseInt(newQ.points) || 100
      };

      const updatedQuestions = [...(activeSub.questions || []), questionData];
      set(ref(db, `subjects/${activeSubId}/questions`), updatedQuestions);

      setNewQ({ text: '', options: ['', '', '', ''], correct: 0, time: 30, points: 100 });
    } else {
      alert("Iltimos, hamma maydonlarni to'ldiring!");
    }
  };

  // --- SAVOLNI O'CHIRISH FUNKSIYASI ---
  const deleteQuestion = (index) => {
    const activeSub = subjects.find(s => s.id === activeSubId);
    const updatedQuestions = activeSub.questions.filter((_, i) => i !== index);
    set(ref(db, `subjects/${activeSubId}/questions`), updatedQuestions);
  };

  // --- GAME LOGIC ---
  const startLobby = (subId) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedPin(pin);
    setActiveSubId(subId);
    set(ref(db, `games/${pin}`), { subjectId: subId, status: 'waiting', players: {}, scores: {} });
    setView('lobby');
  };

  const joinGame = () => {
    if (playerName && inputPin) {
      const gameRef = ref(db, `games/${inputPin}`);
      onValue(gameRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const newPlayerRef = push(ref(db, `games/${inputPin}/players`));
          set(newPlayerRef, playerName);
          set(ref(db, `games/${inputPin}/scores/${playerName}`), 0);
          setGeneratedPin(inputPin);
          setActiveSubId(data.subjectId);
          setView('lobby');
        } else {
          alert("PIN xato!");
        }
      }, { onlyOnce: true });
    }
  };

  const startActualGame = () => {
    const sub = subjects.find(s => s.id === activeSubId);
    if (!sub || sub.questions.length === 0) {
      alert("Savollar mavjud emas!");
      return;
    }
    update(ref(db, `games/${generatedPin}`), { status: 'started' });
    setCurrentQIndex(0);
    setTimer(sub.questions[0].time);
    setView('quiz_mode');
  };

  // --- YANGILANGAN JAVOB BERISH LOGIKASI (STREAK + OVOZ) ---
  const handleAnswer = (isCorrect) => {
    if (feedback) return; 

    const activeSub = subjects.find(s => s.id === activeSubId);
    let newTotalScore = score;

    setFeedback(isCorrect ? 'correct' : 'wrong');
    playSound(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);

      let currentPoints = activeSub.questions[currentQIndex].points || 100;
      
      // 5 tadan oshsa 1.3 barobar ko'p ball
      if (newStreak >= 5) {
        currentPoints = Math.round(currentPoints * 1.3);
      }

      newTotalScore = score + currentPoints;
      setScore(newTotalScore);

      if (playerName && generatedPin) {
        update(ref(db, `games/${generatedPin}/scores`), {
          [playerName]: newTotalScore
        });
      }
    } else {
      setStreak(0); // Xato bo'lsa streak nolga tushadi
    }

    setTimeout(() => {
      setFeedback(null);
      if (currentQIndex + 1 < activeSub.questions.length) {
        const nextIndex = currentQIndex + 1;
        setCurrentQIndex(nextIndex);
        setTimer(activeSub.questions[nextIndex].time || 30);
      } else {
        setView('results');
      }
    }, 1500);
  };

  useEffect(() => {
    let interval;
    if (view === 'quiz_mode' && timer > 0 && !feedback) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && view === 'quiz_mode') {
      handleAnswer(false);
    }
    return () => clearInterval(interval);
  }, [timer, view, feedback]);

  const activeSub = subjects.find(s => s.id === activeSubId);
  const lightPrimary = "#8C9460";

  // Podium uchun g'oliblarni hisoblash
  const sortedForPodium = Object.entries(liveScores).sort(([, a], [, b]) => b - a).slice(0, 3);

  return (
    <div className="vh-100 d-flex flex-column" data-bs-theme={isDarkMode ? 'dark' : 'light'} style={{ overflowX: 'hidden' }}>

      {/* SPLASH SCREEN */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
            style={{
              backgroundColor: isDarkMode ? '#000' : '#fff',
              zIndex: 9999,
              textAlign: 'center'
            }}
          >
            <motion.h1
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1 }}
              style={{ color: '#8C9460', fontWeight: 'bold' }}
            >
              QUIZ MASTER
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="fs-4 px-3 text-body-secondary"
            >
              Salom, Shuxratjonning savol-javob tizimiga xush kelibsiz!
            </motion.p>

            <div className="mt-4 spinner-border" style={{ color: '#8C9460' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoading && (
        <>
          {/* --- NAVBAR --- */}
          <nav className="navbar px-3 px-md-4 flex-shrink-0 shadow" style={{ minHeight: '65px', backgroundColor: isDarkMode ? '#000' : lightPrimary }}>
            <span className="navbar-brand fw-bold text-white fs-4" onClick={goBackHome} style={{ cursor: 'pointer' }}>QUIZ MASTER</span>
            <div className="d-flex gap-2">
              {user && <button className="btn btn-sm btn-danger" onClick={handleLogout}>Chiqish</button>}
              <button className="btn btn-sm btn-outline-light rounded-pill px-2 px-md-3" onClick={() => setIsDarkMode(!isDarkMode)}>
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </nav>

          <div className="flex-grow-1 overflow-auto d-flex flex-column position-relative">

            {/* --- AUTH VIEW --- */}
            {view === 'auth' && (
              <div className="m-auto card p-4 shadow-lg border-0 mx-2 mx-md-auto" style={{ width: '95%', maxWidth: '380px', borderRadius: '20px' }}>
                <h2 className="text-center fw-bold mb-4">{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
                <input type="text" className="form-control mb-3" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                <input type="password" className="form-control mb-4" placeholder="Parol" value={password} onChange={e => setPassword(e.target.value)} />
                <button className="btn btn-primary w-100 py-2 fw-bold mb-3 shadow-sm" onClick={handleAuth}>
                  {isSignUp ? 'RO‘YXATDAN O‘TISH' : 'KIRISH'}
                </button>
                <div className="text-center mb-3">
                  <button className="btn btn-link btn-sm text-decoration-none" onClick={() => setIsSignUp(!isSignUp)}>
                    {isSignUp ? "Akkauntingiz bormi? Sign In" : "Yangi akkaunt? Sign Up"}
                  </button>
                </div>
                <div className="border-top pt-3 text-center">
                  <button className="btn btn-outline-success rounded-pill w-100 fw-bold" onClick={() => setView('student_name')}>
                    👨‍🎓 Men o'quvchiman
                  </button>
                </div>
              </div>
            )}

            {/* --- TEACHER VIEW --- */}
            {view === 'teacher' && user && (
              <div className="container py-4 py-md-5">
                <h2 className="fw-bold mb-4 border-bottom pb-2">Mening Fanlarim</h2>
                <div className="input-group mb-4 mb-md-5 shadow rounded overflow-hidden">
                  <input type="text" className="form-control form-control-lg border-0 fs-6 fs-md-5" placeholder="Yangi fan..." value={newSubName} onChange={e => setNewSubName(e.target.value)} />
                  <button className="btn px-3 px-md-4 fw-bold text-white border-0" style={{ backgroundColor: lightPrimary }} onClick={addSubject}>+ Qo'shish</button>
                </div>
                <div className="row g-3 g-md-4">
                  {subjects.map(s => (
                    <div key={s.id} className="col-12 col-md-4">
                      <div className="card h-100 p-3 p-md-4 shadow border-0" style={{ borderRadius: '15px' }}>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h3 className="fw-bold mb-0 text-truncate" style={{ maxWidth: '80%' }}>{s.name}</h3>
                          <button className="btn btn-danger btn-sm rounded-circle" onClick={() => remove(ref(db, `subjects/${s.id}`))}>×</button>
                        </div>
                        <p className="text-muted">Savollar: {s.questions.length}</p>
                        <div className="mt-auto">
                          <button className="btn btn-outline-primary w-100 mb-2" onClick={() => { setActiveSubId(s.id); setView('add_questions'); }}>Tahrirlash</button>
                          <button className="btn btn-danger w-100 shadow-sm" onClick={() => startLobby(s.id)}>LIVE START</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- ADD QUESTIONS --- */}
            {view === 'add_questions' && (
              <div className="m-auto" style={{ width: '95%', maxWidth: '480px', zIndex: 1000 }}>
                <div className="card shadow-lg border-0" style={{ borderRadius: '15px', backgroundColor: isDarkMode ? '#1a1d20' : '#fff' }}>
                  <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom border-secondary">
                    <span className="fw-bold small text-uppercase">Savollar Boshqaruvi</span>
                    <button className="btn-close btn-close-white" onClick={() => setView('teacher')}></button>
                  </div>
                  <div className="card-body p-3">
                    <div className="mb-3">
                      <label className="small text-muted mb-1">Savol matni:</label>
                      <textarea className="form-control bg-dark text-white border-secondary small" placeholder="Savolni kiriting..." style={{ minHeight: '60px' }} value={newQ.text} onChange={e => setNewQ({ ...newQ, text: e.target.value })} />
                    </div>
                    {newQ.options.map((opt, i) => (
                      <div key={i} className="mb-2">
                        <div className="input-group input-group-sm rounded border border-secondary">
                          <input type="text" className="form-control bg-dark text-white border-0 py-1" placeholder={`Variant ${i + 1}`} value={opt} onChange={e => {
                            let opts = [...newQ.options];
                            opts[i] = e.target.value;
                            setNewQ({ ...newQ, options: opts });
                          }} />
                          <div className="input-group-text bg-dark border-0">
                            <input type="radio" className="form-check-input mt-0" checked={newQ.correct === i} onChange={() => setNewQ({ ...newQ, correct: i })} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="row g-2 mt-2">
                      <div className="col-6">
                        <label className="small text-muted">Vaqt (s):</label>
                        <input type="number" className="form-control form-control-sm bg-dark text-white" value={newQ.time} onChange={e => setNewQ({ ...newQ, time: e.target.value })} />
                      </div>
                      <div className="col-6">
                        <label className="small text-muted">Ball:</label>
                        <input type="number" className="form-control form-control-sm bg-dark text-white" value={newQ.points} onChange={e => setNewQ({ ...newQ, points: e.target.value })} />
                      </div>
                    </div>
                    <button className="btn btn-sm btn-success w-100 fw-bold mt-3" onClick={handleAddQuestion}>SAVOLNI QO'SHISH</button>

                    {/* SAVOLLAR RO'YXATI VA O'CHIRISH */}
                    <div className="mt-4 pt-2 border-top">
                      <h6 className="small fw-bold">Fan savollari:</h6>
                      <div className="overflow-auto" style={{ maxHeight: '150px' }}>
                        {activeSub?.questions?.map((q, idx) => (
                          <div key={idx} className="d-flex justify-content-between align-items-center bg-black bg-opacity-25 rounded p-2 mb-1">
                            <span className="small text-truncate" style={{ maxWidth: '80%' }}>{idx + 1}. {q.text}</span>
                            <button className="btn btn-sm btn-danger py-0" onClick={() => deleteQuestion(idx)}>🗑</button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline-secondary w-100 mt-2" onClick={() => setView('teacher')}>Orqaga</button>
                  </div>
                </div>
              </div>
            )}

            {/* --- STUDENT JOIN --- */}
            {view === 'student_name' && (
              <div className="m-auto card p-4 p-md-5 shadow-lg border-0 text-center mx-2 mx-md-auto" style={{ width: '95%', maxWidth: '420px', borderRadius: '25px' }}>
                <h2 className="fw-bold mb-4">O'quvchi</h2>
                <input type="text" className="form-control mb-3 text-center" style={{ color: isDarkMode ? "#fff" : "#000" }} placeholder="Ismingiz" value={playerName} onChange={e => setPlayerName(e.target.value)} />
                <input type="text" className="form-control mb-4 text-center fs-3" placeholder="PIN" maxLength="6" value={inputPin} onChange={e => setInputPin(e.target.value)} />
                <button className="btn btn-success btn-lg w-100 shadow" onClick={joinGame}>KIRISH</button>
                <button className="btn btn-link mt-2" onClick={() => setView('auth')}>Orqaga</button>
              </div>
            )}

            {/* --- LOBBY --- */}
            {view === 'lobby' && (
              <div className="container-fluid h-100 d-flex flex-column text-center text-white p-0" style={{ backgroundColor: lightPrimary }}>
                <h1 className="display-1 fw-bold mt-4">{generatedPin}</h1>
                <p className="fs-4">O'yin kodi</p>
                <div className="flex-grow-1 p-3 overflow-auto">
                  <div className="row g-2 justify-content-center">
                    {players.length === 0 ? <p>Kutilmoqda...</p> :
                      players.map((p, i) => (
                        <div key={i} className="col-6 col-md-3">
                          <div className="card p-2 fw-bold rounded-pill shadow border-0 text-dark">
                            {p}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="pb-5 px-3">
                  {!playerName ? (
                    <button className="btn btn-light btn-lg px-5 py-3 fs-3 fw-bold rounded-pill" onClick={startActualGame}>BOSHLASH</button>
                  ) : <p className="fs-5">O'qituvchini kuting...</p>}
                </div>
              </div>
            )}

            {/* --- QUIZ MODE --- */}
            {view === 'quiz_mode' && activeSub && (
              <div className="container py-4">
                <div className="row g-4">
                  <div className={!playerName ? "col-lg-8" : "col-12"}>
                    <div className="text-center">
                      <div className="badge bg-danger mb-2 fs-4 px-4 py-2 rounded-pill shadow">Vaqt: {timer}</div>
                      {streak >= 5 && <div className="text-warning fw-bold mb-3">🔥 1.3x BALL BONUFI!</div>}
                      
                      <AnimatePresence mode="wait">
                        <motion.h2 key={currentQIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="display-5 fw-bold mb-5">
                          {activeSub.questions[currentQIndex]?.text}
                        </motion.h2>
                      </AnimatePresence>

                      {playerName && (
                        <div className="row g-4">
                          {activeSub.questions[currentQIndex]?.options.map((opt, i) => (
                            <div key={i} className="col-12 col-md-6">
                              <button
                                disabled={!!feedback}
                                className={`btn btn-lg w-100 py-4 fs-4 fw-bold shadow-sm ${feedback && i === activeSub.questions[currentQIndex].correct ? 'btn-success scale-105' : feedback === 'wrong' && feedback === i ? 'btn-danger' : 'btn-outline-primary'}`}
                                onClick={() => handleAnswer(i === activeSub.questions[currentQIndex].correct)}>
                                {opt}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {!playerName && (
                        <div className="alert alert-light border shadow-sm fs-4 py-5">🚀 O'yin ketmoqda... O'quvchilar javob bermoqda.</div>
                      )}
                    </div>
                  </div>

                  {!playerName && (
                    <div className="col-lg-4">
                      <div className="card shadow-sm border-0 p-3 h-100" style={{ borderRadius: '20px' }}>
                        <h3 className="fw-bold mb-4 text-center">Live Ballar 📊</h3>
                        <div className="list-group overflow-auto" style={{ maxHeight: '400px' }}>
                          {Object.entries(liveScores).sort(([, a], [, b]) => b - a).map(([name, scoreVal]) => (
                            <div key={name} className="list-group-item d-flex justify-content-between align-items-center mb-2 rounded shadow-sm border-0 bg-light text-dark">
                              <span className="fw-bold text-capitalize">{name}</span>
                              <span className="badge bg-primary rounded-pill">{scoreVal} ball</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- RESULTS + PODIUM --- */}
            {view === 'results' && (
              <div className="m-auto text-center p-4 p-md-5 card shadow-lg border-0 mx-2 mx-md-auto" style={{ borderRadius: '25px', width: '95%', maxWidth: '600px' }}>
                <h1 className="display-4 fw-bold text-success mb-3">TAMOM!</h1>
                
                {/* PODIUM QISMI */}
                <div className="d-flex justify-content-center align-items-end gap-2 mb-4 mt-3" style={{ height: '180px' }}>
                   {sortedForPodium[1] && (
                     <motion.div initial={{ height: 0 }} animate={{ height: '100px' }} className="bg-secondary text-white p-2 rounded-top shadow" style={{ width: '80px' }}>
                       <div className="small text-truncate">{sortedForPodium[1][0]}</div>
                       <div className="fw-bold">2</div>
                     </motion.div>
                   )}
                   {sortedForPodium[0] && (
                     <motion.div initial={{ height: 0 }} animate={{ height: '140px' }} className="bg-warning text-dark p-2 rounded-top shadow" style={{ width: '100px' }}>
                       <div className="small text-truncate">{sortedForPodium[0][0]}</div>
                       <div className="fw-bold">🥇 1</div>
                     </motion.div>
                   )}
                   {sortedForPodium[2] && (
                     <motion.div initial={{ height: 0 }} animate={{ height: '80px' }} className="bg-primary text-white p-2 rounded-top shadow" style={{ width: '80px' }}>
                       <div className="small text-truncate">{sortedForPodium[2][0]}</div>
                       <div className="fw-bold">3</div>
                     </motion.div>
                   )}
                </div>

                {playerName ? (
                  <h3 className="mb-4">Sizning natijangiz: <span className="text-primary">{score} ball</span></h3>
                ) : (
                  <div className="mb-4 overflow-auto" style={{maxHeight: '200px'}}>
                    {Object.entries(liveScores).sort(([, a], [, b]) => b - a).map(([n, s]) => (
                      <div key={n} className="d-flex justify-content-between border-bottom py-2">
                        <span className="text-capitalize">{n}</span><b>{s} ball</b>
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn btn-primary btn-lg w-100 fw-bold rounded-pill shadow" onClick={goBackHome}>ASOSIYGA QAYTISH</button>
              </div>
            )}
          </div>

          {/* --- FOOTER --- */}
          <footer className="py-4 px-3 border-top flex-shrink-0" style={{ backgroundColor: isDarkMode ? '#000' : lightPrimary, color: '#fff' }}>
            <div className="container-fluid">
              <div className="row align-items-center g-3 text-center text-md-start">
                <div className="col-md-4">
                  <h5 className="fw-bold mb-1">Shuxratjon</h5>
                  <p className="small mb-0 opacity-75">Dasturchi va loyiha asoschisi</p>
                </div>
                <div className="col-md-4 text-center">
                  <h6 className="mb-1 small">Bog'lanish: shuxratjonmaxmutjoanv514@gmail.com</h6>
                  <small className='opacity-75 d-block'>Telegram: @makhmudjanov_sh</small>
                </div>
                <div className="col-md-4 text-md-end small opacity-75">&copy; 2026 QUIZ MASTER.</div>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}