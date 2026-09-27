---
id: <oggi>-<slug>
stato: aperta
data-apertura: <oggi>
schema-version: 1
agente: <codex|claude|altro>
oggetto: <piano|diff>
slice: <branch o vuoto>
correlati: []
---

# Revisione: <Titolo>

## Richiesta
(opzionale, scrive chi chiede la revisione — di norma Claude: cosa rivedere, dove sono le versioni da confrontare, contesto indispensabile, criteri di accettazione del compito, cosa cercare in ordine di importanza, cosa non serve.)

## Rilievi
(il revisore, due assi separati: prima uno, poi l'altro)

### Standard — rispetto delle regole del repo
(invarianti del contratto, file scope, divieti, politica dei test, convenzioni del per-repo)
1. [alta|media|bassa] `percorso/file:riga` — cosa non va, quale regola, cosa si propone.

### Specifica — il piano o il diff fa ciò che chiede il compito
(criteri di accettazione del piano o della request: soddisfatto / no / non verificabile, e dove)
1. [alta|media|bassa] criterio «…» — esito, dove, cosa manca.

## Risposta
(Claude) 1. Accolto: corretto in <commit/file>. | Respinto: <motivo verificabile>. | Rimandato: `TODO(review): …` in <file>.

## Replica
(opzionale, solo il revisore che ha scritto i Rilievi)

## Esito
(solo l'utente) chiusa il <data>: <cosa è stato fatto>.
