import React from 'react';
import { motion } from 'framer-motion';

function QuizModes({ quizMode, setQuizMode, isDarkMode }) {
  const modes = [
    { id: 'normal', name: 'Normal', desc: 'Har bir savol 30 soniya', icon: '📝', color: '#0d6efd' },
    { id: 'blitz', name: 'Blitz', desc: 'Har bir savol 10 soniya', icon: '⚡', color: '#ffc107' },
    { id: 'survival', name: 'Survival', desc: '1 ta xato = game over', icon: '🔥', color: '#dc3545' },
    { id: 'marathon', name: 'Marathon', desc: 'Cheksiz savollar', icon: '🏃', color: '#198754' }
  ];

  return React.createElement('div', { className: 'container my-4' },
    React.createElement('h4', { className: 'fw-bold mb-3' }, 'Quiz Rejimini Tanlang'),
    React.createElement('div', { className: 'row g-3' },
      modes.map((mode) =>
        React.createElement('div', { key: mode.id, className: 'col-6 col-md-3' },
          React.createElement(motion.div, {
            whileHover: { scale: 1.05 },
            whileTap: { scale: 0.95 },
            className: `card border-0 p-3 text-center shadow-sm ${quizMode === mode.id ? 'border-primary border-2' : ''}`,
            style: { 
              backgroundColor: isDarkMode ? '#1a1d20' : '#fff',
              cursor: 'pointer'
            },
            onClick: () => setQuizMode(mode.id)
          },
            React.createElement('div', { className: 'display-4 mb-2' }, mode.icon),
            React.createElement('h6', { className: 'fw-bold' }, mode.name),
            React.createElement('small', { className: 'text-muted' }, mode.desc)
          )
        )
      )
    )
  );
}

export default QuizModes;