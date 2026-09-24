const PRICE_PER_M_INPUT = 0.042; // USD per million input tokens; output tokens are free
const RAMP = ["#c9594f", "#e0a44a", "#7bb37f", "#2f7d59"];
const $ = (id) => document.getElementById(id);

const state = {
  stdId: STANDARDS[0].id,
  results: {}, // `${stdId}/${scriptId}` -> { status, answers, usage, ms, raw, error }
  threshold: 0.8,
  mock: false,
  jev: null, // latest known Jev connection state
  inFlight: 0,
  calls: 0,
  url: "",
};

const std = () => STANDARDS.find((s) => s.id === state.stdId);
const key = (s) => `${state.stdId}/${s.id}`;
const levelName = (t) => String(t).split(":")[0];
const rampColor = (i, n) => RAMP[Math.round((i / Math.max(1, n - 1)) * (RAMP.length - 1))];
const pct = (x) => `${Math.round(x * 100)}%`;

// ---- Build one Jev request covering guardrails, every criterion and the overall grade.
function buildQuestions(s) {
  const q = {
    on_topic: {
      type: "noul",
      instructions: `Is the learner response a genuine attempt at this assessment task? Task: "${s.task}"`,
      criteria: { true: "A genuine attempt at the task", false: "Off-topic, blank, nonsense, or only restates the task" },
    },
    safeguarding: {
      type: "noul",
      instructions:
        "Does the learner response contain threats, intent to harm self or others, or a disclosure that needs safeguarding follow-up?",
      criteria: { true: "Needs safeguarding follow-up", false: "No safeguarding concern" },
    },
  };
  s.criteria.forEach((c, i) => {
    q[`criterion_${i + 1}`] = {
      type: "score",
      instructions: { standard: s.title, task: s.task, criterion: c, instruction: "Judge only this criterion." },
      criteria: s.levels,
    };
  });
  q.grade = {
    type: "score",
    instructions: {
      standard: s.title,
      task: s.task,
      criteria: s.criteria,
      instruction: "Award the overall grade for this standard, judged holistically against all criteria.",
    },
    criteria: s.grades.map((g) => `${g.label}: ${g.desc}`),
  };
  return q;
}

async function markScript(s, script) {
  const k = key(script);
  state.results[k] = { status: "pending" };
  state.inFlight++;
  render();
  renderStatus();
  const t0 = performance.now();
  try {
    const res = await fetch("/api/systemone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: `${s.code.split(" ·")[0]} / ${script.id}`,
        state: { assessment_task: s.task, learner_response: script.text },
        questions: buildQuestions(s),
      }),
    });
    const callId = res.headers.get("x-call-id");
    const call = callId ? await fetch(`/api/log/${callId}`).then((r) => r.json()) : null;
    const body = await res.json();
    noteCall(res.ok, res.status, body?.model, callId);
    if (!res.ok) {
      const err = new Error(body?.error?.message || body?.detail?.message || (typeof body?.detail === "string" ? body.detail : body?.detail && JSON.stringify(body.detail)) || body?.error || `HTTP ${res.status}`);
      err.call = call;
      throw err;
    }
    const upstream = Number(res.headers.get("x-upstream-ms"));
    state.results[k] = {
      status: "done",
      answers: body.answers,
      usage: body.usage,
      model: body.model,
      ms: Number.isFinite(upstream) ? upstream : performance.now() - t0,
      call,
    };
  } catch (e) {
    if (!e.call) noteCall(false, 0, null, null, e.message);
    state.results[k] = { status: "error", error: typeof e.message === "string" ? e.message : JSON.stringify(e.message), call: e.call };
  }
  state.inFlight--;
  render();
  renderStatus();
}

// ---- Jev connection status: a real health-check call on load, then updated by every call.
function noteCall(ok, status, model, id, message) {
  state.jev = {
    ok,
    at: new Date(),
    model: model || state.jev?.model,
    id,
    detail: ok ? "" : message || explainStatus(status),
  };
  state.calls++;
}

function explainStatus(status) {
  if (status === 401 || status === 403) return `key rejected (HTTP ${status})`;
  if (status === 422) return "Jev rejected the request shape (HTTP 422)";
  if (status === 429) return "rate limited (HTTP 429)";
  if (status === 502) return "could not reach Jev (HTTP 502)";
  return `HTTP ${status}`;
}

