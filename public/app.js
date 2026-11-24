const storage = window.smartStudyStorage;

const state = {
  session: null,
  view: "home",
  quiz: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

async function postJson(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("SmartStudy could not connect right now. Please check the internet and try again.");
  }
  let data = {};
  try { data = await response.json(); } catch { /* use friendly fallback below */ }
  if (!response.ok) throw new Error(data.error || "SmartStudy could not answer right now. Please check the internet and try again.");
  return data;
}

function setView(view) {
  state.view = view;
  ["home", "guide", "quiz"].forEach((name) => {
    const section = $(`#${name}-view`);
    section.hidden = name !== view;
    section.classList.toggle("active-view", name === view);
  });
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setSessionNav(enabled) {
  $$(".nav-item").forEach((button) => {
    if (button.dataset.view === "guide" || button.dataset.view === "quiz") button.disabled = !enabled;
  });
}

function renderGuide() {
  if (!state.session) return;
  const guide = state.session.guide;
  const ideas = Array.isArray(guide.keyIdeas) ? guide.keyIdeas : [];
  const plan = Array.isArray(guide.studyPlan) ? guide.studyPlan : [];
  $("#guide-view").innerHTML = `
    <div class="guide-shell">
      <button class="back-link" data-action="home">← Back to study space</button>
      <div class="guide-header">
        <div><p class="eyebrow">YOUR CUSTOM GUIDE · ${escapeHtml(guide.subject || "Science")}</p><h1>${escapeHtml(guide.title || `Your ${guide.topic} guide`)}</h1><p>${escapeHtml(guide.intro || `A focused plan for ${guide.topic}.`)}</p></div>
        <span class="tag">${escapeHtml(guide.topic || "Your topic")}</span>
      </div>
      <div class="guide-grid">
        <section class="panel guide-card"><h2>Key ideas to understand</h2>
          ${ideas.map((idea, index) => `<article class="idea"><div class="idea-head"><span class="idea-number">0${index + 1}</span><h3>${escapeHtml(idea.title || `Idea ${index + 1}`)}</h3></div><p>${escapeHtml(idea.explanation || "")}</p>${idea.memoryTip ? `<p class="memory-tip">${escapeHtml(idea.memoryTip)}</p>` : ""}</article>`).join("")}
          ${ideas.length === 0 ? `<p class="panel-intro">Your guide is ready, but it did not include key ideas. Try creating it again.</p>` : ""}
        </section>
        <aside class="panel guide-card plan-card"><h2>Your ${escapeHtml(guide.minutes || "25")} minute plan</h2><ol>${plan.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol><div class="confidence"><strong>Confidence check</strong>${escapeHtml(guide.confidenceCheck || "Explain one key idea in your own words.")}</div></aside>
      </div>
      <div class="guide-cta"><button class="primary-button" data-action="quiz"><span>Practice with a quiz</span><span class="button-arrow">→</span></button></div>
    </div>`;
}

function startQuiz() {
  const questions = Array.isArray(state.session?.guide?.quiz) ? state.session.guide.quiz : [];
  if (!questions.length) {
    showToast("This guide did not include quiz questions. Try creating it again.");
    return;
  }
  state.quiz = { index: 0, answers: [], selected: null, answered: false, finished: false };
  renderQuiz();
  setView("quiz");
}

function renderQuiz() {
  if (!state.session || !state.quiz) return;
  const questions = state.session.guide.quiz || [];
  if (state.quiz.finished) return renderResults(questions);
  const question = questions[state.quiz.index];
  const selected = state.quiz.selected;
  const answered = state.quiz.answered;
  const optionMarkup = (question.options || []).map((option, index) => {
    let className = "option-button";
    if (answered && index === question.answer) className += " correct";
    if (answered && index === selected && selected !== question.answer) className += " incorrect";
    if (!answered && selected === index) className += " selected";
    return `<button class="${className}" data-option="${index}" type="button" ${answered ? "disabled" : ""}>${String.fromCharCode(65 + index)}. ${escapeHtml(option)}</button>`;
  }).join("");
  $("#quiz-view").innerHTML = `
    <div class="quiz-shell">
      <button class="back-link" data-action="guide">← Back to your guide</button>
      <div class="quiz-header"><div><p class="eyebrow">PRACTICE QUIZ · ${escapeHtml(state.session.guide.topic)}</p><h1>Try it, then learn why.</h1><p>No pressure — every answer is a chance to get clearer.</p></div><div class="progress-wrap"><div class="progress-label">Question ${state.quiz.index + 1} of ${questions.length}</div><div class="progress-bar"><div class="progress-fill" style="width:${((state.quiz.index + 1) / questions.length) * 100}%"></div></div></div></div>
      <section class="panel question-card"><p class="eyebrow">QUESTION ${state.quiz.index + 1}</p><h2>${escapeHtml(question.question || "What is the best answer?")}</h2><div class="options">${optionMarkup}</div>
        ${answered ? `<div class="feedback"><strong>${selected === question.answer ? "That’s right — nice work." : "Not quite, and that’s okay."}</strong>${escapeHtml(question.explanation || "Review the key idea in your guide, then try explaining it in your own words.")}</div>` : ""}
        <div class="quiz-actions"><button class="muted-action" data-action="guide" type="button">Review guide</button>${answered ? `<button class="primary-button" data-action="next" type="button"><span>${state.quiz.index === questions.length - 1 ? "See my results" : "Next question"}</span><span class="button-arrow">→</span></button>` : `<span class="form-hint">Choose the answer that feels best.</span>`}</div>
      </section>
    </div>`;
}

function renderResults(questions) {
  const answers = state.quiz.answers;
  const correct = questions.reduce((total, question, index) => total + (answers[index] === question.answer ? 1 : 0), 0);
  const missed = questions.map((question, index) => ({ question, index })).filter(({ question, index }) => answers[index] !== question.answer);
  const scorePercent = Math.round((correct / questions.length) * 100);
  const result = { correct, total: questions.length, missed: missed.map(({ question, index }) => ({ question: question.question, picked: question.options?.[answers[index]], answer: question.options?.[question.answer], explanation: question.explanation })) };
  storage.saveQuizResult(result);
  $("#quiz-view").innerHTML = `
    <div class="quiz-shell"><button class="back-link" data-action="guide">← Back to your guide</button>
      <section class="panel results-card"><div class="score-ring" style="--score:${scorePercent}%" data-score="${correct}/${questions.length}"></div><p class="eyebrow">QUIZ COMPLETE</p><h2>${correct === questions.length ? "You’ve got this." : "You found your next focus."}</h2><p>${correct === questions.length ? "Every answer landed. Keep the momentum going." : "Review the missed answers below, then come back for another try."}</p>
      ${missed.length ? `<div class="missed-list"><h3>Review what you missed</h3>${missed.map(({ question, index }) => `<article class="missed-item"><strong>${escapeHtml(question.question)}</strong><p class="wrong">Your answer: ${escapeHtml(question.options?.[answers[index]] || "No answer")}</p><p class="right">Correct answer: ${escapeHtml(question.options?.[question.answer] || "")}</p><p>${escapeHtml(question.explanation || "Review this idea in your guide.")}</p></article>`).join("")}</div>` : ""}
      <div class="guide-cta"><button class="primary-button" data-action="guide" type="button"><span>Back to my guide</span><span class="button-arrow">→</span></button></div></section>
    </div>`;
}

async function handleGuideSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $("#guide-submit");
  const label = button.querySelector(".button-label");
  const error = $("#guide-error");
  const data = Object.fromEntries(new FormData(form).entries());
  error.textContent = "";
  button.disabled = true;
  label.textContent = "Thinking…";
  try {
    const result = await postJson("/api/study-guide", data);
    state.session = { id: `session-${Date.now()}`, createdAt: new Date().toISOString(), guide: result.guide };
    storage.saveSession(state.session);
    setSessionNav(true);
    renderGuide();
    renderRecent();
    setView("guide");
    showToast("Your custom guide is ready.");
  } catch (requestError) {
    error.textContent = requestError.message;
  } finally {
    button.disabled = false;
    label.textContent = "Create my guide";
  }
}

