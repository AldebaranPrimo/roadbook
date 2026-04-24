// Validatore leggero dello schema JSON del viaggio (v1.0 + v1.1).
// v1.1 aggiunge il campo opzionale root `annotazioni` per incapsulare le
// note utente e i punti visitati dentro il JSON esportato (vedi ai/feat/export-import-annotazioni).
// Ritorna { valido: boolean, errori: string[], avvisi: string[] }
// I campi non riconosciuti vengono ignorati silenziosamente (forward-compat).

function eStringaNonVuota(v) {
  return typeof v === 'string' && v.trim().length > 0
}
function eNumero(v) {
  return typeof v === 'number' && Number.isFinite(v)
}
function eLat(v) {
  return eNumero(v) && v >= -90 && v <= 90
}
function eLon(v) {
  return eNumero(v) && v >= -180 && v <= 180
}

export function validaViaggio(dato) {
  const errori = []
  const avvisi = []

  if (!dato || typeof dato !== 'object') {
    return { valido: false, errori: ['JSON non è un oggetto.'], avvisi }
  }

  if (!eStringaNonVuota(dato.$schema_version)) {
    errori.push('Campo "$schema_version" mancante o vuoto (richiesto per v1.0).')
  } else if (!dato.$schema_version.startsWith('1.')) {
    avvisi.push(`Schema "${dato.$schema_version}" non è 1.x: l'app potrebbe non renderizzare tutto correttamente.`)
  }

  // viaggio
  const v = dato.viaggio
  if (!v || typeof v !== 'object') {
    errori.push('Oggetto "viaggio" mancante.')
  } else {
    if (!eStringaNonVuota(v.id)) errori.push('"viaggio.id" mancante o non stringa.')
    else if (!/^[a-z0-9][a-z0-9\-_]*$/i.test(v.id)) avvisi.push('"viaggio.id" dovrebbe essere uno slug ASCII (usato nelle chiavi di storage).')
    if (!eStringaNonVuota(v.titolo)) errori.push('"viaggio.titolo" mancante.')
  }

  // categorie
  const cat = dato.categorie
  const chiaviCategoria = new Set()
  if (!cat || typeof cat !== 'object') {
    errori.push('Oggetto "categorie" mancante.')
  } else {
    for (const [k, def] of Object.entries(cat)) {
      chiaviCategoria.add(k)
      if (!def || typeof def !== 'object') {
        errori.push(`Categoria "${k}": definizione non è un oggetto.`)
        continue
      }
      if (!eStringaNonVuota(def.colore) || !/^#([0-9a-f]{3,8})$/i.test(def.colore)) {
        errori.push(`Categoria "${k}": campo "colore" mancante o non è un colore hex valido.`)
      }
      if (!eStringaNonVuota(def.label)) {
        errori.push(`Categoria "${k}": campo "label" mancante.`)
      }
    }
  }

  // aree
  const aree = dato.aree
  if (!Array.isArray(aree) || aree.length === 0) {
    errori.push('Array "aree" mancante o vuoto.')
  } else {
    const idsArea = new Set()
    aree.forEach((a, idx) => {
      const prefix = `Area[${idx}]`
      if (!a || typeof a !== 'object') {
        errori.push(`${prefix}: non è un oggetto.`)
        return
      }
      if (typeof a.id !== 'number' || !Number.isInteger(a.id)) {
        errori.push(`${prefix}: "id" mancante o non intero.`)
      } else if (idsArea.has(a.id)) {
        errori.push(`${prefix}: "id" ${a.id} duplicato.`)
      } else {
        idsArea.add(a.id)
      }
      if (!eStringaNonVuota(a.nome)) {
        errori.push(`${prefix}: "nome" mancante.`)
      }
      if (a.modalita && !['auto', 'piedi'].includes(a.modalita)) {
        avvisi.push(`${prefix}: "modalita" "${a.modalita}" non riconosciuta (attese: auto, piedi). Userò "auto".`)
      }
      if (!Array.isArray(a.punti) || a.punti.length === 0) {
        errori.push(`${prefix}: "punti" mancante o vuoto (serve almeno 1 punto).`)
      } else {
        const nsPunti = new Set()
        a.punti.forEach((p, pIdx) => {
          const pp = `${prefix}.punti[${pIdx}]`
          if (!p || typeof p !== 'object') {
            errori.push(`${pp}: non è un oggetto.`)
            return
          }
          if (typeof p.n !== 'number' || !Number.isInteger(p.n)) {
            errori.push(`${pp}: "n" mancante o non intero.`)
          } else if (nsPunti.has(p.n)) {
            errori.push(`${pp}: "n" ${p.n} duplicato nell'area.`)
          } else {
            nsPunti.add(p.n)
          }
          if (!eStringaNonVuota(p.name)) errori.push(`${pp}: "name" mancante.`)
          if (!eLat(p.lat)) errori.push(`${pp}: "lat" mancante o fuori range.`)
          if (!eLon(p.lon)) errori.push(`${pp}: "lon" mancante o fuori range.`)
          if (!eStringaNonVuota(p.desc)) errori.push(`${pp}: "desc" mancante.`)
          if (!eStringaNonVuota(p.categoria)) {
            errori.push(`${pp}: "categoria" mancante.`)
          } else if (chiaviCategoria.size > 0 && !chiaviCategoria.has(p.categoria)) {
            errori.push(`${pp}: categoria "${p.categoria}" non definita in "categorie".`)
          }
        })
      }
    })
  }

  // annotazioni (v1.1, opzionale) — contengono note utente e punti visitati
  // portabili nel JSON. Schema: { visitati: string[], note: Record<string, string> }
  // dove le chiavi sono nel formato "<areaId>-<n>".
  if (dato.annotazioni !== undefined && dato.annotazioni !== null) {
    const ann = dato.annotazioni
    if (typeof ann !== 'object' || Array.isArray(ann)) {
      errori.push('Campo "annotazioni" presente ma non è un oggetto.')
    } else {
      if (ann.visitati !== undefined && ann.visitati !== null) {
        if (!Array.isArray(ann.visitati)) {
          errori.push('"annotazioni.visitati" deve essere un array di stringhe.')
        } else {
          ann.visitati.forEach((k, i) => {
            if (typeof k !== 'string' || !/^\d+-\d+$/.test(k)) {
              avvisi.push(`"annotazioni.visitati[${i}]" non è nel formato "<areaId>-<n>": "${k}"`)
            }
          })
        }
      }
      if (ann.note !== undefined && ann.note !== null) {
        if (typeof ann.note !== 'object' || Array.isArray(ann.note)) {
          errori.push('"annotazioni.note" deve essere un oggetto con chiavi "<areaId>-<n>" e valori stringa.')
        } else {
          for (const [k, val] of Object.entries(ann.note)) {
            if (!/^\d+-\d+$/.test(k)) {
              avvisi.push(`Chiave nota "${k}" non è nel formato "<areaId>-<n>".`)
            }
            if (typeof val !== 'string') {
              errori.push(`"annotazioni.note.${k}" deve essere una stringa.`)
            }
          }
        }
      }
    }
  }

  return { valido: errori.length === 0, errori, avvisi }
}

// Ritorna `true` se il JSON ha annotazioni non vuote (visitati[] con elementi
// o note{} con chiavi). Utile alla UI di import per decidere se mostrare il
// prompt di conferma a 3 opzioni.
export function haAnnotazioniNonVuote(dato) {
  const ann = dato?.annotazioni
  if (!ann || typeof ann !== 'object') return false
  const nVisitati = Array.isArray(ann.visitati) ? ann.visitati.length : 0
  const nNote = ann.note && typeof ann.note === 'object' ? Object.keys(ann.note).length : 0
  return nVisitati > 0 || nNote > 0
}