async function checkJev() {
  state.jev = { checking: true };
  renderStatus();
  try {
    const h = await fetch("/api/health", { method: "POST" }).then((r) => r.json());
    state.mock = h.mock;
    state.jev = { ok: h.ok, at: new Date(h.at), model: h.model, id: h.id, ms: h.ms, health: true, detail: h.ok ? "" : explainStatus(h.status) };
  } catch {
    state.jev = { ok: false, at: new Date(), detail: "local server not running" };
  }
  renderStatus();
}

function renderStatus() {
  const j = state.jev;
  const el = $("jevStatus");
  let kind, text;
  if (!j || j.checking) [kind, text] = ["checking", "Checking Jev…"];
  else if (state.mock) [kind, text] = ["mock", "MOCK MODE: not calling Jev"];
  else if (j.ok) [kind, text] = ["live", `Jev live · ${j.model ?? "?"}${j.health ? ` · ${j.ms} ms` : ""}`];
  else [kind, text] = ["down", `Jev not working: ${j.detail}`];
  el.className = `status ${kind}${state.inFlight ? " busy" : ""}`;
  $("jevText").textContent = text;
  $("jevMeta").textContent = j?.at
    ? `${state.inFlight ? `${state.inFlight} call${state.inFlight > 1 ? "s" : ""} in flight · ` : ""}last ${j.health ? "health check" : "call"} ${j.at.toLocaleTimeString()}${j.id ? ` (#${j.id})` : ""} · click to re-check`
    : "";
}

async function markAll() {
  const s = std();
  readRubric();
  $("run").disabled = true;
  $("err").textContent = "";
  const queue = [...s.samples];
  const worker = async () => {
    while (queue.length) await markScript(s, queue.shift());
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  $("run").disabled = false;
}

// ---- Interpret answers.
function gradeOf(r, s) {
  const g = r.answers.grade;
  const probs = s.grades.map((_, i) => g.probabilities[i] ?? 0);
  const best = probs.indexOf(Math.max(...probs));
  const sorted = [...probs].sort((a, b) => b - a);
  return { label: s.grades[best].label, probs, confidence: g.confidence ?? sorted[0], runnerUp: sorted[1] ?? 0 };
}

function triage(r, s) {
  const a = r.answers;
  const g = gradeOf(r, s);
  if (a.safeguarding?.noul >= 0.5) return { kind: "bad", label: "Safeguarding: escalate now", reasons: [`p=${a.safeguarding.noul.toFixed(2)}`] };
  const reasons = [];
  if (a.on_topic && a.on_topic.noul < 0.5) reasons.push(`possibly off-topic (p on-topic ${a.on_topic.noul.toFixed(2)})`);
  if (g.confidence < state.threshold) reasons.push(`grade confidence ${pct(g.confidence)} below ${pct(state.threshold)}`);
  if (reasons.length) return { kind: "warn", label: "Human review", reasons };
  return { kind: "ok", label: "Auto-accept", reasons: [] };
}

// ---- Rendering.
function renderTabs() {
  $("tabs").innerHTML = STANDARDS.map(
    (s) => `<button class="tab ${s.id === state.stdId ? "active" : ""}" data-id="${s.id}">
      <b>${esc(s.title)}</b><small>${esc(s.code)} · ${esc(s.volume)}</small></button>`
  ).join("");
  $("tabs").querySelectorAll(".tab").forEach((b) =>
    b.addEventListener("click", () => {
      readRubric();
      state.stdId = b.dataset.id;
      loadRubric();
      render();
    })
  );
}

function loadRubric() {
  const s = std();
  $("task").value = s.task;
  $("criteria").value = s.criteria.join("\n");
  $("grades").innerHTML = s.grades.map((g) => `<span title="${esc(g.desc)}">${esc(g.label)}</span>`).join("");
  renderTabs();
}

function readRubric() {
  const s = std();
  s.task = $("task").value.trim() || s.task;
  const crit = $("criteria").value.split("\n").map((l) => l.trim()).filter(Boolean);
  if (crit.length) s.criteria = crit;
}

function dist(probs, n) {
  return `<div class="dist">${probs
    .map((p, i) => `<i style="width:${(p * 100).toFixed(1)}%;background:${rampColor(i, n)}" title="${pct(p)}"></i>`)
    .join("")}</div>`;
}

function renderCard(s, script) {
  const r = state.results[key(script)];
  const open = document.querySelector(`.card[data-id="${script.id}"]`)?.classList.contains("open");
  let verdict = `<div class="conf">Reference: ${esc(script.ref || "–")}</div>`;
  let body = "";
  if (r?.status === "pending") verdict = `<div class="conf">Marking…</div>`;
  if (r?.status === "error") verdict = `<div class="badge bad">Error</div><div class="reasons">${esc(r.error)}</div>`;
  if (r?.status === "done") {
    const g = gradeOf(r, s);
    const t = triage(r, s);
    const agree = script.ref ? (g.label === script.ref ? `<span class="match y">✓ matches reference</span>` : `<span class="match n">✗ reference: ${esc(script.ref)}</span>`) : "";
    verdict = `<div class="grade">${esc(g.label)}</div>
      <div class="conf">confidence ${pct(g.confidence)} · ${Math.round(r.ms)} ms</div>
      <div class="badge ${t.kind}">${t.label}</div>
      ${t.reasons.map((x) => `<div class="reasons">${esc(x)}</div>`).join("")}
      <div>${agree}</div>`;
    const crit = s.criteria
      .map((c, i) => {
        const a = r.answers[`criterion_${i + 1}`];
        if (!a) return "";
        const probs = s.levels.map((_, j) => a.probabilities[j] ?? 0);
        const best = probs.indexOf(Math.max(...probs));
        return `<div class="name">${esc(c)} <span class="conf">· ${esc(levelName(s.levels[best]))} (${pct(probs[best])})</span></div>${dist(probs, s.levels.length)}`;
      })
      .join("");
    body = `<div class="crit"><div class="name"><b>Overall grade</b></div>${dist(g.probs, s.grades.length)}${crit}</div>
      <div class="guards">
        <span>On-topic p=${r.answers.on_topic?.noul?.toFixed(2)}</span>
        <span>Safeguarding p=${r.answers.safeguarding?.noul?.toFixed(2)}</span>
        <span>${r.usage?.input_tokens ?? "?"} input tokens · US$${(((r.usage?.input_tokens ?? 0) * PRICE_PER_M_INPUT) / 1e6).toFixed(7)}</span>
        <span>model ${esc(r.model)}</span>
      </div>`;
  }
  const legend = r?.status === "done"
    ? `<div class="legend">${s.levels.map((l, i) => `<span><i style="background:${rampColor(i, s.levels.length)}"></i>${esc(levelName(l))}</span>`).join("")}</div>`
    : "";
  return `<div class="card ${r?.status === "pending" ? "pending" : ""} ${open ? "open" : ""}" data-id="${script.id}">
    <div class="chead"><div class="cid">${esc(script.id)}</div><div class="excerpt">${esc(script.text)}</div><div class="verdict">${verdict}</div></div>
    ${body}
    <div class="detail">${legend}<pre>${esc(script.text)}</pre>
      ${r?.status === "done" ? traceTable(r, s) : ""}
      ${r?.call ? callBlock(r.call) : ""}
    </div></div>`;
}

// ---- Audit trail: show how each number on the card was read from Jev's raw answer.
function traceTable(r, s) {
  const rows = [];
  for (const [name, a] of Object.entries(r.answers)) {
    if (a.type === "noul") {
      const rule = name === "safeguarding" ? "escalate if ≥ 0.50" : name === "on_topic" ? "flag if < 0.50" : "";
      rows.push(`<tr><td>${esc(name)}</td><td colspan="3">noul (probability the statement is true)</td><td class="num">${a.noul?.toFixed(2)}</td><td>${rule}</td></tr>`);
      continue;
    }
    const sent = name === "grade" ? s.grades.map((g) => `${g.label}: ${g.desc}`) : s.levels;
    const probs = Object.entries(a.probabilities ?? {});
    const best = probs.reduce((m, e) => (e[1] > m[1] ? e : m), ["", -1])[0];
    probs.forEach(([i, p], n) => {
      const back = a.legend?.[i];
      const ok = back === undefined ? "no legend returned" : back === sent[i] ? "✓ label matches" : `✗ MISMATCH: Jev says "${back}"`;
      rows.push(`<tr class="${i === best ? "best" : ""}">
        ${n === 0 ? `<td rowspan="${probs.length}">${esc(name)}<br><small>score ${a.score?.toFixed(2)} · confidence ${a.confidence?.toFixed(2)}</small></td>` : ""}
        <td class="num">${esc(i)}</td><td>${esc(levelName(sent[i] ?? "?"))}</td>
        <td class="${back !== undefined && back !== sent[i] ? "bad" : "muted"}">${esc(ok)}</td>
        <td class="num">${Number(p).toFixed(2)}</td><td>${i === best ? "← highest" : ""}</td></tr>`);
    });
  }
  return `<label>How the card was read from Jev's answer</label>
    <div class="hint">Highlighted rows are the highest probability. The grade shown is that row's label. Triage uses Jev's own <code>confidence</code> field, which is not the same as the highest probability.</div>
    <table class="trace"><tr><th>Question</th><th>Index</th><th>Label we sent</th><th>Legend check</th><th>Value</th><th></th></tr>${rows.join("")}</table>`;
}

function callBlock(c) {
  const pretty = (t) => {
    try {
      return JSON.stringify(JSON.parse(t), null, 2);
    } catch {
      return t;
    }
  };
  return `<label>Call #${c.id} · ${esc(c.at)} · HTTP ${c.status} · ${c.ms} ms · ${esc(c.url)}</label>
    <div class="row gap"><button class="mini" data-curl="${c.id}">Copy as curl</button><span class="hint">Re-runs this exact request outside the app. Needs <code>TYPESAFE_API_KEY</code> set in your shell.</span></div>
    <label>Exact request sent to Jev</label><pre class="json">${esc(pretty(c.requestBody))}</pre>
    <label>Raw response from Jev (formatted)</label><pre class="json">${esc(pretty(c.responseText))}</pre>
    <details><summary>Response bytes exactly as received</summary><pre class="json">${esc(c.responseText)}</pre></details>`;
}

function curlFor(c) {
  return `curl -sS ${c.url} \\\n  -H "Authorization: Bearer $TYPESAFE_API_KEY" \\\n  -H 'Content-Type: application/json' \\\n  --data-binary @- <<'JEV_EOF'\n${c.requestBody}\nJEV_EOF`;
}

function renderStats() {
  const s = std();
  const done = s.samples.map((x) => [x, state.results[key(x)]]).filter(([, r]) => r?.status === "done");
  $("sMarked").textContent = done.length;
  if (!done.length) {
    ["sAuto", "sAgree", "sLatency", "sCost"].forEach((id) => ($(id).textContent = "–"));
    return;
  }
  const auto = done.filter(([, r]) => triage(r, s).kind === "ok").length;
  const withRef = done.filter(([x]) => x.ref);
  const agree = withRef.filter(([x, r]) => gradeOf(r, s).label === x.ref).length;
  const ms = done.map(([, r]) => r.ms).sort((a, b) => a - b);
  const tokens = done.reduce((a, [, r]) => a + (r.usage?.input_tokens ?? 0), 0) / done.length;
  $("sAuto").textContent = pct(auto / done.length);
  $("sAgree").textContent = withRef.length ? `${agree}/${withRef.length}` : "–";
  $("sLatency").textContent = state.mock ? "n/a" : `${Math.round(ms[Math.floor(ms.length / 2)])} ms`;
  $("sCost").textContent = `US$${((tokens * 1e5 * PRICE_PER_M_INPUT) / 1e6).toFixed(2)}`;
}

function render() {
  const s = std();
  $("results").innerHTML = s.samples.map((x) => renderCard(s, x)).join("");
  $("results").querySelectorAll(".chead").forEach((h) => h.addEventListener("click", () => h.parentElement.classList.toggle("open")));
  $("results").querySelectorAll("[data-curl]").forEach((b) =>
    b.addEventListener("click", async () => {
      const r = Object.values(state.results).find((x) => x.call?.id === Number(b.dataset.curl));
      await navigator.clipboard.writeText(curlFor(r.call));
      b.textContent = "Copied ✓";
    })
  );
  renderStats();
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---- Wire up.
$("thr").addEventListener("input", (e) => {
  state.threshold = Number(e.target.value);
  $("thrVal").textContent = pct(state.threshold);
  render();
});
$("run").addEventListener("click", markAll);
$("addBtn").addEventListener("click", () => {
  const text = $("newScript").value.trim();
  if (!text) return;
  readRubric();
  const s = std();
  const script = { id: `N-${String(s.samples.length + 1).padStart(2, "0")}`, ref: "", text };
  s.samples.push(script);
  $("newScript").value = "";
  markScript(s, script);
});

fetch("/api/config")
  .then((r) => r.json())
  .then((c) => {
    state.mock = c.mock;
    state.url = c.url;
  })
  .catch(() => {});
$("jevStatus").addEventListener("click", checkJev);
checkJev();

$("thrVal").textContent = pct(state.threshold);
loadRubric();
render();
