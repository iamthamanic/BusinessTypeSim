# Acceptance — MVP Core Loop

## Intent
Der Nutzer kann mindestens drei unterschiedliche Firmenfälle starten, Informationen beschaffen, Führungskräfte befragen, eine freie Entscheidung formulieren und unmittelbare sowie verzögerte Folgen getrennt von Decision Quality sehen.

## Preconditions
- Scenario-Version und Seed sind beim Runstart fest.
- Der Simulation Core ist die einzige Authority für World-State-Änderungen.
- Cloud-Mutationen erfordern authentifizierten Owner-Kontext.

## Happy Path
- [ ] SaaS, Produktion und Professional Services sind mit derselben Engine spielbar.
- [ ] Analysen verbrauchen Simulationszeit und erzeugen sichtbare Evidence.
- [ ] Freitext wird vor Commit in strukturierte Actions übersetzt.
- [ ] Commit erzeugt Immediate Effects, Decision Quality und seeded Delayed Events.
- [ ] Ledger trennt Situation, Information, Decision und Folgen nachvollziehbar.

## Edge Cases
- [ ] Duplicate Commit mutiert State nicht doppelt.
- [ ] Lokaler Demo-Modus bleibt ohne Cloud verfügbar.
- [ ] Unbekannte Analyse- oder Scenario-IDs werden abgelehnt.
- [ ] Fehlende AI-/Search-Provider deaktivieren nur Zusatzfunktionen.

## Implementation Notes
Der Core ist als pure TypeScript-Schicht vorgesehen; Mobile UI, Cloud-Adapter und Debrief bleiben davon getrennt.
