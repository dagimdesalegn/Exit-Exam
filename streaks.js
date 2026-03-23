// streaks.js
// Helper functions for daily streaks and recency weighting

export function calculateDailyStreak(activityDates, today = new Date()) {
  // activityDates: array of ISO date strings (e.g., ["2026-03-21", "2026-03-22", ...])
  // Returns: { streak: number, lastActive: string }
  if (!activityDates || activityDates.length === 0) return { streak: 0, lastActive: null };
  const sorted = [...activityDates].sort().reverse();
  let streak = 0;
  let lastActive = sorted[0];
  let current = new Date(today);
  for (let i = 0; i < sorted.length; i++) {
    const date = new Date(sorted[i]);
    if (i === 0) {
      if (isoDate(current) !== isoDate(date)) break;
    } else {
      current.setDate(current.getDate() - 1);
      if (isoDate(current) !== isoDate(date)) break;
    }
    streak++;
  }
  return { streak, lastActive };
}

export function weightedRecencyScore(activityDates, today = new Date()) {
  // More recent dates get higher weight
  if (!activityDates || activityDates.length === 0) return 0;
  const now = new Date(today);
  let score = 0;
  let totalWeight = 0;
  for (const dateStr of activityDates) {
    const date = new Date(dateStr);
    const daysAgo = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    const weight = Math.max(0, 1 - daysAgo / 14); // 1 for today, 0.5 for 7 days ago, 0 for 14+
    score += weight;
    totalWeight += 1;
  }
  return Math.round((score / totalWeight) * 100);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}
