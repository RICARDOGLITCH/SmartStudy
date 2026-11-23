import { loadState, saveState } from "/storage.js";

let state = loadState();

const elements = {
  studyForm: document.querySelector("#study-form"),
  subject: document.querySelector("#subject"),
  topic: document.querySelector("#topic"),
  needs: document.querySelector("#needs"),
  guideButton: document.querySelector("#guide-button"),
  starterList: document.querySelector("#starter-list"),
  notice: document.querySelector("#notice"),
  guideSection: document.querySelector("#guide-section"),
  guideContent: document.querySelector("#guide-content"),
  quizButton: document.querySelector("#quiz-button"),
  quizSection: document.querySelector("#quiz-section"),
  quizContent: document.querySelector("#quiz-content"),
  askForm: document.querySelector("#ask-form"),
  question: document.querySelector("#question"),
  askButton: document.querySelector("#ask-button"),
  answerContent: document.querySelector("#answer-content")
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  const text = button.querySelector("span");
  if (text) text.textContent = busy ? "Thinking…" : label;
}

function showNotice(message = "") {
  elements.notice.textContent = message;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Please check the internet and try again.");
  return data;
}

function renderStarters() {
  elements.starterList.innerHTML = state.savedGuides.map((item) => `
    <button class="starter-chip" type="button" data-subject="${escapeHtml(item.subject)}" data-topic="${escapeHtml(item.topic)}">${escapeHtml(item.subject)} · ${escapeHtml(item.topic)}</button>
  `).join("");
  elements.starterList.querySelectorAll(".starter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      elements.subject.value = button.dataset.subject;
      elements.topic.value = button.dataset.topic;
      elements.needs.focus();
    });
  });
}

function normalizeGuide(guide, raw = "") {
  if (guide && typeof guide === "object" && Array.isArray(guide.sections)) return guide;
  return {
    title: "Your SmartStudy guide",
    overview: "Here is the AI's focused response for this study session.",
    sections: [{ title: "Start here", points: [raw || "Try your request again for a structured guide."], memoryTip: "Explain the idea in your own words after reading it." }],
    studySteps: ["Read the key idea once.", "Cover it and say what you remember.", "Use the practice quiz to check yourself."],
    checkYourself: ["What is the main idea?", "Can you give one example?"]
  };
}

function normalizeQuiz(quiz, raw = "") {
  if (quiz && typeof quiz === "object" && Array.isArray(quiz.questions)) return quiz;
  return {
    title: "Practice quiz",
    questions: [{ question: "What should you do next?", options: ["Review the guide", "Give up", "Skip studying", "Guess"], answerIndex: 0, explanation: raw || "Reviewing and practicing helps you remember." }]
  };
}

