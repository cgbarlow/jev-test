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
const LOG_FILE = path.join(__dirname, "logs", "jev-calls.jsonl");
const LOG_KEEP = 500;

// Every call to Jev is recorded exactly as it went over the wire (request body as sent,
// response body as received, byte for byte) so results can be audited or replayed.
// The Authorization header is never recorded.
const callLog = [];
let callSeq = 0;

if (!API_KEY && !MOCK) {
  console.error("Set TYPESAFE_API_KEY (env or .env), or run with JEV_MOCK=1 for offline mode.");
  process.exit(1);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

http
  .createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/api/config") {
        return json(res, 200, { model: MOCK ? "mock" : MODEL, mock: MOCK, url: `${BASE_URL}/v1/systemone` });
      }
      if (req.method === "POST" && req.url === "/api/health") {
        // A real, minimal Jev call (about 300 input tokens) proving the key, network and model all work.
        const requestBody = JSON.stringify({
          model: MODEL,
          state: "The sky is blue on a clear day.",
          questions: { sanity: { type: "noul", instructions: "Is this statement true?", criteria: { true: "True", false: "False" } } },
        });
        const t0 = performance.now();
        const upstream = MOCK ? { status: 200, text: JSON.stringify({ model: "MOCK (not Jev)", answers: {} }) } : await callTypeSafe(requestBody);
        const entry = recordCall({ label: "health check", requestBody, upstream, ms: Math.round(performance.now() - t0) });
        return json(res, 200, { ok: upstream.status === 200, mock: MOCK, status: upstream.status, model: entry.model, ms: entry.ms, id: entry.id, at: entry.at, response: entry.responseText });
      }
      if (req.method === "GET" && req.url === "/api/log") {
        return json(res, 200, callLog.map(({ requestBody, responseText, ...summary }) => summary).reverse());
      }
      const logMatch = req.method === "GET" && req.url.match(/^\/api\/log\/(\d+)$/);
      if (logMatch) {
        const entry = callLog.find((e) => e.id === Number(logMatch[1]));
        return entry ? json(res, 200, entry) : json(res, 404, { error: "call not in log (server restarted?)" });
      }
      if (req.method === "POST" && req.url === "/api/systemone") {
        const body = JSON.parse(await readBody(req));
        const payload = { model: MODEL, state: body.state, questions: body.questions };
        const requestBody = JSON.stringify(payload);
        const t0 = performance.now();
        const upstream = MOCK ? mockSystemOne(payload) : await callTypeSafe(requestBody);
        const ms = Math.round(performance.now() - t0);
        const entry = recordCall({ label: body.label, requestBody, upstream, ms });
        res.setHeader("x-upstream-ms", ms);
        res.setHeader("x-call-id", entry.id);
        res.writeHead(upstream.status, { "Content-Type": "application/json" });
        return res.end(upstream.text);
      }
      if (req.method === "GET") return serveStatic(req, res);
      json(res, 405, { error: "method not allowed" });
    } catch (err) {
      console.error(err);
      json(res, 502, { error: String(err.message || err) });
    }
  })
  .listen(PORT, () => console.log(`Jev marking prototype on http://localhost:${PORT} (${MOCK ? "MOCK mode" : MODEL})`));

async function callTypeSafe(requestBody) {
  try {
    const r = await fetch(`${BASE_URL}/v1/systemone`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: requestBody,
      signal: AbortSignal.timeout(20000),
    });
    const text = await r.text();
    try {
      JSON.parse(text);
      return { status: r.status, text };
    } catch {
      return { status: r.status, text: JSON.stringify({ error: text }), nonJson: true, rawText: text };
    }
  } catch (err) {
    // Network failure or timeout: nothing came back from Jev.
    return { status: 502, text: JSON.stringify({ error: String(err.message || err) }), transportError: true };
  }
}

function recordCall({ label, requestBody, upstream, ms }) {
  const entry = {
    id: ++callSeq,
    at: new Date().toISOString(),
    label: label || null,
    mock: MOCK,
    url: MOCK ? "(mock, no network call)" : `${BASE_URL}/v1/systemone`,
    status: upstream.status,
    ms,
    transportError: !!upstream.transportError,
    requestBody,
    responseText: upstream.rawText ?? upstream.text,
  };
  try {
    entry.model = JSON.parse(upstream.text).model ?? null;
  } catch {
    entry.model = null;
  }
  callLog.push(entry);
  if (callLog.length > LOG_KEEP) callLog.shift();
  fs.mkdir(path.dirname(LOG_FILE), { recursive: true }, () =>
    fs.appendFile(LOG_FILE, JSON.stringify(entry) + "\n", (err) => err && console.error("log write failed:", err.message))
  );
  console.log(`[jev #${entry.id}] ${entry.label || "-"} -> ${entry.status} in ${ms} ms${entry.model ? ` (${entry.model})` : ""}`);
  return entry;
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
  const body = { model: "MOCK (not Jev)", answers, usage: { input_tokens: Math.round(text.length / 4) + 400, output_tokens: 0 } };
  return { status: 200, text: JSON.stringify(body) };
}

function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}
