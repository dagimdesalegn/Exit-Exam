// leaderboard.js
// Simple leaderboard logic (in-memory)

export function getLeaderboard(users, getStats) {
  // users: array of user objects
  // getStats: function(user) => { streak, recency, bonus, improvement, ... }
  return users
    .map(user => ({
      user,
      stats: getStats(user),
    }))
    .sort((a, b) => b.stats.streak - a.stats.streak)
    .slice(0, 10);
}
