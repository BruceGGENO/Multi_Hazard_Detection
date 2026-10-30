# Hackathon submission checklist

## Repository and reproducibility

- [ ] Complete the project/team fields in the organizer's submission form.
- [ ] Validate setup from a fresh clone on a second machine using the root README.
- [ ] Commit source, npm lockfile, configuration templates, documentation and approved data assets.
- [ ] Confirm dataset creator, source URL/DOI, redistribution license and encoding dictionary in [data/README.md](../data/README.md). **Do not claim these are verified until the team supplies evidence.**
- [ ] Confirm the CSV is permitted in a public repository; if not, remove it before publishing and document an authorized acquisition path and required checksum.
- [ ] Select a source-code license approved by all contributors before claiming the project is open source. No license has been inferred or assigned automatically.
- [ ] Run typecheck, safety tests, build, workflow tests and Python tests.
- [ ] Ensure CHW role migration is applied on the demonstration database.
- [ ] Check `git diff --cached --name-only`: no .env.local, passwords, backup dumps, private eligibility files or recordings containing personal data.
- [ ] Use synthetic demonstration accounts/reports with a clear demo label; do not present fabricated sensor observations as live measurements.
- [ ] Tag or record the exact tested commit in the organizer's submission. No tag/push is performed automatically.

## Desktop walkthrough: maximum 3 minutes

Record the browser's desktop command-center interface at a readable resolution, ideally 1920×1080. Close email, password managers and private tabs; disable notifications. Hide secrets, student evidence and personal phone numbers. Use separate reporter/officer accounts because self-approval is intentionally prohibited.

| Time | Screen and action | Narration goal |
| --- | --- | --- |
| 0:00–0:20 | Overview and map | State the Rwanda climate-resilience problem and the local hackathon scope. |
| 0:20–0:55 | Officer Prediction tab | Explain encoded CSV features; vary codes, calculate susceptibility, publish a located warning. |
| 0:55–1:20 | Overview map and marker panel | Show pulsing flags, risk level, probability and recorded metadata. Identify the OSM basemap accurately. |
| 1:20–1:45 | Reporter account and submission portal | Submit a located report and show Pending Review. |
| 1:45–2:10 | Different district officer account | Approve the report; mention rejection with a reason. Show the reporter's live status changing. |
| 2:10–2:35 | Communications | Record mock dispatch; visibly show **Simulated — no message sent.** |
| 2:35–2:55 | Overview and limitations | Summarize role security, local model and local persistence. State that satellite imagery, real SMS and vulnerability indices are outside this edition. |
| 2:55–3:00 | Repository/project title | Close with the repository reference and team attribution. |

Rehearse account switching and prepare consented synthetic fixtures before recording. This file provides a storyboard, not an existing video artifact. No video has been generated.

## Video handoff

- [ ] Duration is at most 3:00 including intro/outro.
- [ ] Browser text, map panels and simulation badge are legible.
- [ ] Audio/captions accurately distinguish observations from model estimates.
- [ ] No satellite/live-SMS/operational certification claims appear.
- [ ] Playback and organizer access permissions verified.
- [ ] Final video URL entered into the organizer's form (currently not supplied).

## Eligibility

Follow [the private verification workflow](eligibility/README.md). Submit evidence privately; the public repository should contain only these instructions.