async function handleAskSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = $("#question-input");
  const button = $("#ask-submit");
  const area = $("#answer-area");
  const question = new FormData(form).get("question");
  button.disabled = true;
  area.innerHTML = `<div class="answer-card">Thinking…</div>`;
  try {
    const result = await postJson("/api/answer", { question, subject: state.session?.guide?.subject || "Science" });
    area.innerHTML = `<div class="answer-card ${result.safeRefusal ? "safe-refusal" : ""}"><strong>${result.safeRefusal ? "Let’s keep this safe." : "SmartStudy says:"}</strong><br>${escapeHtml(result.answer || "")}</div>`;
    input.value = "";
  } catch (requestError) {
    area.innerHTML = `<div class="answer-card safe-refusal"><strong>Something got in the way.</strong><br>${escapeHtml(requestError.message)}</div>`;
  } finally {
    button.disabled = false;
  }
}

function renderRecent() {
  const recent = storage.getRecentSession();
  const panel = $("#recent-panel");
  if (!recent?.guide) { panel.hidden = true; return; }
  panel.hidden = false;
  panel.innerHTML = `<div class="recent-card"><div><p class="eyebrow">RECENT SESSION</p><h3>${escapeHtml(recent.guide.title || recent.guide.topic)}</h3><p>Pick up your guide where you left off.</p></div><button class="text-button" data-action="recent">Open guide →</button></div>`;
}

function openRecent() {
  const recent = storage.getRecentSession();
  if (!recent) return;
  state.session = recent;
  setSessionNav(true);
  renderGuide();
  setView("guide");
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action], [data-option]");
  if (!target) return;
  if (target.dataset.option !== undefined) {
    if (!state.quiz || state.quiz.answered) return;
    state.quiz.selected = Number(target.dataset.option);
    state.quiz.answered = true;
    state.quiz.answers[state.quiz.index] = state.quiz.selected;
    renderQuiz();
    return;
  }
  const action = target.dataset.action;
  if (action === "home") setView("home");
  if (action === "guide") { if (state.session) { renderGuide(); setView("guide"); } }
  if (action === "quiz") startQuiz();
  if (action === "next") { state.quiz.index += 1; state.quiz.selected = null; state.quiz.answered = false; if (state.quiz.index >= (state.session.guide.quiz || []).length) state.quiz.finished = true; renderQuiz(); }
  if (action === "recent") openRecent();
});

$("#guide-form").addEventListener("submit", handleGuideSubmit);
$("#ask-form").addEventListener("submit", handleAskSubmit);
document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => {
  if (button.disabled) return;
  if (button.dataset.view === "home") setView("home");
  if (button.dataset.view === "guide" && state.session) { renderGuide(); setView("guide"); }
  if (button.dataset.view === "quiz" && state.session) { startQuiz(); }
}));

renderRecent();
setSessionNav(false);
