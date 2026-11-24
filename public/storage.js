const STORAGE_KEY = "smartstudy-sessions-v1";
const RECENT_KEY = "smartstudy-recent-v1";

function readSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSession(session) {
  const sessions = readSessions().filter((item) => item.id !== session.id);
  sessions.unshift(session);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 12)));
  localStorage.setItem(RECENT_KEY, JSON.stringify(session));
}

function getRecentSession() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "null");
  } catch {
    return null;
  }
}

function saveQuizResult(result) {
  const recent = getRecentSession();
  if (!recent) return;
  saveSession({
    ...recent,
    latestQuiz: result,
    updatedAt: new Date().toISOString(),
  });
}

window.smartStudyStorage = {
  readSessions,
  saveSession,
  getRecentSession,
  saveQuizResult,
};
