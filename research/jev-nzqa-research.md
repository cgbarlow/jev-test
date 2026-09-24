# Research notes: TypeSafe Jev and NZQA ATS

Compiled 25 September 2026. Jev figures are early and mostly vendor or builder reported; verify before relying on them.

## 1. TypeSafe Jev

### What it is

- A "System One model" from TypeSafe AI. It does not generate text. You send state (text, JSON or an array) plus typed questions, and it returns typed answers with probabilities and a confidence score, in one parallel pass.
- Three question types: choice, score, yes/no.
- Output is constrained to the answer space you define, so it cannot return invalid or out-of-schema values. It can still pick the wrong answer. "No hallucination" means no schema errors, not no errors.
- Up to 255 options per choice question, including two reserved options (reobserve and abstain), so the model can decline to decide.
- Returns decisions only, no reasoning or explanation.
- Reportedly trained with reinforcement learning for calibrated decisions.
- Name: "System One" after Kahneman's fast, intuitive thinking; "Jev" after economist William Stanley Jevons (efficiency drives demand).

### Company

- TypeSafe AI, San Francisco, founded 2024 by Diogo Almeida (CEO, ex-OpenAI, worked on RLHF, InstructGPT, ChatGPT, GPT-4), Erik Gafni and Sasha Sheng.
- Limited early access released 15 September 2026, with a US$40m seed round led by DCVC (reported valuation US$200m).
- No published architecture, weights or technical paper. TypeSafe publishes a per-version page of known weaknesses.

### Performance and cost

- Latency roughly 70 to 500 ms per call.
- Pricing: about US$0.042 per million input tokens; output tokens free.
- Vendor claims up to 200x faster and 400x cheaper than comparable LLMs on classification; TypeSafe says headline gains sit toward the upper end of real-world results.
- Good Start Labs test (via Langfuse): 6,003 rubric checks. Jev agreed with Claude Fable 5.1 91.5% of the time at US$160 per million graded answers, versus US$33,000 (Fable 5.1), US$400 (GPT-5.6 Luna) and US$1,600 (Gemini 3.8 Flash). DeepSeek V4.1 Flash agreed 93.5% at US$260.

### Availability

- TypeSafe API, OpenRouter, Requesty (jev-1.13.0), LiteLLM pass-through, LangChain (langchain-typesafe), Pydantic AI, and jev-code for coding agents.
- Not on Amazon Bedrock yet; developers are publicly asking when.
- Service currently based on the US West Coast.
- Pin a versioned model ID when thresholds are tuned; "latest" aliases can change behaviour.

### Good fits

Routing, triage, guardrails, PII detection, eval verdicts, rubric checks: small, high-volume decisions that don't need a frontier model.

## 2. NZQA Automated Text Scoring (ATS)

Source: ClearPoint, *AI Literacy Marking Tool Technical Review Report*, August 2026 (Commercial in Confidence).

### Scope and status

- Marks the Co-requisite Literacy Writing standard (32405). First live run in Assessment Event 1 (AE1) 2026. Two ATS events a year.
- Built with AWS Professional Services, aligned to the AWS Well-Architected Framework.
- Review ran 22 June to 24 July 2026, feedback window to 26 August. 75 observations, 10 findings, 5 recommendations.
- Overall verdict: well suited to current production use; address automation and operational documentation before scaling.

### The scoring model

- Fine-tuned DeBERTa-v3-large (Microsoft, MIT licence), built from Kaggle notebooks (Apache 2.0).
- Trained by NZQA's data science team in Databricks, exported to S3, ingested into the SageMaker model registry.
- Four approvers; promotion through dev, QA, non-prod and prod. A fifth account hosts a production registry intended to be shared with future models.
- Retrained before each major event with augmented data selection.
- Validated by NZCER at rubric level as consistent with human marking.
- New standards are supported by hosting further models, so effectively one model per standard.

### Inference pipeline

Manual download from external provider → S3 → Step Function → check and clean → Lambdas → SageMaker compute → results to S3 → manual results check → send. Runs in ap-southeast-2.

### Guardrails

- Relevance (on-topic) and harmful-intent checks run on Amazon Bedrock batch with Claude Sonnet 4.6, with fallback and retry logic.
- NZQA is satisfied with accuracy, runtime and cost, and chose not to investigate smaller or fine-tuned alternatives.

### Other points

- The "LLM Explainer" was retired: AI marking classed as medium risk, no requirement for individual-level explainability.
- Fairness: NZCER evaluates externally each event; in-house capability emerging, framework (thresholds, ownership, response path) not yet documented.
- Human QA uses a script selection framework.

