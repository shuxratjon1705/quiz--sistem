import React from 'react';

export default function PlayerStats({ playerName, score, streak, correctAnswers, liveScores, isDarkMode }) {
  const playerRank = Object.entries(liveScores)
    .sort(([, a], [, b]) => b - a)
    .findIndex(([name]) => name === playerName) + 1;

  return (
    <div className={`card shadow-sm border-0 mb-4 ${isDarkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
      <div className="card-body p-3">
        <div className="row align-items-center">
          <div className="col-md-4 text-center mb-3 mb-md-0">
            <div className="display-6">👤</div>
            <h5 className="fw-bold text-capitalize">{playerName}</h5>
            <div className="badge bg-primary">#{playerRank || 1}</div>
          </div>
          
          <div className="col-md-8">
            <div className="row text-center">
              <div className="col-4">
                <div className="fw-bold display-6">{score}</div>
                <small className="text-muted">Umumiy ball</small>
              </div>
              <div className="col-4">
                <div className="fw-bold display-6">{streak}</div>
                <small className="text-muted">Streak</small>
                {streak >= 5 && <div className="badge bg-warning mt-1">🔥 1.3x</div>}
              </div>
              <div className="col-4">
                <div className="fw-bold display-6">{correctAnswers.length}</div>
                <small className="text-muted">To'g'ri javob</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}