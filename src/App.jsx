import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { db } from './firebase'; // Firebase ulanish faylingiz
import { ref, onValue, set, push, remove, update } from "firebase/database";

export default function App() {
  // --- HOLATLAR ---
  const [subjects, setSubjects] = useState([]);
  const [view, setView] = useState('landing');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeSubId, setActiveSubId] = useState(null);
  const [generatedPin, setGeneratedPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [players, setPlayers] = useState([]); 
  const [score, setScore] = useState(0);
  const [newQ, setNewQ] = useState({ text: '', options: ['', '', '', ''], correct: 0 });
  const [newSubName, setNewSubName] = useState('');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timer, setTimer] = useState(0);

  // --- FIREBASE'DAN FANLARNI VA O'YIN HOLATINI O'QISH ---
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
        setSubjects(list);
      } else {
        setSubjects([]);
      }
    });

    // O'yin PIN va o'quvchilarni kuzatish (Lobby uchun)
    if (generatedPin) {
      const gameRef = ref(db, `games/${generatedPin}`);
      onValue(gameRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          if (data.players) setPlayers(Object.values(data.players));
          if (data.status === 'started' && view === 'lobby' && playerName) {
            startActualGame(); // O'quvchi uchun o'yinni boshlash
          }
        }
      });
    }
  }, [generatedPin, view]);

  // --- FUNKSIYALAR ---
  const addSubject = () => {
    if (newSubName.trim()) {
      const subjectsRef = ref(db, 'subjects');
      push(subjectsRef, { name: newSubName, questions: [] });
      setNewSubName('');
    }
  };

  const handleAddQuestion = () => {
    if (newQ.text && newQ.options.every(o => o.trim() !== '')) {
      const questionsRef = ref(db, `subjects/${activeSubId}/questions`);
      const autoTime = Math.max(15, Math.floor(newQ.text.length / 5) * 2);
      push(questionsRef, { ...newQ, id: Date.now(), time: autoTime });
      setNewQ({ text: '', options: ['', '', '', ''], correct: 0 });
      alert("Savol bazaga qo'shildi!");
    }
  };

  const startLobby = (subId) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedPin(pin);
    setActiveSubId(subId);
    // Bazada yangi o'yin seansini yaratish
    set(ref(db, `games/${pin}`), {
      subjectId: subId,
      status: 'waiting',
      players: {}
    });
    setView('lobby');
  };

  const joinGame = () => {
    if (playerName && inputPin) {
      const gameRef = ref(db, `games/${inputPin}`);
      onValue(gameRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // O'zini o'yinchi sifatida qo'shish
          const newPlayerRef = push(ref(db, `games/${inputPin}/players`));
          set(newPlayerRef, playerName);
          setGeneratedPin(inputPin);
          setActiveSubId(data.subjectId);
          setView('lobby');
        } else {
          alert("Bunday PIN topilmadi!");
        }
      }, { onlyOnce: true });
    }
  };

  const startActualGame = () => {
    const sub = subjects.find(s => s.id === activeSubId);
    if (!sub) return;
    
    // Agar o'qituvchi bo'lsa, bazada statusni o'zgartiradi
    if (!playerName) {
      update(ref(db, `games/${generatedPin}`), { status: 'started' });
    }
    
    setCurrentQIndex(0);
    setTimer(sub.questions[0].time);
    setView('quiz_mode');
  };

  const handleAnswer = (isCorrect) => {
    if (isCorrect) setScore(s => s + 100);
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
  const lightBg = "#ffffff";

  return (
    <div className={`vh-100 d-flex flex-column ${isDarkMode ? 'bg-dark text-white' : ''}`} 
         style={{ overflow: 'hidden', backgroundColor: isDarkMode ? '' : lightBg, color: isDarkMode ? '' : '#333' }}>
      
      <nav className="navbar px-4 flex-shrink-0 shadow" style={{ height: '65px', backgroundColor: isDarkMode ? '#000' : lightPrimary }}>
        <span className="navbar-brand fw-bold text-white" onClick={() => setView('landing')} style={{ cursor: 'pointer' }}>QUIZ MASTER</span>
        <button className={`btn btn-sm ${isDarkMode ? 'btn-outline-info' : 'btn-outline-light rounded-pill px-3'}`} onClick={() => setIsDarkMode(!isDarkMode)}>
          {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </nav>

      <div className="flex-grow-1 overflow-auto d-flex flex-column">
        {view === 'landing' && (
          <div className="m-auto text-center">
            <h1 className="display-1 fw-bold mb-4" style={{color: isDarkMode ? '' : lightPrimary}}>Bilimlar jangi</h1>
            <div className="d-flex gap-4 justify-content-center">
              <button className="btn btn-lg px-5 py-3 shadow-lg fw-bold" style={{backgroundColor: isDarkMode ? '#0d6efd' : lightPrimary, color: '#fff', border: 'none'}} onClick={() => setView('teacher')}>👨‍🏫 O'QITUVCHI</button>
              <button className="btn btn-success btn-lg px-5 py-3 shadow-lg fw-bold" onClick={() => setView('student_name')}>🎓 O'QUVCHI</button>
            </div>
          </div>
        )}

        {view === 'teacher' && (
          <div className="container py-5">
            <h2 className="fw-bold mb-4 border-bottom pb-2">Mening Fanlarim (Baza)</h2>
            <div className="input-group mb-5 shadow">
              <input type="text" className="form-control form-control-lg" placeholder="Yangi fan nomi..." value={newSubName} onChange={e => setNewSubName(e.target.value)} />
              <button className="btn px-4 fw-bold text-white" style={{backgroundColor: lightPrimary}} onClick={addSubject}>+ Qo'shish</button>
            </div>
            <div className="row g-4">
              {subjects.map(s => (
                <div key={s.id} className="col-md-4">
                  <div className="card h-100 p-4 shadow border-0" style={{borderRadius: '15px', backgroundColor: isDarkMode ? '#2b3035' : '#f8f9fa'}}>
                    <div className="d-flex justify-content-between">
                      <h3 className={`fw-bold ${isDarkMode ? 'text-white' : 'text-dark'}`}>{s.name}</h3>
                      <button className="btn btn-sm btn-danger rounded-circle" onClick={() => remove(ref(db, `subjects/${s.id}`))}>×</button>
                    </div>
                    <p className="text-muted mb-4">Savollar: {s.questions.length}</p>
                    <button className="btn btn-outline-primary mb-3 py-2 fw-bold" onClick={() => { setActiveSubId(s.id); setView('add_questions'); }}>Savollar tuzish</button>
                    <button className="btn btn-danger w-100 py-2 fw-bold shadow-sm" onClick={() => startLobby(s.id)}>LIVE START</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'add_questions' && (
          <div className="m-auto card p-4 shadow-lg border-0" style={{width: '500px', backgroundColor: isDarkMode ? '#2b3035' : '#fff'}}>
            <h4 className="mb-4 text-center fw-bold">"{activeSub?.name}" uchun savol</h4>
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
            <button className="btn btn-success w-100 mt-4 py-2 fw-bold" onClick={handleAddQuestion}>BAZAGA SAQLASH</button>
            <button className="btn btn-link w-100 mt-2 text-muted" onClick={() => setView('teacher')}>Orqaga qaytish</button>
          </div>
        )}

        {view === 'student_name' && (
          <div className="m-auto card p-5 shadow-lg border-0 text-center" style={{ width: '420px', borderRadius: '25px', backgroundColor: isDarkMode ? '#2b3035' : '#fff' }}>
            <h2 className="fw-bold mb-4">Kirish</h2>
            <input type="text" className="form-control mb-3 text-center py-2" placeholder="Ismingizni yozing" value={playerName} onChange={e => setPlayerName(e.target.value)} />
            <input type="text" className="form-control mb-4 text-center fs-3 py-2" placeholder="PIN-KOD" maxLength="6" value={inputPin} onChange={e => setInputPin(e.target.value)} />
            <button className="btn btn-success btn-lg w-100 fw-bold shadow" onClick={joinGame}>KIRISH</button>
          </div>
        )}

        {view === 'lobby' && (
          <div className="container-fluid h-100 d-flex flex-column text-center text-white" style={{backgroundColor: lightPrimary}}>
            <h1 className="display-1 fw-bold mt-5">{generatedPin}</h1>
            <p className="fs-2 mb-5 opacity-75">O'yin PIN-kodi</p>
            <div className="flex-grow-1 p-5">
              <div className="row g-4 justify-content-center">
                {players.length === 0 ? <p className="fs-4">O'quvchilar kutilmoqda...</p> : 
                  players.map((p, i) => (
                  <div key={i} className="col-md-3"><div className="card p-3 bg-white text-dark fw-bold fs-4 rounded-pill shadow-lg border-0">{p}</div></div>
                ))}
              </div>
            </div>
            {!playerName && (
              <div className="pb-5">
                <button className="btn btn-light btn-xl px-5 py-3 fs-3 shadow-lg fw-bold rounded-pill" onClick={startActualGame}>O'YINNI BOSHLASH</button>
              </div>
            )}
            {playerName && <p className="fs-3 pb-5">O'qituvchi o'yinni boshlashini kuting...</p>}
          </div>
        )}

        {view === 'quiz_mode' && activeSub && (
          <div className="container py-5 text-center">
            <div className="badge bg-danger mb-4 fs-4 px-4 py-2 rounded-pill">Vaqt: {timer}</div>
            <h2 className="display-4 fw-bold mb-5">{activeSub.questions[currentQIndex]?.text}</h2>
            <div className="row g-4">
              {activeSub.questions[currentQIndex]?.options.map((opt, i) => (
                <div className="col-md-6" key={i}>
                  <button className="btn btn-outline-primary btn-lg w-100 py-4 fs-2 fw-bold shadow-sm" onClick={() => handleAnswer(i === activeSub.questions[currentQIndex].correct)}>
                    {opt}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'results' && (
          <div className="m-auto text-center p-5 card shadow-lg border-0" style={{borderRadius: '25px', backgroundColor: isDarkMode ? '#2b3035' : '#fff'}}>
            <h1 className="display-1 fw-bold text-success mb-4">TAMOM!</h1>
            <h3 className="mb-4">Sizning balingiz: <span className="text-primary">{score}</span></h3>
            <button className="btn btn-primary btn-lg px-5 fw-bold" onClick={() => { setView('landing'); setScore(0); setGeneratedPin(''); }}>BOSH SAHIFA</button>
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
            <div className="col-md-4 text-center">
              <a href="mailto:shuxratjonmaxmutjanov514@gmail.com" className="text-white text-decoration-none small fw-bold">shuxratjonmaxmutjanov514@gmail.com</a>
            </div>
            <div className="col-md-4 text-center text-md-end small opacity-75">&copy; 2026 QUIZ MASTER. Barcha huquqlar himoyalangan.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}


