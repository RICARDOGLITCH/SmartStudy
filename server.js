const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const BRIEF_PATH = path.join(ROOT, "BRIEF.md");
const NOTES_PATH = path.join(ROOT, "NOTES.md");
const MODEL_FALLBACK = "gpt-5.6-luna";

function getKey() {
  const envPath = path.join(ROOT, ".env");
  try {
    const line = fs.readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .find((item) => item.trim().startsWith("OPENAI_API_KEY="));
    const value = line?.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!value || value === "paste-your-key-here") {
      return { key: null, error: "Your OpenAI key is missing from .env. Add it there, then restart SmartStudy." };
    }
    return { key: value, error: null };
  } catch {
    return { key: null, error: "SmartStudy could not read .env. Check that the file exists, then restart SmartStudy." };
  }
}

function getModel() {
  try {
    const notes = fs.readFileSync(NOTES_PATH, "utf8");
    const match = notes.match(/OpenAI model with [^:]+:\s*([^\s]+)/i);
    return match?.[1]?.trim() || MODEL_FALLBACK;
  } catch {
    return MODEL_FALLBACK;
  }
}

function getBriefInstructions() {
  try {
    const brief = fs.readFileSync(BRIEF_PATH, "utf8");
    const heading = "## My AI’s instructions";
    const start = brief.indexOf(heading);
    if (start === -1) return "Be friendly, simple, concise, safe, and helpful to a middle-school student.";
    const afterHeading = brief.slice(start + heading.length);
    const nextHeading = afterHeading.indexOf("\n## ");
    return (nextHeading === -1 ? afterHeading : afterHeading.slice(0, nextHeading)).trim();
  } catch {
    return "Be friendly, simple, concise, safe, and helpful to a middle-school student.";
  }
}

function getSystemInstructions() {
  return [
    "You are SmartStudy, a friendly AI study partner for middle-school students.",
    "Use the following instructions from BRIEF.md for every message:",
    getBriefInstructions(),
    "Safety rules: never provide dangerous chemical or other harmful instructions. Refuse briefly and suggest asking a teacher or trusted adult.",
    "If a student feels frustrated, respond kindly, break the idea into smaller pieces, and encourage them without judgment.",
    "Use simple, concise language. Prefer accurate explanations and active recall over a giant information dump.",
    "The brief says ‘Discourage the user, make non productive work’; interpret that line safely as a prohibition: never discourage the student and never make their work unproductive."
  ].join("\n\n");
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("Request is too large."));
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Please send valid form data."));
      }
    });
    request.on("error", reject);
  });
}

function textFromResponse(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) return content.map((part) => part?.text || "").join("\n").trim();
  return "";
}

function parseJsonAnswer(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = Math.min(...[cleaned.indexOf("{"), cleaned.indexOf("[")].filter((index) => index >= 0));
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
    }
    return null;
  }
}

async function askOpenAI(userPrompt) {
  const auth = getKey();
  if (auth.error) return { ok: false, error: auth.error, fromKey: true };

  try {
    const result = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.key}`
      },
      body: JSON.stringify({
        model: getModel(),
        temperature: 0.4,
        messages: [
          { role: "system", content: getSystemInstructions() },
          { role: "user", content: userPrompt }
        ]
      })
    });
    if (!result.ok) return { ok: false, error: "The AI could not answer right now. Please check the internet and try again." };
    const payload = await result.json();
    const text = textFromResponse(payload);
    if (!text) return { ok: false, error: "The AI returned an empty answer. Please try again." };
    return { ok: true, text };
  } catch {
    return { ok: false, error: "The AI could not answer right now. Please check the internet and try again." };
  }
}

async function handleApi(request, response, pathname) {
  let data;
  try {
    data = await readJson(request);
  } catch (error) {
    return sendJson(response, 400, { error: error.message });
  }

  if (pathname === "/api/study-guide") {
    const subject = String(data.subject || "").trim();
    const topic = String(data.topic || "").trim();
    const needs = String(data.needs || "").trim();
    if (!subject || !topic) return sendJson(response, 400, { error: "Please add a subject and test topic first." });
    const result = await askOpenAI(`Create a customized study guide for a middle-school student. Subject: ${subject}. Test topic: ${topic}. What the student needs help with: ${needs || "Start from the basics."}. Return ONLY valid JSON with this shape: {"title":"...","overview":"...","sections":[{"title":"...","points":["..."],"memoryTip":"..."}],"studySteps":["..."],"checkYourself":["..."]}. Keep it focused and useful for one study session.`);
    if (!result.ok) return sendJson(response, 502, { error: result.error });
    return sendJson(response, 200, { guide: parseJsonAnswer(result.text), raw: result.text });
  }

  if (pathname === "/api/practice-quiz") {
    const guide = data.guide;
    if (!guide) return sendJson(response, 400, { error: "Make a study guide before making a quiz." });
    const result = await askOpenAI(`Turn this study guide into a short practice quiz. Return ONLY valid JSON with this shape: {"title":"...","questions":[{"question":"...","options":["...","...","...","..."],"answerIndex":0,"explanation":"..."}]}. Make 5 questions, use only information from the guide, and make every explanation teach why the correct answer is correct. Study guide: ${JSON.stringify(guide)}`);
    if (!result.ok) return sendJson(response, 502, { error: result.error });
    return sendJson(response, 200, { quiz: parseJsonAnswer(result.text), raw: result.text });
  }

  if (pathname === "/api/ask") {
    const question = String(data.question || "").trim();
    const context = String(data.context || "").trim();
    if (!question) return sendJson(response, 400, { error: "Type a question first." });
    const result = await askOpenAI(`Answer this student's real study question safely and accurately. Subject/topic context: ${context || "general school science"}. Question: ${question}. If it asks for dangerous instructions, refuse and redirect to a teacher or trusted adult. Otherwise, explain simply and include one quick way to remember the idea.`);
    if (!result.ok) return sendJson(response, 502, { error: result.error });
    return sendJson(response, 200, { answer: result.text });
  }

  return sendJson(response, 404, { error: "Not found." });
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

function serveStatic(request, response, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) return sendJson(response, 403, { error: "Forbidden." });
  fs.readFile(filePath, (error, content) => {
    if (error) return sendJson(response, 404, { error: "Not found." });
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "POST" && url.pathname.startsWith("/api/")) return handleApi(request, response, url.pathname);
  if (request.method === "GET") return serveStatic(request, response, url.pathname);
  return sendJson(response, 405, { error: "Method not allowed." });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`SmartStudy is running at http://localhost:${PORT}`);
});
