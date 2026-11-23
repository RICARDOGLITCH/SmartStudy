const STORAGE_KEY = "smartstudy-state-v1";

const seedState = {
  savedGuides: [
    {
      id: "sample-cells",
      subject: "Biology",
      topic: "Cells and organelles",
      label: "Sample idea",
      summary: "A short study guide about how cell parts work together."
    },
    {
      id: "sample-reactions",
      subject: "Chemistry",
      topic: "Chemical reactions",
      label: "Sample idea",
      summary: "A starting point for reviewing reactants, products, and evidence of change."
    }
  ],
  currentGuide: null,
  currentQuiz: null,
  quizAnswers: {},
  questionAnswer: null,
  updatedAt: null
};

function copySeedState() {
  return JSON.parse(JSON.stringify(seedState));
}

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const initial = copySeedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return { ...copySeedState(), ...JSON.parse(saved) };
  } catch {
    return copySeedState();
  }
}

export function saveState(state) {
  const nextState = { ...state, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

export function resetState() {
  const initial = copySeedState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}
