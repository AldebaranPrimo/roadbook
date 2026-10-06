---
name: session-close
description: Closing checklist of a work session, project-agnostic - lists the TODO markers added to the code during the session and reminds to register them in docs/tech-debt.md, checks the state files declared in .claude/session-close.json, lists the AI reviews still open in docs/reviews/, reminds the CHANGELOG entry. Reminders only - no commit, no push, no file edited. Use it when the user says "chiudi la sessione", "checklist di fine sessione", "cosa manca prima di chiudere", "/session-close"; salva-memoria runs it on its own before the handoff commit. Not for "salva la memoria" or updating HANDOFF.md (salva-memoria), not for closing a slice with gate and self-review (chiusura-slice), not for registering tech-debt entries (the user writes them).
argument-hint: <none — reads .claude/session-close.json>
---

# /session-close — Chiusura sessione

Skill da invocare alla fine di una sessione di lavoro. Non commit, non push: solo reminder strutturati su cosa l'utente deve aggiornare prima di chiudere.

## Configurazione

Legge `.claude/session-close.json`:

```json
{
  "state_files_to_review": [
    "docs/STATO_CORRENTE.md",
    "CHANGELOG.md",
    "docs/refactor/roadmap.md"
  ],
  "remind_tech_debt": true,
  "remind_changelog": true
}
```

Tutte le chiavi opzionali. Default sicuri se file manca: `remind_tech_debt=true`, `remind_changelog=true`, `state_files_to_review=[]`.

## Workflow

### 1. Scan tech-debt aperti nel codice durante la sessione

Costruisci l'insieme dei file toccati dalla sessione unendo tre fonti: (a) i commit della sessione, `git diff <baseline>..HEAD --name-only` dove baseline è l'ultimo commit precedente alla sessione se lo conosci (dal briefing di apertura o dall'orario), altrimenti **dichiara** che il confronto parte da `origin/HEAD` e può includere commit di altri; (b) le modifiche non ancora committate, `git diff --name-only` e `git diff --cached --name-only`; (c) i file nuovi non tracciati, `git ls-files --others --exclude-standard`. I file cancellati si escludono. Una sessione interrotta prima del commit ha tutto il suo lavoro in (b) e (c): senza di loro la scansione sarebbe vuota (revisione Codex `verifica-governance-operativa`, rilievo 8). Nei file così raccolti cerca i pattern:
- `TODO(refactor):`
- `TODO(perf):`
- `TODO(a11y):`
- `TODO(seo):`
- `TODO(td-XXX):` con `td-XXX` non presente in `docs/tech-debt.md`
- `FIXME:`

Riporta i marker trovati con file + riga + testo del TODO. Per ogni `TODO(td-XXX)` con XXX non in registry → segnala come "bug: marker in-code senza voce in tech-debt.md, va aperta la voce".

### 2. Stato dei file dichiarati

Per ogni path in `state_files_to_review`:
- Se è stato modificato dalla sessione (in `git diff`): nota "aggiornato ✓"
- Se non è stato modificato ma la sessione ha modificato il codice (file `.ts`/`.vue`/`.cs`/altri sorgenti): nota "⚠️ non aggiornato — controlla se questa sessione lo richiedeva"
- Se non esiste: nota "non trovato"

### 2b. Revisioni AI non chiuse (`docs/reviews/`, se la cartella esiste)

Elenca i file di `docs/reviews/` con `stato: aperta` (Claude deve ancora rispondere) o `stato: risposta` (l'utente deve chiudere). Le revisioni aperte vanno citate nel blocco di handoff della sessione (`salva-memoria`) come primo passo al ritorno. Mai chiuderle da qui.

### 3. Reminder CHANGELOG (se `remind_changelog=true`)

Se la sessione ha modificato file di codice e `CHANGELOG.md` esiste ma non è stato modificato: "⚠️ Reminder: aggiorna `CHANGELOG.md` con la voce di questa sessione, soprattutto se è cambiata API pubblica / behavior visibile / dipendenza".

### 4. Summary discorsivo

Output finale strutturato come prosa breve:

```
# Chiusura sessione — <project name> @ 2026-05-12 18:00

## Tech-debt
- 2 nuovi TODO inseriti nel codice questa sessione, NESSUNO registrato in tech-debt.md:
  - app/utils/format.ts:42  TODO(perf): cache regex compile
  - app/pages/post/[slug].vue:118  TODO(a11y): aria-current su breadcrumb attivo
  → Apri 2 voci in docs/tech-debt.md prima di commit.

## File di stato
- docs/STATO_CORRENTE.md — aggiornato ✓
- CHANGELOG.md — ⚠️ non aggiornato, sessione ha toccato 5 file di codice
- docs/refactor/roadmap.md — non modificato (OK se non rilevante a questa sessione)

## Suggerimento
Prima di commit:
1. Aggiungi le 2 voci a docs/tech-debt.md (TD-NNN), rimpiazza i TODO inline con TODO(td-NNN)
2. Aggiorna CHANGELOG.md

NON commit automatico — controlla diff con `git diff` e committa manualmente.
```

## Cosa NON fare

- **Non eseguire commit / push automatici**. La skill è reminder, non azione.
- **Non aggiungere voci a `tech-debt.md` automaticamente**: la creazione delle voci richiede priorità, motivo, approccio — informazioni che l'utente deve scrivere.
- **Non rimuovere o modificare TODO esistenti** nel codice.
- Niente `AskUserQuestion` (regola globale).
