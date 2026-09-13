# Acceptance — Mockup UI + Capacitor Native Shell

## Intent
Die App läuft als Capacitor-fähige Native-Shell (android/ios angelegt und syncbar) und die Kernscreens entsprechen dem Executive-Decision-Room-Mockup: Onboarding, Szenarioauswahl, Unternehmensübersicht, Decision Room, Advisors, Informationsbeschaffung, mehrstufige Entscheidung, Simulationsübergang, Decision Quality und Ergebnis/Folgen — bei erhaltener Domain-Authority und lokalem Demo-Modus.

## Preconditions
- `npm install` ist gelaufen; Vite-Build erzeugt `dist/`.
- Domain Core und bestehende Run-/Decision-APIs bleiben unverändert autoritativ.
- Mockup-Referenz: ChatGPT-Konzeptboard (10 Screens, dark mobile).

## Happy Path
- [ ] `android/` und `ios/` existieren; `npx cap sync` läuft ohne Fehler (Pods ggf. separat).
- [ ] Onboarding zeigt Marke + klare Aussage + einen primären CTA vor der Szenarioauswahl.
- [ ] Szenarioauswahl filtert nach Branche und startet lokalen Demo-Run.
- [ ] Company View zeigt KPI-Karten und einen ARR-/Umsatz-Trendchart.
- [ ] Decision Room zeigt Priorität, Countdown und Aktionen (Team, Analyse, Entscheiden).
- [ ] Entscheidung läuft in Schritten (Formulieren → Begründung → Review) mit Simulationsübergang vor Commit-Ergebnis.
- [ ] Decision Quality nutzt Kreis-/Gauge-Darstellung; Verlauf zeigt delta-artige Folgen.
- [ ] Bottom-Nav: Home, Unternehmen, Entscheidung, Team, Verlauf; Dark-first Optik.

## Edge Cases
- [ ] Ohne Supabase bleibt lokaler Demo-Pfad spielbar.
- [ ] Capacitor-Ordner fehlen nicht mehr nach Setup; erneutes `native:setup` ist idempotent oder dokumentiert.
- [ ] Reduced Motion deaktiviert nicht-essenzielle Animationen.
- [ ] CSP blockiert Vite-Styles nicht (`style-src` inkl. unsafe-inline für Dev).

## Security Coverage
- F-03/F-05: Keine neuen Secrets im Client; nur bestehende `VITE_*` Platzhalter.
- F-02: Advisor-/LLM-Text weiterhin nur als Text; keine `dangerouslySetInnerHTML`.
- P-xx native: WebDir ist Build-Output `dist`; keine Dev-Server-Secrets in Native Bundles.
- Out of scope: neue Auth-Flows, Backend-Änderungen, Store-Signing.

## Implementation Notes
- Capacitor: `android/` und `ios/` via `cap add` + `cap sync`; Capacitor 8 iOS nutzt SPM (`Package.swift`), kein CocoaPods nötig.
- UI: Features unter `src/features/{onboarding,scenario,home,company,decision,team,ledger}`; Dark-first Styleguide; Decision Quality Gauge; Multi-Step Decision + Simulations-Interstitial.
- Domain/Engine unverändert; Charts sind Anzeige-Trends (nicht Game Truth).
- CSP: `style-src 'self' 'unsafe-inline'` für Vite Dev Style Injection.
- Mockup-Pass: Onboarding hero CTA, Szenario-Karten mit Hex-Marks, Priority-Banner, Analysis-Icons, Stepper 1–3, Simulations-Stack, Auswertung/Ergebnis-Tabs („12 Monate später“, Unerwartetes Ereignis), Nav-Labels Advisors/Mehr.