function renderGuide() {
  if (!state.currentGuide) {
    elements.guideSection.classList.add("hidden");
    return;
  }
  const guide = state.currentGuide;
  elements.guideSection.classList.remove("hidden");
  elements.guideContent.innerHTML = `
    <div class="guide-intro"><h3>${escapeHtml(guide.title || "Your study guide")}</h3><p>${escapeHtml(guide.overview || "A focused guide made for this session.")}</p></div>
    <div class="guide-sections">${(guide.sections || []).map((section) => `
      <article class="guide-section-card"><h3>${escapeHtml(section.title)}</h3><ul>${(section.points || []).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>${section.memoryTip ? `<div class="memory-tip"><strong>Memory tip</strong>${escapeHtml(section.memoryTip)}</div>` : ""}</article>
    `).join("")}</div>
    <div class="guide-bottom">
      <div class="mini-list"><strong>Study steps</strong><ol class="study-steps">${(guide.studySteps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol></div>
      <div class="mini-list"><strong>Check yourself</strong><ol>${(guide.checkYourself || []).map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ol></div>
    </div>
  `;
}

function renderQuiz() {
  if (!state.currentQuiz) {
    elements.quizSection.classList.add("hidden");
    return;
  }
  elements.quizSection.classList.remove("hidden");
  const quiz = state.currentQuiz;
  const hasAnswers = Object.keys(state.quizAnswers || {}).length > 0;
  const questions = quiz.questions || [];
  const score = hasAnswers ? questions.reduce((total, question, index) => total + (Number(state.quizAnswers[index]) === Number(question.answerIndex) ? 1 : 0), 0) : 0;
  elements.quizContent.innerHTML = `
    <p class="quiz-intro">${escapeHtml(quiz.title || "Five quick questions")} · Choose the best answer, then see why.</p>
    ${hasAnswers ? `<div class="quiz-score"><strong>${score}/${questions.length}</strong> correct. ${score === questions.length ? "Nice work — you are ready for a harder check." : "Use the explanations below as your next mini-review."}</div>` : ""}
    <form id="quiz-form">
      ${questions.map((question, index) => `<fieldset class="quiz-question"><h3>${index + 1}. ${escapeHtml(question.question)}</h3><div class="option-list">${(question.options || []).map((option, optionIndex) => `<label class="option-label"><input type="radio" name="quiz-${index}" value="${optionIndex}" ${Number(state.quizAnswers[index]) === optionIndex ? "checked" : ""} /> <span>${escapeHtml(option)}</span></label>`).join("")}</div>${hasAnswers ? `<div class="answer-review"><div class="answer-review-card ${Number(state.quizAnswers[index]) === Number(question.answerIndex) ? "correct" : "missed"}"><strong>${Number(state.quizAnswers[index]) === Number(question.answerIndex) ? "Correct" : "Review this"}</strong>${escapeHtml(Number(state.quizAnswers[index]) === Number(question.answerIndex) ? question.explanation : `The best answer is: ${question.options?.[question.answerIndex] || "the highlighted idea"}. ${question.explanation || "Read that part of your guide once more."}`)}</div></div>` : ""}</fieldset>`).join("")}
      <button class="primary-button quiz-submit" type="submit"><span>${hasAnswers ? "Check again" : "Check my answers"}</span><b>→</b></button>
    </form>
  `;
  document.querySelector("#quiz-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    state.quizAnswers = {};
    questions.forEach((_, index) => {
      const answer = formData.get(`quiz-${index}`);
      if (answer !== null) state.quizAnswers[index] = Number(answer);
    });
    state = saveState(state);
    renderQuiz();
    elements.quizSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderAnswer() {
  if (!state.questionAnswer) {
    elements.answerContent.classList.add("hidden");
    return;
  }
  elements.answerContent.classList.remove("hidden");
  elements.answerContent.textContent = state.questionAnswer;
}

elements.studyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showNotice("");
  setBusy(elements.guideButton, true, "Make my study guide");
  try {
    const data = await postJson("/api/study-guide", {
      subject: elements.subject.value,
      topic: elements.topic.value,
      needs: elements.needs.value
    });
    state.currentGuide = normalizeGuide(data.guide, data.raw);
    state.currentQuiz = null;
    state.quizAnswers = {};
    state = saveState(state);
    renderGuide();
    renderQuiz();
    elements.guideSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showNotice(error.message);
  } finally {
    setBusy(elements.guideButton, false, "Make my study guide");
  }
});

elements.quizButton.addEventListener("click", async () => {
  showNotice("");
  setBusy(elements.quizButton, true, "Make a practice quiz");
  try {
    const data = await postJson("/api/practice-quiz", { guide: state.currentGuide });
    state.currentQuiz = normalizeQuiz(data.quiz, data.raw);
    state.quizAnswers = {};
    state = saveState(state);
    renderQuiz();
    elements.quizSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showNotice(error.message);
  } finally {
    setBusy(elements.quizButton, false, "Make a practice quiz");
  }
});

elements.askForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showNotice("");
  setBusy(elements.askButton, true, "Ask");
  try {
    const data = await postJson("/api/ask", {
      question: elements.question.value,
      context: `${elements.subject.value} ${elements.topic.value}`.trim()
    });
    state.questionAnswer = data.answer;
    state = saveState(state);
    renderAnswer();
    elements.answerContent.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    showNotice(error.message);
  } finally {
    setBusy(elements.askButton, false, "Ask");
  }
});

renderStarters();
renderGuide();
renderQuiz();
renderAnswer();
