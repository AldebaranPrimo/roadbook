---
description: Project-agnostic pre-commit/pre-PR verification checklist. Reads the list of steps to run from `.claude/verify.json` (commands, blocking flags, descriptions) and executes them in order, reporting pass/fail. Stops on the first blocking failure; non-blocking failures are reported as warnings. Used as the Phase 4 gate codified in family contracts.
argument-hint: <none — reads .claude/verify.json>
---

# /verify — Checklist pre-commit / pre-PR

Skill da invocare prima di un commit non triviale o di una PR. Esegue la sequenza di verifiche dichiarate dal progetto, blocca al primo failure di uno step `blocking: true`, riporta i warning degli step non bloccanti.

## Configurazione

Legge `.claude/verify.json` nel root del progetto:

```json
{
  "steps": [
    {
      "name": "Lint",
      "cmd": "npm run lint",
      "blocking": true,
      "description": "ESLint sull'intero progetto"
    },
    {
      "name": "Type-check",
      "cmd": "npm run typecheck",
      "blocking": true,
      "description": "TypeScript strict, no errors"
    },
    {
      "name": "Build",
      "cmd": "npm run build",
      "blocking": true,
      "description": "Build di produzione deve passare"
    },
    {
      "name": "Unit tests",
      "cmd": "npm run test:unit",
      "blocking": true,
      "description": "Vitest happy-dom"
    },
    {
      "name": "E2E tests",
      "cmd": "npm run test:e2e",
      "blocking": false,
      "description": "Playwright; non bloccante se test_env locale non disponibile"
    },
    {
      "name": "Validate GraphQL (Shopify)",
      "cmd": "mcp:shopify-dev:validate_graphql_codeblocks",
      "blocking": false,
      "description": "Solo se ci sono GraphQL queries toccate nello slice; skip se non rilevante"
    }
  ]
}
```

- `cmd` con prefisso `mcp:<server>:<tool>` indica un tool MCP invece di un comando shell.
- `blocking` di default è `true` se omesso.
- Se il file manca, la skill stampa errore "configurazione assente, dichiara `.claude/verify.json`" e termina.

## Workflow

1. **Leggi `.claude/verify.json`**. Se manca → errore e stop.
2. **Per ogni step in ordine**:
   - Annuncia: `▶ Step N/M: <name> — <description>`
   - Esegui il `cmd`:
     - Comando shell → via `Bash` tool
     - Tool MCP → via la chiamata diretta al tool
   - Cattura exit code + output (tail ~30 righe)
   - Esito:
     - **Pass** (exit 0): `✅ <name>` + procedi al prossimo step
     - **Fail blocking** (exit ≠ 0 e `blocking=true`): `🛑 <name> FAILED` + mostra tail output + **stop**, non eseguire step successivi, riporta lo step che ha bloccato
     - **Fail non-blocking** (exit ≠ 0 e `blocking=false`): `⚠️ <name> warning` + mostra tail output breve + procedi
3. **Riassunto finale**: tabella `step | esito` + verdetto complessivo `READY TO COMMIT` (se tutti i blocking sono pass) oppure `BLOCKED ON <step>` (se uno è bloccante fallito).

## Esempio output

```
/verify — pre-commit checklist (6 step da .claude/verify.json)

▶ Step 1/6: Lint — ESLint sull'intero progetto
✅ Lint (0 errori, 2 warning ignorabili)

▶ Step 2/6: Type-check — TypeScript strict
✅ Type-check (0 errori)

▶ Step 3/6: Build — Build di produzione
🛑 Build FAILED
   Last 20 lines of output:
   > error TS2345: ...
   
BLOCKED ON Build. Step 4-6 non eseguiti. Risolvi e re-invoca /verify.
```

## Cosa NON fare

- Non saltare uno step blocking anche se "sembra" non rilevante. Se va saltato lo si dichiara in `verify.json` con `blocking: false`.
- Non eseguire fix automatici (`npm run lint -- --fix`, ecc.) come parte del verify — sono operazioni separate, da invocare a mano se l'utente lo decide.
- Non commit né push automatici al pass — `/verify` è gate, non gate-and-go.
- Non usare `AskUserQuestion` (regola globale).
