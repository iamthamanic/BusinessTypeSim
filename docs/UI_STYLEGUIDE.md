# UI Styleguide — Business Type

## 1. Design thesis

Business Type soll sich wie ein **Executive Decision Room** anfühlen: glaubwürdig, analytisch, ruhig und hochwertig. Die App ist ein Strategiespiel, darf aber weder wie ein Casual-Tycoon noch wie ein Enterprise-Dashboard im Browser aussehen.

Die primäre visuelle Metapher ist ein **Decision Ledger**: Situationen, beschaffte Informationen, Entscheidungen und Folgen werden als nachvollziehbare Spur durch die Zeit gezeigt.

## 2. Platform mode

Cross-platform premium neutral mit klarer Mobile-Navigation. Android und iOS teilen dieselbe visuelle Sprache; native Unterschiede werden nur dort zugelassen, wo Systemverhalten oder Accessibility davon profitieren.

- Safe Areas immer berücksichtigen.
- Bottom Navigation maximal drei Ziele (Cockpit, Firma, Verlauf).
- Sheets/Dialogs nach nativer Erwartung, aber visuell konsistent.
- Touch targets mindestens 44×44 CSS px; auf Android bevorzugt 48×48.

## 3. Design principles

1. **Decision first:** Pro Screen genau eine primäre Entscheidung oder Frage.
2. **Information before decoration:** Zahlen, Trends und Unsicherheiten sind Gestaltungselemente.
3. **Calm density:** Keine Widget-Wand; komplexe Daten werden gestuft offengelegt.
4. **Consequences are legible:** Positive, negative und unsichere Effekte sind unterscheidbar, aber nicht alarmistisch.
5. **Chat is the spine, not the whole product:** Im aktiven Run ist der Decision Room chat-zentriert; Company-, KPI- und Timeline-Views bleiben echte Surfaces (Firma/Verlauf), nicht Chat-Bubbles.
6. **Uncertainty is visible:** Schätzungen, Confidence und noch unbekannte Informationen werden semantisch gekennzeichnet.
7. **No fake gamification:** Keine Coins, Lootbox-Ästhetik, XP-Konfetti oder künstliche Streaks im Kernspiel.

## 4. Color system

Dark-first; Light Mode wird aus denselben semantischen Rollen abgeleitet.

| Token | Dark | Light | Verwendung |
|---|---:|---:|---|
| `--bg-canvas` | `#09131D` | `#F4F7F9` | App-Hintergrund |
| `--bg-surface` | `#101E2B` | `#FFFFFF` | Hauptflächen |
| `--bg-elevated` | `#172838` | `#EAF0F4` | Sheets, fokussierte Karten |
| `--text-primary` | `#F2F7FA` | `#10202D` | Primärtext |
| `--text-secondary` | `#9DB0BE` | `#536875` | Sekundärtext |
| `--accent-decision` | `#9BC8F2` | `#1769AA` | Primäraktionen, Auswahl |
| `--positive` | `#62D59A` | `#137A4A` | bestätigte positive Wirkung |
| `--warning` | `#E8B45D` | `#8A5C00` | Unsicherheit, Trade-off |
| `--negative` | `#F07979` | `#B52E35` | Risiko, negative Wirkung |
| `--border-subtle` | `#25394A` | `#D7E0E6` | Trennungen |

Regeln:
- Accent-Farbe sparsam für Handlung/Fokus verwenden.
- Grün/Rot nie allein als Bedeutungsträger; immer Icon, Label oder Richtung ergänzen.
- Keine dekorativen Regenbogen- oder AI-Gradienten.
- Chart-Farben werden semantisch und farbfehlsichtigkeitsverträglich definiert.

## 5. Typography

Zielrichtung: **IBM Plex Sans** für UI/Editorial, **IBM Plex Mono** für kompakte Zahlen-/Audit-Kontexte. Falls Fonts im MVP noch nicht gebundled werden, gilt ein system-ui Fallback; keine externen Runtime-Font-Requests als Voraussetzung für Kernfunktion.

