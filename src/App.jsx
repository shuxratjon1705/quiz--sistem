import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { db, auth } from './firebase'; 
import { ref, onValue, set, push, remove, update } from "firebase/database";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "firebase/auth";

export default function App() {
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
  const [liveScores, setLiveScores] = useState({}); // JONLI BALLAR UCHUN
  const [newQ, setNewQ] = useState({ text: '', options: ['', '', '', ''], correct: 0 });
  const [newSubName, setNewSubName] = useState('');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timer, setTimer] = useState(0);

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
          
          // Ballarni kuzatish
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

  // --- LOGOUT ---
  const handleLogout = () => {
    signOut(auth);
    setView('auth');
    setUsername('');
    setPassword('');
  };

  const goBackHome = () => {
    setScore(0);
    setGeneratedPin('');
    setPlayerName('');
    setInputPin('');
    setLiveScores({});
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
    if (newQ.text && newQ.options.every(o => o.trim() !== '')) {
      const questionsRef = ref(db, `subjects/${activeSubId}/questions`);
      const autoTime = Math.max(15, Math.floor(newQ.text.length / 5) * 2);
      push(questionsRef, { ...newQ, id: Date.now(), time: autoTime });
      setNewQ({ text: '', options: ['', '', '', ''], correct: 0 });
      alert("Savol saqlandi!");
    }
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
          
          // O'quvchi balini 0 bilan yaratish
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
    if (!playerName) {
      update(ref(db, `games/${generatedPin}`), { status: 'started' });
    }
    setCurrentQIndex(0);
    setTimer(sub.questions[0].time);
    setView('quiz_mode');
  };

  const handleAnswer = (isCorrect) => {
    let newScore = score;
    if (isCorrect) {
      newScore = score + 100;
      setScore(newScore);
    }

    // Ballni Firebase'da yangilash (Live Score uchun)
    if (playerName && generatedPin) {
      set(ref(db, `games/${generatedPin}/scores/${playerName}`), newScore);
    }

    const sub = subjects.find(s => s.id === activeSubId);
    if (currentQIndex < sub.questions.length - 1) {
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      setTimer(sub.questions[nextIdx].time);
    } else {
      setView('results');
    }
  };

  useEffect(() => {
    let interval;
    if (view === 'quiz_mode' && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && view === 'quiz_mode') {
      handleAnswer(false);
    }
    return () => clearInterval(interval);
  }, [timer, view]);

  const activeSub = subjects.find(s => s.id === activeSubId);
  const lightPrimary = "#8C9460";

  return (
    <div className="vh-100 d-flex flex-column" data-bs-theme={isDarkMode ? 'dark' : 'light'} style={{ overflow: 'hidden' }}>
      
      {/* --- NAVBAR --- */}
      <nav className="navbar px-4 flex-shrink-0 shadow" style={{ height: '65px', backgroundColor: isDarkMode ? '#000' : lightPrimary }}>
        <span className="navbar-brand fw-bold text-white" onClick={goBackHome} style={{ cursor: 'pointer' }}>QUIZ MASTER</span>
        <div className="d-flex gap-2">
          {user && <button className="btn btn-sm btn-danger" onClick={handleLogout}>Chiqish</button>}
          <button className="btn btn-sm btn-outline-light rounded-pill px-3" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </nav>

      <div className="flex-grow-1 overflow-auto d-flex flex-column position-relative">
        
        {/* --- AUTH VIEW --- */}
        {view === 'auth' && (
          <div className="m-auto card p-4 shadow-lg border-0" style={{width: '380px', borderRadius: '20px'}}>
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
          <div className="container py-5">
            <h2 className="fw-bold mb-4 border-bottom pb-2">Mening Fanlarim</h2>
            <div className="input-group mb-5 shadow rounded overflow-hidden">
              <input type="text" className="form-control form-control-lg border-0" placeholder="Yangi fan nomi..." value={newSubName} onChange={e => setNewSubName(e.target.value)} />
              <button className="btn px-4 fw-bold text-white border-0" style={{backgroundColor: lightPrimary}} onClick={addSubject}>+ Qo'shish</button>
            </div>
            <div className="row g-4">
              {subjects.map(s => (
                <div key={s.id} className="col-md-4">
                  <div className="card h-100 p-4 shadow border-0" style={{borderRadius: '15px'}}>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h3 className="fw-bold mb-0">{s.name}</h3>
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
          <div className="m-auto card p-4 shadow-lg border-0" style={{width: '500px'}}>
            <h4 className="mb-4 text-center fw-bold">"{activeSub?.name}"</h4>
            <input type="text" className="form-control mb-3" placeholder="Savol matni" value={newQ.text} onChange={e => setNewQ({...newQ, text: e.target.value})} />
            {newQ.options.map((opt, i) => (
              <div key={i} className="input-group mb-2">
                <input type="text" className="form-control" placeholder={`Variant ${i+1}`} value={opt} onChange={e => {
                  let opts = [...newQ.options]; opts[i] = e.target.value; setNewQ({...newQ, options: opts});
                }} />
                <div className="input-group-text">
                  <input type="radio" name="correct" checked={newQ.correct === i} onChange={() => setNewQ({...newQ, correct: i})} />
                </div>
              </div>
            ))}
            <button className="btn btn-success w-100 mt-4" onClick={handleAddQuestion}>SAQLASH</button>
            <button className="btn btn-link w-100 mt-2" onClick={() => setView('teacher')}>Orqaga</button>
          </div>
        )}

        {/* --- STUDENT JOIN --- */}
        {view === 'student_name' && (
          <div className="m-auto card p-5 shadow-lg border-0 text-center" style={{ width: '420px', borderRadius: '25px'}}>
            <h2 className="fw-bold mb-4">O'quvchi</h2>
            <input type="text" className="form-control mb-3 text-center" placeholder="Ismingiz" value={playerName} onChange={e => setPlayerName(e.target.value)} />
            <input type="text" className="form-control mb-4 text-center fs-3" placeholder="PIN" maxLength="6" value={inputPin} onChange={e => setInputPin(e.target.value)} />
            <button className="btn btn-success btn-lg w-100 shadow" onClick={joinGame}>KIRISH</button>
            <button className="btn btn-link mt-2" onClick={() => setView('auth')}>Orqaga</button>
          </div>
        )}

        {/* --- LOBBY --- */}
        {view === 'lobby' && (
          <div className="container-fluid h-100 d-flex flex-column text-center text-white" style={{backgroundColor: lightPrimary}}>
            <h1 className="display-1 fw-bold mt-5">{generatedPin}</h1>
            <p className="fs-2 mb-5">O'yin kodi</p>
            <div className="flex-grow-1 p-5">
              <div className="row g-4 justify-content-center">
                {players.length === 0 ? <p className="fs-4">Kutilmoqda...</p> : 
                  players.map((p, i) => (
                  <div key={i} className="col-md-3">
                    <div className="card p-3 fw-bold rounded-pill shadow border-0" 
                         style={{ backgroundColor: '#ffffff', color: '#212529' }}>
                      {p}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {!playerName && (
              <div className="pb-5">
                <button className="btn btn-light btn-xl px-5 py-3 fs-3 shadow-lg fw-bold rounded-pill" onClick={startActualGame}>BOSHLASH</button>
              </div>
            )}
            {playerName && <p className="fs-3 pb-5">O'qituvchini kuting...</p>}
          </div>
        )}

        {/* --- QUIZ MODE (LIVE SCORES QO'SHILDI) --- */}
        {view === 'quiz_mode' && activeSub && (
          <div className="container py-4">
            <div className="row">
              <div className={!playerName ? "col-md-8" : "col-md-12"}>
                <div className="text-center">
                  <div className="badge bg-danger mb-4 fs-4 px-4 py-2 rounded-pill">Vaqt: {timer}</div>
                  <h2 className="display-5 fw-bold mb-5">{activeSub.questions[currentQIndex]?.text}</h2>
                  
                  {playerName && (
                    <div className="row g-4">
                      {activeSub.questions[currentQIndex]?.options.map((opt, i) => (
                        <div className="col-md-6" key={i}>
                          <button className="btn btn-outline-primary btn-lg w-100 py-4 fs-2 fw-bold shadow-sm" 
                            onClick={() => handleAnswer(i === activeSub.questions[currentQIndex].correct)}>
                            {opt}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {!playerName && (
                    <div className="alert alert-light border shadow-sm fs-4 py-5">
                      🚀 O'yin ketmoqda... O'quvchilar javob bermoqda.
                    </div>
                  )}
                </div>
              </div>

              {/* O'QITUVCHI UCHUN JONLI BALLAR JADVALI */}
              {!playerName && (
                <div className="col-md-4">
                  <div className="card shadow-sm border-0 p-3 h-100" style={{borderRadius: '20px'}}>
                    <h3 className="fw-bold mb-4 text-center">Live Ballar 📊</h3>
                    <div className="list-group overflow-auto" style={{maxHeight: '400px'}}>
                      {Object.entries(liveScores)
                        .sort(([,a], [,b]) => b - a)
                        .map(([name, scoreVal]) => (
                          <div key={name} className="list-group-item d-flex justify-content-between align-items-center mb-2 rounded shadow-sm border-0" style={{backgroundColor: '#f8f9fa', color: '#333'}}>
                            <span className="fw-bold text-capitalize">{name}</span>
                            <span className="badge bg-primary rounded-pill fs-6">{scoreVal} ball</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- RESULTS --- */}
        {view === 'results' && (
          <div className="m-auto text-center p-5 card shadow-lg border-0" style={{borderRadius: '25px'}}>
            <h1 className="display-1 fw-bold text-success mb-4">TAMOM!</h1>
            <h3 className="mb-4">Balingiz: <span className="text-primary">{score}</span></h3>
            <button className="btn btn-primary btn-lg px-5 fw-bold" onClick={goBackHome}>ASOSIY SAHIFAGA QAYTISH</button>
          </div>
        )}
      </div>

      <footer className="py-4 px-5 border-top flex-shrink-0" style={{ backgroundColor: isDarkMode ? '#000' : lightPrimary, color: '#fff' }}>
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col-md-4 text-center text-md-start">
              <h5 className="fw-bold mb-1 text-white">Shuxratjon</h5>
              <p className="small mb-0 opacity-75">Dasturchi va loyiha asoschisi</p>
            </div>
            <div className="col-md-4 text-center text-md-end small opacity-75">&copy; 2026 QUIZ MASTER.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}