---
name: chiusura-slice
description: End-of-slice closure, run before the commit that closes a slice (a coherent unit of code work) - the project's gate (the verify skill with .claude/verify.json, or the Completion gate commands of the family contract), then a self-review of the whole diff on two separate axes, Standard (does it follow the repo rules) and Specifica (does it do what the task asked), then the documentation the change requires (CHANGELOG and the documents the project's documentation map ties to it), with a stop if anything is wrong. Use it on your own before every such commit, even if the user only says "committa", "chiudi la slice", "abbiamo finito", "fai la PR", "pusha", or when the global end-of-slice routine (commit, push, PR) is about to start. Not for documentation-only commits (docs-only exception, no gate), not for "wip - handoff" commits (salva-memoria), not for contract syncs in _master-contracts (master-sync).
---

# chiusura-slice

Codifies the *Completion gate* of every family contract plus the self-review, so the contracts keep only their stack-specific gate commands and review points. The contract is already in context (imported by the per-repo `CLAUDE.md`): read its *Execution workflow* for the gate commands, never repeat them here.

## Flow

1. **Scope.** Collect the slice: `git diff <integration-branch>...HEAD` plus uncommitted and untracked files. Check the file list against the task: task files plus those strictly needed to keep the build green (contract *Slices and file scope*). Anything else is a finding.
2. **Gate.** If `.claude/verify.json` exists, run the `verify` skill; otherwise run the commands of the contract's *Completion gate*. Open business-observable questions block the commit. A step the AI cannot run (MSBuild on the legacy stack, flashing a device) is stated and handed to the user: wait for the outcome.
3. **Self-review, two axes, one after the other** (never mixed in one pass):
   - **Standard** — does the diff follow the repo rules: every contract invariant the diff touches (cite the id), file scope, *Forbidden without explicit authorization*, testing policy (tests the slice must add), code documentation headers, per-repo conventions and declared exceptions, the stack review points listed in the contract's *Completion gate*; plus edge cases (`null`, empty, unicode, hostile input), dead code, forgotten debug output, documentation and numbered lists realigned (CHANGELOG, TODO, tech-debt).
   - **Specifica** — does the diff do what the task asked: every acceptance criterion from the task intake, the plan (`<slug>-piano.md`) or the request file, marked satisfied / not satisfied / not verifiable, with where; behaviour nobody asked for is a finding too.
   - At `risk:high` or `risk:critical`, or for a promoted plan, run the two axes as **two separate subagents** (model `opus` or lower), each with a self-contained brief: Standard = contract + per-repo `CLAUDE.md` + diff; Specifica = task, plan or request + diff. Below that threshold Claude runs both passes itself.
4. **Documentation, in the same commit.** If the slice changes **observable behaviour** — anything a user, an API client, an operator or another developer would notice, graphical or not: what a screen shows, what a feature, method or endpoint does or returns, data and its format, configuration, install, deploy or usage procedures — update the `CHANGELOG.md` (`Unreleased`) and every document that the table *Mappa della documentazione* in `docs/README.md` (`Docs/README.md` in the legacy family) ties to that kind of change, following its notes (e.g. two languages in parallel). No map in the project: the README and the living docs that describe what changed. A change with no observable effect (internal refactor) needs no document; a CHANGELOG line only if worth it. Never touch the files the map marks as sealed. A missing document update is a Standard finding.
5. **Stop point.** Show a short report: gate result, Standard findings, Specifica findings. Any finding is fixed before the commit and the gate runs again; an unresolvable one keeps the slice open and is reported to the user, never closed "for speed". The only exception to the stop: no findings at all, then go on.
6. **Commit, push, PR** per the global default and the per-repo git policy. The PR description states the gate result and "autorevisione Standard e Specifica: nessun rilievo aperto".

## Principles

- A green build is not a working feature: UI slices at `risk:high` or above need the smoke test the contract prescribes; firmware is declared working only after Marco's hardware check.
- Separate axes catch different errors: a diff can follow every rule and still miss the task, or do the task while breaking an invariant.
- Findings outside the slice's file scope become `TODO(<tag>)` plus a tech-debt entry, not drive-by fixes.

## Honesty

Never report a gate step as green if it did not run; say which steps were skipped and why. Never mark a criterion satisfied without pointing to where. If the task has no stated acceptance criteria, say so and review against the task text.
