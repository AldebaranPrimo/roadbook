# HANDOFF

## Documenti da aggiornare allo shutdown
- README.md
- STATUS.md
- docs/STATO-PROGETTO.md
- CHANGELOG.md
- docs/tech-debt.md
- CLAUDE.md (solo se cambiano la fase o la politica del progetto)
- docs/requests/, docs/decisions/ (solo i file dei cassetti toccati dalla sessione)

---

## 2026-09-26
### Kit memoria e routing
- Fatto: `CHANGELOG.md` spostato da `docs/` in radice (rinomina riconosciuta da git, storia intatta); creato `HANDOFF.md`. `docs/TODO.md` resta com'è: il contratto di famiglia lo prevede come doc viva, e la proposta di smontarlo è stata ritirata.
- Aperta la richiesta sul routing per profilo di mezzo (camper con vincolo di altezza, bici con carrello): file in `docs/requests/` + issue #36.
- Decisione dell'autore: il routing specializzato spetta a Roadbook. Lo schema indicherà il mezzo dei tratti e, se serve, punti di passaggio ridotti, non il tracciato. Scartata la via «pianificatore esterno + GPX».
- Aperte: domande 2-6 nel file della richiesta (camper, larghezza del carrello, costi, offline, mezzo per tratto o per area).
- Primo passo al ritorno: risposte alle domande aperte, poi studio con verifica sulle doc ufficiali (motori di routing, tag OSM, heatmap).
- Da leggere per riprendere: docs/requests/2026-09-26-routing-per-profilo-mezzo.md
