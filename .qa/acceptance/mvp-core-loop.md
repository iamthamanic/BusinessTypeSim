# Acceptance — MVP Core Loop

## Intent
Der Nutzer kann mindestens drei unterschiedliche Firmenfälle starten, Unternehmensinformationen recherchieren, Führungskräfte befragen, eine freie Entscheidung formulieren, deren Interpretation prüfen, die Entscheidung committen und sofortige sowie verzögerte Folgen getrennt von Decision Quality sehen.

## Preconditions
- Scenario-Version und Seed sind beim Runstart fest.
- Der Simulation Core ist die einzige Authority für Metrik-/World-State-Änderungen.
- Cloud-Mutationen erfordern authentifizierten Owner-Kontext.

## Happy Path
- [ ] SaaS, Produktion und Professional Services sind mit derselben Engine spielbar.
- [ ] Analysen verbrauchen Simulationszeit und erzeugen sichtbare Evidence, ohne Hidden State zu leaken.
- [ ] Freitext wird vor Commit in strukturierte Actions übersetzt und kann geprüft werden.
- [ ] Commit erzeugt Immediate Effects, Decision Quality und seeded Delayed Events.
- [ ] Ledger trennt Situation, Information, Decision, unmittelbare und verzögerte Folgen nachvollziehbar.

## Edge Cases
- [ ] Duplicate Decision Commit mutiert lokalen State nicht doppelt; Cloud benutzt Revision Conflict.
- [ ] Offline/lokaler Demo-Modus bleibt ohne Supabase oder LLM spielbar.
- [ ] Unbekannte Analyse/Scenario IDs werden abgelehnt.
- [ ] Fehlendes LLM/Search deaktiviert nur die jeweilige Zusatzfunktion, nicht den Core Loop.
- [ ] Cash unter null beendet den Run statt ihn künstlich zu retten.

## Security Coverage
- F-02: Freitext wird nur als Text gerendert; externe AI-Ausgabe wird schema-validiert bzw. im lokalen Fallback strukturiert erzeugt.
- F-03/F-05: Keine Secret-/Service-Keys im Client; `.env.example` enthält nur leere Platzhalter.
- B-02/B-03: Cloud-Runs sind via Supabase Auth + RLS owner-scoped.
- B-07/B-09: Owner-ID kommt aus verifiziertem Auth-Kontext, nie aus Request-Payload.
- B-08: Edge Functions akzeptieren nur explizite Operations; unbekannte Operationen werden schema-seitig abgelehnt.
- P-05: AI/Search laufen über serverseitige per-user Stundenlimits.

## Implementation Notes
- Pure Domain Engine liegt unter `shared/domain/` und wird vom Frontend re-exportiert.
- Drei Szenarien plus lokale Persistence, Cloud API, AI Adapter und Debrief sind implementiert.
- Native Plattformordner werden erst durch `npm run native:setup` erzeugt; dies erfordert Registryzugriff und lokale Android/iOS Toolchains.
