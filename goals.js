// goals.js
// Adaptive daily/weekly goals

export function getAdaptiveGoal(userId, baseGoal = 1) {
  // Example: If user is consistent, increase goal; if not, decrease
  const streak = (window._userStreaks && window._userStreaks[userId]) || 0;
  if (streak >= 7) return baseGoal + 1;
  if (streak >= 3) return baseGoal;
  return Math.max(1, baseGoal - 1);
}

export function setUserStreak(userId, streak) {
  if (!window._userStreaks) window._userStreaks = {};
  window._userStreaks[userId] = streak;
}
