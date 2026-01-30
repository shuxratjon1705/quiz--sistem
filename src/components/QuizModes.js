import React from 'react';
import { motion } from 'framer-motion';
import './QuizModes.css'; // CSS faylini import qilamiz

function QuizModes({ quizMode, setQuizMode, isDarkMode, timeSettings, setTimeSettings }) {
  const modes = [
    { 
      id: 'normal', 
      name: 'Normal', 
      desc: 'Har bir savol 30 soniya', 
      icon: '📝', 
      color: '#0d6efd',
      defaultTime: 30
    },
    { 
      id: 'blitz', 
      name: 'Blitz', 
      desc: 'Har bir savol 10 soniya', 
      icon: '⚡', 
      color: '#ffc107',
      defaultTime: 10
    },
    { 
      id: 'survival', 
      name: 'Survival', 
      desc: '1 ta xato = game over', 
      icon: '🔥', 
      color: '#dc3545',
      defaultTime: 15
    },
    { 
      id: 'marathon', 
      name: 'Marathon', 
      desc: 'Cheksiz savollar', 
      icon: '🏃', 
      color: '#198754',
      defaultTime: 20
    }
  ];

  // Vaqt sozlamalarini o'zgartirish funksiyasi
  const handleTimeChange = (modeId, newTime) => {
    if (newTime >= 5 && newTime <= 120) {
      setTimeSettings(prev => ({
        ...prev,
        [modeId]: newTime
      }));
    }
  };

  return React.createElement('div', { className: 'container my-4' },
    React.createElement('h4', { className: 'fw-bold mb-3' }, 'Quiz Rejimini Tanlang'),
    
    // Vaqt sozlamalari uchun panel (faqat o'qituvchi uchun)
    React.createElement('div', { className: 'row mb-4 g-3' },
      modes.map((mode) =>
        React.createElement('div', { key: `${mode.id}-settings`, className: 'col-6 col-md-3' },
          React.createElement('div', { className: 'card border-0 p-3 text-center shadow-sm' },
            React.createElement('div', { className: 'mb-2' },
              React.createElement('span', { className: 'fs-4' }, mode.icon),
              React.createElement('span', { className: 'ms-2 fw-bold' }, mode.name)
            ),
            React.createElement('div', { className: 'd-flex align-items-center justify-content-center' },
              React.createElement('button', {
                className: 'btn btn-sm btn-outline-secondary',
                onClick: () => handleTimeChange(mode.id, timeSettings[mode.id] - 5),
                disabled: timeSettings[mode.id] <= 5
              }, '−'),
              React.createElement('div', { className: 'mx-3' },
                React.createElement('div', { className: 'fw-bold' }, timeSettings[mode.id] + 's'),
                React.createElement('small', { className: 'text-muted' }, 'Vaqt')
              ),
              React.createElement('button', {
                className: 'btn btn-sm btn-outline-secondary',
                onClick: () => handleTimeChange(mode.id, timeSettings[mode.id] + 5),
                disabled: timeSettings[mode.id] >= 120
              }, '+')
            )
          )
        )
      )
    ),
    
    // Rejim kartalari
    React.createElement('div', { className: 'row g-3' },
      modes.map((mode) =>
        React.createElement('div', { key: mode.id, className: 'col-6 col-md-3' },
          React.createElement(motion.div, {
            whileHover: { scale: 1.05 },
            whileTap: { scale: 0.95 },
            className: `card border-0 p-3 text-center shadow-sm transition-all ${quizMode === mode.id ? 'selected-mode' : ''}`,
            style: { 
              backgroundColor: isDarkMode ? '#1a1d20' : '#fff',
              cursor: 'pointer',
              borderLeft: `5px solid ${mode.color}`,
              borderColor: quizMode === mode.id ? mode.color : 'transparent'
            },
            onClick: () => setQuizMode(mode.id)
          },
            React.createElement('div', { 
              className: 'display-4 mb-2',
              style: { color: mode.color }
            }, mode.icon),
            React.createElement('h6', { 
              className: 'fw-bold',
              style: { color: mode.color }
            }, mode.name),
            React.createElement('small', { className: 'text-muted' }, mode.desc),
            React.createElement('div', { className: 'mt-2 small badge bg-secondary' },
              `${timeSettings[mode.id]} soniya`
            )
          )
        )
      )
    )
  );
}

export default QuizModes;