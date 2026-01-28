export function calculateTimeBonus(currentTime, totalTime, basePoints) {
  const remainingPercent = (currentTime / totalTime) * 100;
  let multiplier = 1;
  let bonusType = '';

  if (remainingPercent > 70) {
    multiplier = 1.5;
    bonusType = 'tezkor';
  } else if (remainingPercent > 40) {
    multiplier = 1.2;
    bonusType = 'yaxshi';
  } else if (remainingPercent > 10) {
    multiplier = 1.0;
    bonusType = 'normal';
  } else {
    multiplier = 0.8;
    bonusType = 'kech';
  }

  const bonusPoints = Math.round(basePoints * multiplier);
  const bonusAmount = bonusPoints - basePoints;

  return {
    multiplier,
    bonusType,
    finalPoints: bonusPoints,
    bonusAmount,
    message: `${bonusType.toUpperCase()} javob! ${bonusAmount > 0 ? `+${bonusAmount}` : bonusAmount} ball`
  };
}

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}