---
name: nuovo-file-cassetto
description: Creates the file for an event in the project's documentation drawers from the drawer's template, never pre-filled - a decision (docs/decisions), a client or stakeholder request that does not close in this turn (docs/requests), an incident with impact even if already fixed (docs/incidents), a review thread with an external AI reviewer such as Codex (docs/reviews). Use it on your own the moment the event happens, even if nobody says "ADR", "cassetto" or the drawer name - e.g. "abbiamo deciso di...", "scegliamo X invece di Y", "il cliente chiede... ci risponde la settimana prossima", "in produzione non funziona", "si è rotto il deploy", "fai rivedere il piano a Codex", "apri una revisione". Also when answering or closing an existing review thread. Not for tech-debt entries (they go in docs/tech-debt.md), not for proposals to the ICT master (proposta-ict-new), not for HANDOFF.md or STATUS.md (salva-memoria).
argument-hint: "[decisione|richiesta|incidente|revisione] <slug>"
---

# nuovo-file-cassetto

One skill for the four ADR-style drawers. The drawer rules of the family contract (*Documentation layout*: when a file is born, plan promotion, issue tracker) apply; this skill holds the templates and the mechanics.

## Modes

| The conversation shows... | Drawer | Template | Initial `stato` |
|---|---|---|---|
| a decision taken: a choice among alternatives on architecture, stack, convention, process | `decisions/` | `templates/decisione.md` | `aperta` |
| a client or stakeholder request that does not close in this turn | `requests/` | `templates/richiesta.md` | `aperta` |
| an anomaly with impact (production, users, data), even if hot-fixed | `incidents/` | `templates/incidente.md` | `in-corso` |
| a plan or a diff to be reviewed by an external AI, or an answer to an open review | `reviews/` | `templates/revisione.md` | `aperta` |

If the event fits two drawers, ask in prose which one (one question, no buttons).

## Flow

1. **Drawer root**: what the per-repo `CLAUDE.md` declares; otherwise `Docs/` if that folder exists (legacy family), else `docs/`.
2. **Date and slug**: today's date from the session context ("Today's date") or `Get-Date`, never from memory. Slug in Italian kebab-case, 2-5 words; if not obvious, ask.
3. **Path** `<root>/<drawer>/<date>-<slug>.md`. **Stop if it exists** and ask for another slug; a second review round on the same object is a section in the existing file, never a new file. Create the drawer folder if missing. A subfolder only for a plan promoted per the contract threshold (declared with the user) or a review with attachments (`<date>-<slug>/review.md`).
4. **Write** the template from `${CLAUDE_SKILL_DIR}/templates/`, replacing `<oggi>`, `<slug>` and the title; every placeholder stays as it is. For a review, fill `agente`, `oggetto`, `slice` from the arguments and, when Claude asks for the review, the *Richiesta* section (the reviewer's brief).
5. **Reviews only**: add the row at the top of `<root>/reviews/README.md` (date, linked id, reviewer, object, `stato`, empty outcome); create the README with a header saying Claude keeps it by hand if it does not exist. Update the row at every `stato` change. Thread rules: `references/revisioni.md`.
6. **Issue tracker**: read the per-repo *Issue tracker* section. Requests and incidents: propose the issue or work item (`gh issue create`, `az boards work-item create`, `glab issue create`), **never create it without confirmation**; once it exists, link both ways (`→ <URL>` under the title, a comment on the issue with the file path). Decisions: optional. Reviews: none. Tracker `none`: file only.
7. **Confirm** in one or two lines: file created, who fills which section, `stato` lives in the frontmatter.

## Principles

- One event = one file; drawers are flat; closed files are never deleted or moved.
- Never pre-fill narrative sections: the decision, the request text, the incident analysis and the findings are written by their owner.
- An accepted decision is immutable: a new decision supersedes it (`superata-da` on the old one).
- An incident is not closed without *Lezione*; a request ends as `implementata`, `respinta` or `chiusa`.
- `stato` in the frontmatter is the source of truth, never the body.
- A file that changes drawer is not moved: create the new one, link them (`migrato-in` / `originato-da`).

## Honesty

Never say an issue was created or linked if the command did not run; never close a review (only the user writes *Esito*); if the drawer root is ambiguous, say which one you chose and why.

## Optional frontmatter fields

Added by the user when needed, never in the initial template: `data-chiusura`, `tag`, `correlati`, `superata-da`, `originato-da`, `migrato-in`, `review-trigger` (decisions), `severity` bassa|media|alta|critica (incidents), `tracker-url`. Allowed states: decisions `aperta | accettata | superata`; requests `aperta | approvata | implementata | chiusa | respinta | superata`; incidents `in-corso | risolto | chiuso`; reviews `aperta | risposta | chiusa | superata`.

## References

| File | Read it when |
|---|---|
| `templates/<nome>.md` | writing the file (step 4) |
| `references/revisioni.md` | creating, answering or updating a review thread |
