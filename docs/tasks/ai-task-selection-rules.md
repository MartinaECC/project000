# AI Task Selection Rules

The first stage of this project focuses on small, safe work loops. The goal is to help the team learn where Codex is useful while keeping human review in control.

## Prefer First

- Repetitive information collection and summarization.
- Draft generation for internal reports, notes, and follow-ups.
- Formatting, cleanup, and conversion of existing materials.
- Data readout and first-pass interpretation where a human owns the conclusion.
- Reminder and task preparation where a human confirms before sending or assigning.

## Avoid First

- Automatic customer commitments.
- Automatic approvals.
- Automatic production data changes.
- Financial, legal, HR, or sensitive personnel decisions.
- Any workflow where a wrong answer would be hard to detect before damage occurs.

## Candidate Scoring

| Dimension | Good sign | Warning sign |
| --- | --- | --- |
| Frequency | Happens daily or weekly. | Rare or one-off. |
| Risk | Human can review before impact. | Direct external or irreversible impact. |
| Input clarity | Source data is known and accessible. | Requires hidden context or judgment. |
| Output clarity | Expected format is easy to describe. | Success is subjective or ambiguous. |
| Reuse | Helps multiple roles or future assistants. | Only useful for one edge case. |

## Assistant Entry Criteria

A task can become an assistant when it has:

- A named owner role.
- A clear trigger phrase or start action.
- Known input sources.
- A reviewable output.
- A human approval point for any action beyond drafting.
- A basic verification method.

