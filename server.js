const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { createStudyGuide, answerQuestion } = require("./lib/api-handlers");

const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, "public");

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100_000) reject(new Error("Request is too large."));
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Please send a valid request."));
      }
    });
    req.on("error", reject);
  });
}

async function handleApi(req, res) {
  try {
    const body = await readBody(req);
    if (req.url === "/api/study-guide" && req.method === "POST") {
      const result = await createStudyGuide(body);
      return sendJson(res, result.status, result.body);
    }

    if (req.url === "/api/answer" && req.method === "POST") {
      const result = await answerQuestion(body);
      return sendJson(res, result.status, result.body);
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    if (error?.fix) console.error(`MindDo fix: ${error.fix}`);
    const message = error?.message || "SmartStudy could not answer right now. Please check the internet and try again.";
    sendJson(res, 502, { error: message });
  }
}

function serveFile(req, res) {
  const requestPath = decodeURIComponent(req.url.split("?")[0]);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\//, "");
  const filePath = path.resolve(publicDir, relativePath);
  if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const fallback = path.join(publicDir, "index.html");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(fs.readFileSync(fallback));
  }
  const extension = path.extname(filePath);
  const contentTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
  res.writeHead(200, { "Content-Type": contentTypes[extension] || "application/octet-stream" });
  res.end(fs.readFileSync(filePath));
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) return handleApi(req, res);
  serveFile(req, res);
});

server.listen(PORT, () => {
  console.log(`SmartStudy is running at http://localhost:${PORT}`);
});
