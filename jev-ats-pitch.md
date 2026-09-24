# Jev in the ATS Roadmap

## Elevator pitch

NZQA's automated marking works, but every new standard needs its own trained model, which won't scale beyond a few high-volume standards. Jev is a new type of AI model that marks against written criteria without task-specific training, returning a grade with a calibrated confidence score. Used alongside the existing model, it could extend AI-assisted marking and moderation to the long tail of standards, with people focused on the uncertain cases.

## Executive summary

### Context

- ATS has marked Literacy Writing (32405) live since AE1 2026. ClearPoint's August 2026 review found it sound and able to scale in volume.
- Each new standard needs its own fine-tuned model: human-marked training data, training, validation, approval, and retraining before every event. The review flags manual training and approval as bottlenecks for a small team.

### Opportunity

- Jev (TypeSafe AI, September 2026) classifies rather than generates text. It takes a response plus rubric criteria as typed questions and returns grades with calibrated probabilities. No per-task training.
- A marking rubric becomes configuration, not a data science project.

### What it could unlock

- Replacing the LLM guardrail checks with a faster, simpler classifier.
- Targeting human QA at scripts where Jev and ATS disagree.
- Automated regression testing of retrained models.
- AI-assisted marking for low-volume standards that can't justify a trained model.
- Full-coverage moderation of internally assessed work.
- Criterion-level feedback and low-cost practice assessments.

### Not proposed

- Replacing the ATS scoring model for literacy. It is validated and fit for purpose.

### Preconditions

- In-region hosting. Jev currently runs in the US and is not yet on Bedrock.
- Vendor maturity and published evidence.
- Independent validation and fairness testing per standard, including te reo Māori responses.
- Privacy Impact Assessment and fit with NZQA architecture principles.

### Roadmap

1. **Now:** shadow trial on guardrails and QA selection using synthetic or released data, with no effect on results.
2. **Once in-region:** live use for guardrails and QA targeting.
3. **Then:** pilot on one low-volume standard and one moderation use case, independently validated.

**Ask:** approve a small shadow trial and monitor in-region availability.
