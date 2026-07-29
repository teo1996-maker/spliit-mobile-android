# Workflow di sviluppo

Direttive di processo da seguire sempre in questo progetto.

## Commit

- Fai un commit **ogni volta che si completa l'implementazione di una
  funzionalità**. Una funzionalità completata = un commit.
- Non accumulare più funzionalità in un unico commit: tieni la history
  granulare e leggibile.
- Usa messaggi di commit in stile Conventional Commits
  (`feat:`, `fix:`, `chore:`, ecc.).

## Test end-to-end prima del commit

- **Prima di ogni commit si fa sempre un test end-to-end.**
- Il test E2E lo esegue l'utente **manualmente sul proprio dispositivo
  Android** (build/installazione reale, non solo type-check o build).
- Flusso operativo per ogni funzionalità:
  1. Implementare la funzionalità.
  2. **Fermarsi** e chiedere all'utente di testarla sul suo Android.
  3. Solo dopo l'OK dell'utente (test E2E superato), fare il commit.
- Non committare una funzionalità prima che l'utente ne abbia confermato
  il funzionamento sul dispositivo.
