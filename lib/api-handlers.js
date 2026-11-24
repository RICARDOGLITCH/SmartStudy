const { askAI, isPotentiallyHarmfulChemicalQuestion } = require("../ai");

async function createStudyGuide(body = {}) {
  const topic = String(body.topic || "").trim();
  const subject = String(body.subject || "Science").trim();
  const grade = String(body.grade || "6–8").trim();
  const minutes = String(body.minutes || "25").trim();
  const goal = String(body.goal || "Understand the most important ideas").trim();
  if (!topic) return { status: 400, body: { error: "Add a topic so SmartStudy knows what to focus on." } };

  const prompt = `Create a customized study guide for a ${grade} student.
Subject: ${subject}
Test topic: ${topic}
Study time today: ${minutes} minutes
Student goal: ${goal}

Return JSON only with this exact shape:
{
  "title": "short, encouraging title",
  "intro": "one sentence that explains the focus",
  "keyIdeas": [{"title":"...", "explanation":"...", "memoryTip":"..."}],
  "studyPlan": ["...", "...", "..."],
  "confidenceCheck": "one quick thing the student should be able to explain after studying",
  "quiz": [{"question":"...", "options":["...","...","...","..."],"answer":0,"explanation":"..."}]
}

Use 3–5 key ideas and 4 quiz questions. Keep every explanation concise and age-appropriate. Make the quiz answer a zero-based option index. Prefer understanding and connections over a wall of facts.`;

  const raw = await askAI(prompt, "json");
  let guide;
  try {
    guide = JSON.parse(raw);
  } catch {
    throw new Error("SmartStudy received an unexpected guide format. Please try again.");
  }
  return { status: 200, body: { guide: { ...guide, subject, topic, grade, minutes, goal } } };
}

async function answerQuestion(body = {}) {
  const question = String(body.question || "").trim();
  const subject = String(body.subject || "Science").trim();
  if (!question) return { status: 400, body: { error: "Type a question first." } };
  if (isPotentiallyHarmfulChemicalQuestion(question)) {
    return {
      status: 200,
      body: {
        answer: "I can’t help with dangerous chemical or weapon instructions. Please ask your science teacher, parent, or another trusted adult so you can explore the topic safely.",
        safeRefusal: true,
      },
    };
  }

  const prompt = `A middle-school student studying ${subject} asks: "${question}"
Answer in 2–5 short paragraphs. Start with the direct answer, use one simple example, and end with a tiny check-for-understanding question. If the student sounds frustrated, be kind and break the idea into one smaller step.`;
  const answer = await askAI(prompt);
  return { status: 200, body: { answer } };
}

module.exports = { createStudyGuide, answerQuestion };
