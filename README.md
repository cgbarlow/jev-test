# Rubric in, marks out: Jev × NZQA prototype

A quick prototype of the highest-leverage opportunity in [the research](jev-nzqa-research.md):
**AI-assisted marking for any standard from its written criteria alone**, with no labelled data
and no model per standard. This targets the ATS "breadth" scaling problem and the cold-start
problem for the long tail of low-volume standards.

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

## Run

```sh
cp .env.example .env        # add your TYPESAFE_API_KEY
npm start                   # http://localhost:3000
```

This needs Node 20 or later and has no dependencies. The key stays server-side: `server.js`
proxies `/api/systemone` to `https://api.typesafe.ai`.

`npm run mock` runs an offline heuristic stand-in so the UI can be shown without network
access. The UI labels it **MOCK MODE: not Jev**, and its numbers mean nothing.

## Caveats (from the research)

- Jev is US-hosted and not on Bedrock yet. Don't send real learner work until it is
  in-region and a PIA is done.
- Pin a versioned model (`TYPESAFE_MODEL`) once thresholds are tuned.
- Every standard still needs independent validation and fairness testing, including for
  te reo Māori responses. Jev removes the training bottleneck, not the assurance one.