| Rolle | Größe | Gewicht | Zeilenhöhe |
|---|---:|---:|---:|
| Display | 34 | 650 | 40 |
| Screen title | 26 | 650 | 32 |
| Section title | 20 | 600 | 26 |
| Body | 16 | 400 | 24 |
| Emphasis | 16 | 600 | 24 |
| Label | 14 | 550 | 20 |
| Meta | 12 | 500 | 16 |
| Metric | 28 | 600 | 32 |

- Finanzzahlen verwenden `font-variant-numeric: tabular-nums`.
- Body nie unter 15 px in Kernflows.
- Lange Begründungen werden nicht durch kleine Schrift „hineingequetscht“.

## 6. Spacing, shape, elevation

Spacing scale: `4, 8, 12, 16, 20, 24, 32, 40`.

- Screen horizontal padding: 20 px, kompakt 16 px bei kleinen Geräten.
- Standard section gap: 24 px.
- Card radius: 14 px.
- Control radius: 12 px.
- Pill radius nur für echte kompakte Statuswerte, nicht als Dekoration.
- Maximal zwei sichtbare Elevation-Stufen pro Screen.
- Schatten zurückhaltend; Borders/tonale Flächen bevorzugen.

## 7. Information architecture

Bottom navigation:

1. **Cockpit** — War Room Split: Hub oben (Default Quest; Modi Data / Quest / People), Chat & Entscheidungsdock unten.
2. **Firma** — Finanzen, Kunden, Team, Operations, Markt.
3. **Verlauf** — Decision Ledger, Events, Reviews, Konsequenzen.

Sekundärnavigation innerhalb von Firma: Übersicht, Finanzen, Kunden, Team, Operations, Markt.

## 8. Core screens

### Onboarding
- Eine klare Aussage: reale Entscheidungen, reale Trade-offs, unterschiedliche Outcomes.
- Maximal ein primärer CTA.
- Kein Feature-Karussell mit drei nahezu identischen Slides.

### Scenario selection
- Karten zeigen Branche, Stage, Größenordnung, Hauptkomplexität.
- Nicht alle Kennzahlen vor Spielstart preisgeben.
- Filter nur, wenn mehr als sechs Szenarien vorhanden sind.

### Company overview
- Vier bis sechs wichtigste KPIs, nicht zwölf Mini-Karten.
- Ein dominanter Trendchart, restliche Kennzahlen als strukturierte Liste.
- Unsicherheit/Schätzung explizit markieren.

### Decision Room
Hub above the War Room:
1. Soft Deadline Chip (immer sichtbar)
2. Modi Data · Quest · People (Quest vorausgewählt; Toggle zurück zum Firmenlogo)
3. Default: Firmenlogo der aktuellen ScenarioId
4. Data: Kern-KPIs
5. Quest: offene Aufgaben (Frist, Lage, pending Analysen, Entwurf)
6. People: Management/Advisors → wählt War-Room-Advisor
7. War Room darunter: Thread, Composer, Analyse-/Entscheidungshandlungen

Content order for decision urgency (Data/Quest):
1. Datum/Deadline
2. Situationstitel
3. Problemkontext
4. gesicherte Kerninformationen
5. verfügbare Handlungen: Team sprechen, Analyse anfordern, Entscheidung treffen
6. verbleibende Zeit

### Advisors
- Chat-Muster, aber mit Rollen-/Datenkontext.
- Advisor-Antworten können Unsicherheit ausdrücken.
- Tool-basierte Analyseergebnisse werden als strukturierte Evidence Cards angezeigt, nicht nur als Textbubble.

### Information request
- Analyseart, erwartete Simulationsdauer, ggf. Ressourcenkosten und Confidence anzeigen.
- Auswahl vor Submit zusammenfassen.

### Decision composer
- Freitext + optionale Begründung.
- Vor Commit zeigt die App eine strukturierte Interpretation („Wir haben verstanden: …“).
- Nutzer kann korrigieren, bevor autoritative Simulation startet.

### Simulation transition
- Kurz und funktional. Zeigt die Verarbeitungsschritte abstrakt, aber keine erfundenen „AI denkt“-Inhalte.
- Reduced Motion respektieren.

### Decision review
- `Decision Quality` als Primärwert.
- Sechs Dimensionen mit klarer Erklärung.
- Outcome bewusst separat und zeitlich später darstellen.

