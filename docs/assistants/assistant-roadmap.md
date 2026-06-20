# AI Assistant Roadmap

This roadmap tracks assistants from opportunity discovery to working implementation.

## Stages

| Stage | Purpose | Output |
| --- | --- | --- |
| 1. Role mapping | Understand who does what. | Role and task map. |
| 2. Task screening | Identify high-frequency, low-risk opportunities. | Prioritized task list. |
| 3. Assistant design | Define one small assistant loop. | Assistant spec. |
| 4. Implementation | Build the smallest working workflow. | Code, tests, and operating notes. |
| 5. Review | Check usefulness, risk, and adoption. | Summary and next iteration. |

## Initial Assistant Candidates

These are placeholders until the role map is filled with team-specific work.

| Candidate | Likely owner role | Value | Risk | Notes |
| --- | --- | --- | --- | --- |
| Chat summary assistant | Operations, customer success, BD | Consolidates group discussion into structured notes. | Low | Strong fit for existing DingTalk bot and DWS message tooling. |
| Weekly report draft assistant | Operations, management | Turns messages, tasks, and notes into a report draft. | Low | Should start as draft-only. |
| Customer review assistant | Operations, data, customer success | Creates first-pass customer monthly review material. | Medium | Needs clear data sources and metric definitions. |
| Meeting follow-up assistant | Product, project management, customer success | Extracts decisions and follow-ups from meeting notes. | Low to medium | Task creation should require confirmation. |

## Assistant Spec Template

Each assistant should have:

- Name
- Owner role
- Problem
- Trigger
- Inputs
- Output
- Human review point
- Tool and data dependencies
- Failure handling
- Verification method
- Rollout notes

