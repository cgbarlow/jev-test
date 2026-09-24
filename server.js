// Minimal zero-dependency server: serves ./public and proxies /api/systemone to
// TypeSafe so the API key never reaches the browser.
//
//   TYPESAFE_API_KEY=... node server.js      (or put it in .env)
//   JEV_MOCK=1 node server.js                 (offline heuristic stand-in, NOT Jev)

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

loadDotEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = (process.env.TYPESAFE_BASE_URL || "https://api.typesafe.ai").replace(/\/+$/, "");
const MODEL = process.env.TYPESAFE_MODEL || "jev-latest";
const API_KEY = process.env.TYPESAFE_API_KEY;
const MOCK = process.env.JEV_MOCK === "1";
const PUBLIC = path.join(__dirname, "public");

if (!API_KEY && !MOCK) {
  console.error("Set TYPESAFE_API_KEY (env or .env), or run with JEV_MOCK=1 for offline mode.");
  process.exit(1);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

http
  .createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/api/config") {
        return json(res, 200, { model: MOCK ? "mock" : MODEL, mock: MOCK });
      }
      if (req.method === "POST" && req.url === "/api/systemone") {
        const body = JSON.parse(await readBody(req));
        const payload = { model: MODEL, state: body.state, questions: body.questions };
        const t0 = performance.now();
        const upstream = MOCK ? mockSystemOne(payload) : await callTypeSafe(payload);
        res.setHeader("x-upstream-ms", Math.round(performance.now() - t0));
        return json(res, upstream.status, upstream.body);
      }
      if (req.method === "GET") return serveStatic(req, res);
      json(res, 405, { error: "method not allowed" });
    } catch (err) {
      console.error(err);
      json(res, 502, { error: String(err.message || err) });
    }
  })
  .listen(PORT, () => console.log(`Jev marking prototype on http://localhost:${PORT} (${MOCK ? "MOCK mode" : MODEL})`));

async function callTypeSafe(payload) {
  const r = await fetch(`${BASE_URL}/v1/systemone`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });
  const text = await r.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { error: text };
  }
  return { status: r.status, body: parsed };
}

function serveStatic(req, res) {
  const url = new URL(req.url, "http://x");
  const rel = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const file = path.join(PUBLIC, path.normalize(rel));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return json(res, 404, { error: "not found" });
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1e6) reject(new Error("body too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// ---------------------------------------------------------------------------
// MOCK: a crude text heuristic that returns the same response shape as Jev,
// so the UI can be demoed offline. Its numbers are NOT Jev results.
function mockSystemOne({ state, questions }) {
  const text = String(state?.learner_response ?? state ?? "");
  const words = text.split(/\s+/).filter(Boolean).length;
  const paras = text.split(/\n\s*\n/).length;
  const caps = /(^|[.!?]\s+)[A-Z]/.test(text) ? 1 : 0;
  const quality = Math.min(1, words / 220) * 0.6 + Math.min(1, paras / 4) * 0.3 + caps * 0.1;
  const offTopic = /minecraft|favourite game/i.test(text);
  const harm = /\b(hurt|kill|burn)\b/i.test(text);
  const answers = {};
  let seed = [...text].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);

  for (const [name, q] of Object.entries(questions)) {
    if (q.type === "noul") {
      const isTopic = /attempt/i.test(JSON.stringify(q.instructions));
      answers[name] = { type: "noul", noul: isTopic ? (offTopic ? 0.04 : 0.97) : harm ? 0.91 : 0.02 };
    } else if (q.type === "score") {
      const n = q.criteria.length;
      const target = (offTopic ? 0 : quality) * (n - 1) + (rnd() - 0.5) * 0.9;
      const logits = q.criteria.map((_, i) => -((i - target) ** 2) * 2.2);
      const probs = softmax(logits);
      const best = probs.indexOf(Math.max(...probs));
      answers[name] = {
        type: "score",
        score: probs.reduce((s, p, i) => s + p * i, 0),
        confidence: probs[best],
        legend: Object.fromEntries(q.criteria.map((c, i) => [i, c])),
        probabilities: Object.fromEntries(probs.map((p, i) => [i, p])),
      };
    } else {
      const labels = Object.keys(q.criteria);
      const probs = softmax(labels.map(() => rnd()));
      const best = probs.indexOf(Math.max(...probs));
      answers[name] = {
        type: "choice",
        choice: labels[best],
        confidence: probs[best],
        probabilities: Object.fromEntries(labels.map((l, i) => [l, probs[i]])),
      };
    }
  }
  return {
    status: 200,
    body: { model: "MOCK (not Jev)", answers, usage: { input_tokens: Math.round(text.length / 4) + 400, output_tokens: 0 } },
  };
}

function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}