### Outcome / Timeline
- Vorher/Nachher-Kennzahlen.
- Unvorhergesehene Ereignisse und Kausalität, soweit bekannt.
- Keine rückwirkende Behauptung, ein schlechtes Outcome beweise eine schlechte Entscheidung.

## 9. Signature component: Decision Ledger

Der Verlauf ist keine normale Activity List. Jeder Eintrag trägt einen Typ:

`Situation -> Information -> Decision -> Immediate Effect -> Delayed Effect -> Review`

Eine subtile vertikale Rail verbindet kausal zusammengehörige Ereignisse. Ereignisse dürfen nur dann optisch verbunden werden, wenn die Engine tatsächlich eine Relation speichert.

## 10. Components

| Component | Varianten | Pflichtzustände |
|---|---|---|
| `PrimaryButton` | primary, secondary, danger | default, pressed, disabled, loading, focus |
| `MetricBlock` | positive, negative, neutral, estimated | loading, stale |
| `DecisionCard` | active, upcoming, resolved | default, selected |
| `EvidenceCard` | finance, customer, people, market, technical | loading, error, confidence |
| `AdvisorMessage` | user, advisor, tool-result | sending, failed, retry |
| `AnalysisOption` | available, unavailable, requested, complete | disabled, selected |
| `DecisionComposer` | draft, validating, ready, error | offline, retry |
| `QualityScore` | total + six dimensions | partial/not-yet-available |
| `OutcomeDelta` | positive, negative, neutral, uncertain | missing baseline |
| `LedgerEvent` | six event types | pending, complete, failed |
| `BottomNav` | five destinations | active, inactive |
| `Sheet` | info, confirm, detail | open, closing, error |

## 11. Charts and tables

- Keine Charts ohne Entscheidungsnutzen.
- Standardzeitreihen: 4–8 Punkte sichtbar; Detailansicht für längere Historie.
- Achsen/Units immer explizit.
- Tabellen auf Mobile als priorisierte Rows/Detail-Sheets statt horizontales Quetschen.
- Währung und Prozentformat folgen Locale; intern bleiben Werte unverändert.

## 12. Content design

Ton: präzise, ruhig, direkt.

Beispiele:
- „Noch 7 Tage bis zur Entscheidung“ statt „Beeil dich!“
- „Diese Einschätzung hat mittlere Sicherheit“ statt „AI Confidence 63.71 %“, wenn keine echte Kalibrierung vorliegt.
- „Entscheidung prüfen“ statt „Submit“.
- „Analyse anfordern“ statt „Run tool“.

Die App darf Unsicherheit sagen: „Dazu liegen keine belastbaren Daten vor.“

## 13. Motion and haptics

- Navigation: 160–220 ms.
- Sheet: 200–280 ms.
- Ergebnis-Delta: maximal eine kurze, gerichtete Transition.
- Keine Konfetti-Animation für Decision Quality.
- Haptics nur für Commit, kritische Warnung und erfolgreiche Retry-Recovery.
- `prefers-reduced-motion` bzw. native Reduced-Motion-Einstellung respektieren.

## 14. Accessibility

Ziel: WCAG 2.2 AA für Web-Inhalte und äquivalente native Bedienbarkeit.

- sichtbarer Fokus für Tastatur/Assistive-Tech-Flows;
- semantische Labels für Icons;
- dynamische Schriftgrößen dürfen Kernaktionen nicht abschneiden;
- keine Information nur über Farbe;
- Kontrast mindestens AA;
- Screenreader-Reihenfolge folgt visueller Hierarchie;
- Charts benötigen Textzusammenfassung der wichtigsten Aussage.

## 15. Responsive/mobile constraints

Primär für Portrait-Smartphones 320–480 CSS px Breite. Tablets dürfen breitere Content-Flächen nutzen, bleiben aber einspaltig im Decision Room; Company-Dashboards können ab Tabletbreite zweispaltig werden.

## 16. Do / Don't

**Do:** ruhige Flächen, starke Hierarchie, echte Daten, sichtbare Unsicherheit, kurze CTAs, strukturierte Evidence.

**Don't:** Dashboard-Spam, Glassmorphism, Neon-AI-Look, Coins/XP, zwölf Pills pro Screen, winzige Texte, erfundene Charts, generische ChatGPT-Kopie.