### Findings (IS) and recommendations (R)

- IS-1 / R-001: no automated code quality or security gate on pull requests.
- IS-2, IS-8 / R-005: ATS-specific support arrangements and operational docs (runbooks, failure modes, fault diagnosis) incomplete.
- IS-3, IS-4 / R-002: learner responses can't be retrieved programmatically and need manual cleaning.
- IS-6, IS-7 / R-003: model training, testing and approval are manual.
- IS-5, IS-9, IS-10 / R-004: inference runs manually orchestrated via the AWS console; no re-run with old model versions; weak run naming.

### Scaling

- Volume and frequency: scales well (serverless, ephemeral compute).
- Breadth (more standards): scales poorly. Each standard needs labelled data, training, validation, approval and retraining, all on a small team. New standards can't be AI-marked until enough have been human-marked (cold start).

## 3. Background: what a "standard" is

A defined unit of learning in NZ's qualifications system, with a number, criteria for what a student must show, and credits toward NCEA. Co-requisite standards (literacy, numeracy, or te reo Māori equivalents) must be passed to gain NCEA at any level. Subject standards are usually graded Not Achieved, Achieved, Merit or Excellence; co-requisites are Achieved or Not Achieved. External standards are marked by NZQA; internal standards are marked by teachers and moderated by NZQA on a sample basis. There are thousands of standards, most low volume.

## 4. Analysis: Jev and ATS

### Near-term fits (in order)

1. **Guardrails:** yes/no checks suit Jev exactly. Removes LLM parsing and retry logic; calibrated thresholds for routing borderline scripts to humans. Cost saving is minor at two events a year.
2. **Human QA selection:** Jev as independent second marker per rubric criterion; disagreement or low confidence pulls scripts into the human sample.
3. **Model approval testing:** automated checks on a fixed test set when retraining.
4. **New standards:** a no-training baseline for low-volume standards.

### Not a fit

Replacing the literacy scoring model. It is purpose-built, trained on NZ marked scripts, validated by NZCER, runs in-region, and is owned and auditable by NZQA.

### Longer-term potential

- Full-coverage moderation of internal assessment.
- The long tail of low-volume standards.
- Consensus marking: accept where ATS and Jev agree with high confidence, send disagreements to humans.
- Criterion-level feedback without an LLM explainer.
- Low-cost formative and on-demand assessment.
- Operational triage (reconsiderations, special assessment conditions, irregularities, correspondence).

### Blockers

- Sovereignty: US-hosted, not on Bedrock; student data would leave NZ/AU. Needs a PIA and conflicts with NZQA's single-provider (AWS) principle.
- Maturity: weeks old, no published architecture or paper.
- Unproven on NZ student writing and te reo Māori.
- Every new standard still needs independent validation and fairness testing. Jev removes the training bottleneck, not the assurance one.

### Suggested path

Shadow trial on guardrails and QA selection using synthetic or released data now; live use once in-region; then a pilot on one low-volume standard and one moderation use case.

## Sources

- ClearPoint, AI Literacy Marking Tool Technical Review Report, August 2026 (provided document)
- [Jev (AI model) - Wikipedia](https://en.wikipedia.org/wiki/Jev_(AI_model))
- [TypeSafe: Introducing System One Models and Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [The Register: Shut up and calculate](https://www.theregister.com/devops/2026/09/23/shut-up-and-calculate-jevs-new-ai-primitives-for-coders/5298431)
- [Langfuse: Using TypeSafe's Jev for evals](https://langfuse.com/blog/2026-09-18-using-typesafes-jev-for-evals)
- [LangChain: Building a harness with Jev](https://www.langchain.com/blog/building-a-harness-with-jev)
- [daily.dev: Jev overview](https://daily.dev/posts/jev---the-ultimate-classification-model--adcdu4y6u)
- [TypeSafe Jev project reference (gist)](https://gist.github.com/pjburnhill/adf8d28efcad9df037bfdece178ef965)
- [Requesty: TypeSafe Jev explained](https://www.requesty.ai/blog/typesafe-jev-explained)
- [LiteLLM: TypeSafe pass-through](https://docs.litellm.ai/docs/pass_through/typesafe)
- [Pydantic AI: TypeSafe](https://pydantic.dev/docs/ai/models/typesafe/)
- [jev-code (GitHub)](https://github.com/FrancoisChastel/jev-code)
- [X: Jev on Bedrock question](https://x.com/theBuoyantMan/status/2102353433860989070)
