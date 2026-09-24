# Rubric in, marks out: Jev × NZQA prototype

> **NOT ENDORSED BY NZQA - CONCEPT ONLY.** See [DISCLAIMER.md](DISCLAIMER.md).

A quick prototype of the highest-leverage opportunity in [the research](research/jev-nzqa-research.md):
**AI-assisted marking for any standard from its written criteria alone**, with no labelled data
and no model per standard. This targets the ATS "breadth" scaling problem and the cold-start
problem for the long tail of low-volume standards.

<img width="1287" height="946" alt="image" src="https://github.com/user-attachments/assets/f0407fa1-04bd-44d5-be93-2b29567e0118" />


For each script, **one** TypeSafe Jev call (`POST /v1/systemone`) returns:

- **Guardrails** (`noul`): is it a genuine attempt at the task, and does it need safeguarding
  follow-up? This replaces the Claude-on-Bedrock guardrail step.
- **Criterion scores** (`score`): one per performance criterion, with a probability distribution.
- **Overall grade** (`score`): Not Achieved / Achieved (/ Merit / Excellence).

Calibrated confidence then **triages** each script: auto-accept, human review (low confidence
or possibly off-topic), or escalate (safeguarding). Dragging the threshold slider re-triages
instantly without new API calls. This is the "people focus on the uncertain cases" story.

Standards included:

1. **US 32405 Literacy Writing** is the real Year 10 co-requisite standard that ATS marks
   today. Its criteria are paraphrased from performance criteria 1.1–1.4. Verify the wording
   against NZQA's published standard before showing it externally.
2. **Level 3 Ag & Hort (illustrative)** is a low-volume A/M/E standard that would never justify
   a trained model.
3. **Build a new standard in 60 seconds**: edit the task and criteria, paste a script, and mark it.

All learner responses are **synthetic**. Reference grades are the author's judgement.

## Quickstart (WSL / Ubuntu)

**1. Install Node.js 20 or later** (skip if `node --version` already shows v20+):

```sh
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
```

**2. Clone the repo and switch to the prototype branch.** The repo is private, so use an
authenticated clone (GitHub CLI `gh auth login`, an SSH key, or a personal access token):

```sh
git clone https://github.com/cgbarlow/jev-test.git
cd jev-test
git checkout claude/exciting-darwin-2j247y
```

**3. Add your TypeSafe API key.** `.env` is gitignored, so the key is never committed:

```sh
cp .env.example .env
nano .env        # set TYPESAFE_API_KEY=your-key
```

**4. Start the server.** There's nothing to `npm install`:

```sh
npm start
```

You should see `Jev marking prototype on http://localhost:3000 (jev-latest)`.

**5. Open http://localhost:3000 in your Windows browser.** WSL forwards localhost
automatically. Pick a standard, then click **Mark all scripts**.

To demo without the API, run `npm run mock` instead. The UI shows **MOCK MODE: not Jev**, and
its numbers are made up.

### Seeing what Jev is actually doing

- **Status light (top right).** On page load the server makes one tiny real Jev call. Green
  means the key, network and model all work, and shows the resolved model version (for
  example `jev-1.13.0`). Red says why: key rejected, unreachable, or request rejected. Amber
  means mock mode. The light pulses while calls are in flight and updates after every call.
  Click it to check again.
- **Per script.** Click a card to open it. You'll see:
  - how each grade and criterion was read from Jev's answer: the index, the label we sent,
    whether Jev's returned `legend` matches it, and the probability
  - the exact request body sent
  - the response exactly as received
  - **Copy as curl**, which re-runs the identical request from your own shell
- **Call log ↗** (`/log.html`) lists every call live, newest first. Every exchange is also
  appended to `logs/jev-calls.jsonl`, which is gitignored and never contains the API key.
  That file includes learner text, so the synthetic-only rule applies to it too.

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Set TYPESAFE_API_KEY…` on start | `.env` is missing or the key line is empty |
| Red light: `key rejected (HTTP 401)` | The key is wrong, rotated, or lacks access |
| Cards show `Error` with a model message | Set `TYPESAFE_MODEL` in `.env` to a model your account has |
| `EADDRINUSE` | Port 3000 is taken: run `PORT=3001 npm start` |
| Page won't load from Windows | Try `http://127.0.0.1:3000`, or run `wsl --shutdown` and start again |

## Caveats (from the research)

- Jev is US-hosted and not on Bedrock yet. Don't send real learner work until it is
  in-region and a PIA is done.
- Pin a versioned model (`TYPESAFE_MODEL`) once thresholds are tuned.
- Every standard still needs independent validation and fairness testing, including for
  te reo Māori responses. Jev removes the training bottleneck, not the assurance one.
