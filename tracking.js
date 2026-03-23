// tracking.js
// Track time spent, topics covered, and improvement

export function trackSessionStart() {
  window._studySessionStart = Date.now();
}

export function trackSessionEnd() {
  const start = window._studySessionStart;
  if (!start) return 0;
  const duration = Math.floor((Date.now() - start) / 1000); // seconds
  window._studySessionStart = null;
  return duration;
}

export function recordTopicActivity(topic, userId, seconds) {
  // Store in-memory for now; in production, sync to backend
  if (!window._topicActivity) window._topicActivity = {};
  if (!window._topicActivity[userId]) window._topicActivity[userId] = {};
  window._topicActivity[userId][topic] = (window._topicActivity[userId][topic] || 0) + seconds;
}

export function getTopicActivity(userId) {
  return (window._topicActivity && window._topicActivity[userId]) || {};
}

export function recordImprovement(userId, topic, oldScore, newScore) {
  if (!window._improvement) window._improvement = {};
  if (!window._improvement[userId]) window._improvement[userId] = {};
  window._improvement[userId][topic] = (window._improvement[userId][topic] || 0) + (newScore - oldScore);
}

export function getImprovement(userId) {
  return (window._improvement && window._improvement[userId]) || {};
}
