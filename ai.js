const fs = require("node:fs");
const path = require("node:path");

const MODEL = "gpt-4o-mini";
let cachedKey = null;
let cachedExpiresAt = 0;

function readEnvValue(name) {
  if (process.env[name]?.trim()) return process.env[name].trim();
  if (process.env.VERCEL) return "";
  try {
    const envText = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
    const line = envText.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+?)\\s*$`, "m"));
    return line?.[1]?.replace(/^['"]|['"]$/g, "").trim() || "";
  } catch {
    return "";
  }
}

function keygenError(data, fallback) {
  const error = new Error(data?.error?.message || fallback);
  error.fix = data?.error?.fix || "Check KEYGEN_URL and KEYGEN_TOKEN in .env, then try again.";
  error.source = "minddo";
  return error;
}

async function getKey() {
  if (cachedKey && Date.now() < cachedExpiresAt - 30_000) return cachedKey;

  const keygenUrl = readEnvValue("KEYGEN_URL");
  const keygenToken = readEnvValue("KEYGEN_TOKEN");
  if (!keygenUrl || !keygenToken || keygenUrl === "paste-here" || keygenToken === "paste-here") {
    throw keygenError(null, "SmartStudy is not connected to MindDo yet.");
  }

  let response;
  try {
    response = await fetch(`${keygenUrl.replace(/\/$/, "")}/api/lookup-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keygenToken}`,
      },
    });
  } catch {
    throw keygenError(null, "SmartStudy could not reach MindDo. Please check the internet and try again.");
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    throw keygenError(null, "MindDo returned an unexpected response.");
  }
  if (!response.ok || !data.apiKey || !data.expiresAt) {
    throw keygenError(data, "MindDo could not provide an AI key.");
  }

  let expiry = Number.isFinite(Number(data.expiresAt))
    ? Number(data.expiresAt)
    : Date.parse(data.expiresAt);
  if (expiry > 0 && expiry < 1_000_000_000_000) expiry *= 1000;
  if (!Number.isFinite(expiry) || expiry <= Date.now()) {
    throw keygenError(null, "MindDo returned an expired AI key.");
  }
  cachedKey = data.apiKey;
  cachedExpiresAt = expiry;
  return cachedKey;
}

function invalidateKey() {
  cachedKey = null;
  cachedExpiresAt = 0;
}

function readBriefInstructions() {
  const brief = fs.readFileSync(path.join(__dirname, "BRIEF.md"), "utf8");
  const start = brief.indexOf("## My AI’s instructions");
  if (start === -1) return brief;
  return brief.slice(start).split("\n## ")[0];
}

const safetyInstructions = `
You are SmartStudy, a friendly study coach for middle-school students in grades 6–8.
Use simple, concise language. Be accurate and say when a fact is uncertain. Help the student take one manageable step at a time.
Safety is part of your job: never provide instructions that could help someone make explosives, weapons, poisons, or use chemicals dangerously. Refuse briefly and kindly, then redirect the student to a teacher, parent, or other trusted adult. If a student says they feel stupid, hopeless, or overwhelmed, respond with warmth, break the task into a smaller piece, and encourage them without judgment.
Do not claim to be a teacher, doctor, or emergency service. Do not invent sources or citations.
`;

async function askAI(userPrompt, responseFormat = "text") {
  const instructions = `${readBriefInstructions()}\n${safetyInstructions}`;
  const request = async (apiKey) => fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      instructions,
      input: userPrompt,
      ...(responseFormat === "json"
        ? { text: { format: { type: "json_object" } } }
        : {}),
    }),
  });

  let apiKey = await getKey();
  let response = await request(apiKey);
  if (response.status === 401 || response.status === 403) {
    invalidateKey();
    apiKey = await getKey();
    response = await request(apiKey);
  }

  const data = await response.json();
  if (!response.ok) {
    throw keygenError(data, "SmartStudy could not reach the AI right now. Please check the internet and try again.");
  }

  const text = data.output_text || data.output
    ?.flatMap((item) => item.content || [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text)
    .join("");

  if (!text) throw keygenError(null, "SmartStudy received an empty answer. Please check the internet and try again.");
  return text;
}

function isPotentiallyHarmfulChemicalQuestion(text) {
  const normalized = text.toLowerCase();
  const dangerousTerms = [
    "make a bomb",
    "make an explosive",
    "make explosives",
    "make a weapon",
    "poison someone",
    "dangerous chemical",
    "chemical weapon",
    "deadly chemical",
    "how to synthesize",
  ];
  return dangerousTerms.some((term) => normalized.includes(term));
}

module.exports = { MODEL, getKey, askAI, isPotentiallyHarmfulChemicalQuestion };
