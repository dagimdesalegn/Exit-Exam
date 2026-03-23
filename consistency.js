// consistency.js
// Bonus for regular study consistency

export function consistencyBonus(streak) {
  // Give a bonus for streaks: e.g., +1% per 3 days, max 10%
  if (!streak || streak < 3) return 0;
  return Math.min(10, Math.floor(streak / 3));
}
