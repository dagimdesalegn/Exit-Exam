// achievements.js
// Simple achievements and badges system

export const ACHIEVEMENTS = [
  { id: "streak_3", label: "3-Day Streak", test: (s) => s.streak >= 3 },
  { id: "streak_7", label: "7-Day Streak", test: (s) => s.streak >= 7 },
  { id: "recency_90", label: "Recency Master", test: (s) => s.recency >= 90 },
  { id: "consistency_10", label: "Consistency Pro", test: (s) => s.bonus >= 10 },
  { id: "improvement_10", label: "10% Improved", test: (s) => s.improvement >= 10 },
];

export function getUserAchievements(stats) {
  return ACHIEVEMENTS.filter(a => a.test(stats)).map(a => a.label);
}
