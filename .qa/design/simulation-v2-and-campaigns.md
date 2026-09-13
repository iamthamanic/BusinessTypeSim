# Simulation V2 & Campaigns — Epic Design

## Problem & Intent
Business Type besitzt einen funktionierenden Vertical Slice, aber freie Entscheidungen werden intern noch zu grob auf Action-Kinds reduziert; Zeit, Deadlines und langfristige Unternehmensentwicklung sind noch nicht vollständig autoritativ modelliert. Dieses Epic erweitert den bestehenden modularen Monolithen zu einer echten mehrjährigen CEO-Simulation, ohne die bestehenden Architekturgrenzen aufzugeben.

## Festgelegte Entscheidungen
- Freitext bleibt der primäre Decision-Input. Strukturierte Felder erscheinen erst im Review zur Korrektur oder bei echter Ambiguität.
- Soft Deadlines: Die Welt wartet nicht. Verpasste Fristen lösen World-State-Konsequenzen aus statt künstlichem Game Over.
- Erste vollständige Campaigns: Nordkern Foods und Nexora, jeweils 36 simulierte Monate.
- Mobile first: Portrait 320–480 CSS px ist primäre Design-Achse; Web, Android und iOS müssen denselben Kernfluss unterstützen.
- Default LLM: `glm-5.3-flash:cloud` über Ollama Cloud. Eskalationsmodell: `glm-5.3:cloud` nach definiertem Repair-/Komplexitätssignal. Kein LLM darf World State direkt mutieren.
- Self-hosted Backend bleibt Postgres + Hono auf Hostinger KVM2 neben n8n; kein Rückbau zu self-hosted Supabase.
- Public-Beta-Auth wird gehärtet; Web nutzt sichere Cookie-basierte Session-Strategie, Capacitor native Secure Storage.

## Reihenfolge
1. Parameterisierte ManagementActions
2. Feasibility/Constraint Engine
3. Economic Time + Soft Deadlines
4. World State V2
5. Decision Quality V2
6. Long-term Outcome + Luck/Counterfactuals
7. Campaign Runtime
8. Nordkern 36-Monats-Campaign
9. Nexora 36-Monats-Campaign
10. GLM Routing + Eval
11. Public-Beta Auth
12. KVM2 Production Ops

## Mobile UI Direction
- Executive Decision Room; dark-first, ruhig, datenorientiert.
- Pro Screen eine Primärfrage/-handlung.
- Bottom Navigation maximal fünf Ziele: Home, Unternehmen, Entscheidung, Team, Verlauf.
- Touch targets mindestens 44x44 CSS px, Android bevorzugt 48x48.
- Tabellen auf Mobile als priorisierte Rows + Detail-Sheets statt horizontalem Quetschen.
- Jeder neue interaktive Flow braucht Loading, Empty, Error, Disabled, Focus und Offline-Zustände.
- Safe Areas, Dynamic Type und Reduced Motion berücksichtigen.

## Campaign Runtime Contract
Eine Campaign ist kein linearer Storybaum. `WorldState + clock + event eligibility + prior decisions` bestimmen, welche Situationen verfügbar werden. Situationen haben Trigger, Cooldowns, Priorität, Visibility, Deadline und optionale mutually-exclusive Gruppen. Campaign-Ende nach 36 Monaten oder früher bei Insolvenz/Board Removal/definiertem Failure State.

## Nordkern Foods — 36 Monate
Ziel: Produktions-/CAPEX-/Kundenmix-/People-/Supply-Chain-Trade-offs über vier Phasen beweisen.

### Phase 1 — Stabilisieren (Monat 0–6)
- Ausgangslage: 148 Mio. EUR Umsatz, 620 MA, 3 Werke, ~91 % Auslastung, sinkende EBITDA-Marge.
- Pflichtfamilien: Thüringen-Automatisierung, Lidl-Mindestmarge/Promotions, knappe Produktionskapazität.
- Mögliche Folgeereignisse: Anlaufprobleme, Schichtkonflikte, Betriebsrat, Händlerreaktion, Opportunitätskosten schlechter Promotions.

### Phase 2 — Skalieren oder entlasten (Monat 6–15)
- Trigger aus Capacity, Cash, Morale und Kundenmix.
- Familien: zweites Werk vs. Debottlenecking, Premium-Produktmix, Foodservice-Ausbau, Lieferantenkonditionen, Qualitätsereignis/Rückrufrisiko.
- People: Umschulung/Nichtnachbesetzung vs. aktiver Abbau; Führungsspannen und Werkleitungskapazität.

### Phase 3 — Portfolio & Organisation (Monat 15–27)
- Familien: Akquisition/Joint Venture vs. organischer Ausbau; Handelsmarke vs. eigene Premium-Marke; zentrale vs. autonome Werkssteuerung.
- Trigger aus Verschuldung, Free Cash, Management Capacity, Market Position, Kundendiversifikation.
- Optionaler Krisenpfad: Rohstoff-/Energiepreisschock oder Ausfall eines kritischen Lieferanten.

### Phase 4 — Resilienz & Abschluss (Monat 27–36)
- Familien: Reinvestitionsplan, Kundenkonzentration, Nachfolge Schlüsselrollen, Capex-Disziplin, Board-/Eigentümererwartungen.
- Abschlussbericht trennt Company Outcome, Decision Quality, strategisches Profil und Luck/Outcome-Percentile.

Zielumfang: 24–30 bedeutende Entscheidungen pro typischem Run, aber nicht alle Situation Families in jedem Run. Mindestens 35 authorierte Situation Templates/Event Families, damit Runs divergieren können.

## Nexora — 36 Monate
Ziel: SaaS-Growth-/Product-/Runway-/Enterprise-/Org-Scaling-Trade-offs über vier Phasen beweisen.

### Phase 1 — TransLog vs. Plattform (Monat 0–6)
- Ausgangslage: 11,8 Mio. EUR ARR, 84 MA, -1,6 Mio. EBITDA, 5,2 Mio. Cash, 18 % ARR bei TransLog.
- Pflichtfamilien: Renewal, generische AI-Dispatch-Plattform, Engineering Allocation, Hiring/Runway.
- Folgeereignisse: Delivery Delay, Design-Partner-Akzeptanz, Mid-Market Win/Loss, Integrationsschuld.

### Phase 2 — Growth Engine (Monat 6–15)
- Trigger aus ARR Growth, Churn, Runway, Product Adoption.
- Familien: Pricing/Paketierung, Sales-Segmentfokus, Customer Success, Internationalisierung vs. DACH-Fokus, Funding Timing.
- People: VP Engineering/Product Leadership, Management Layer, Hiring Bar vs. Speed.

### Phase 3 — Scale-up Organisation (Monat 15–27)
- Familien: Enterprise vs. Mid-Market Org, Plattformteams vs. Produkt-Squads, zentralisierte Data/AI-Funktion, C-Level-Hiring, mögliche Akquisition/strategische Partnerschaft.
- Trigger aus Headcount, Manager Span, Burn Multiple, NRR, Customer Concentration und Technical Debt.
- Optionaler Krisenpfad: Großkunde churnt, Funding-Markt dreht, Security/Availability Incident.

### Phase 4 — Nachhaltiges Wachstum (Monat 27–36)
- Familien: Profitabilität vs. Wachstum, Expansion, Board/Funding, Portfolio-Fokus, Leadership Succession.
- Abschlussbericht trennt Company Outcome, Decision Quality, strategisches Profil und Luck/Outcome-Percentile.

Zielumfang: 24–30 bedeutende Entscheidungen pro typischem Run, mindestens 35 Situation Templates/Event Families mit state-basiertem Branching.

## AI Routing
- Default für Advisor, Company QA, Decision Interpretation, Risk/Objectives/Alternatives Extraction, Outcome Narration und Real-World-Debrief: `glm-5.3-flash:cloud`.
- Repair: zuerst strukturierter Repair-Retry mit Flash.
- Eskalation auf `glm-5.3:cloud` nur nach definiertem Schema-/Qualitätssignal oder für bewusst schwere Admin-/Authoring-Aufgaben.
- Business-Type-Eval vergleicht zusätzlich den bisherigen gpt-oss-Default als Baseline, ändert aber nicht den festgelegten Flash-Default ohne neue ADR.

## Non-Goals
- Kein Multiplayer.
- Keine globale Makroökonomie als eigener Prozess.
- Keine Simulation jedes Mitarbeiters.
- Keine Multi-Agent-C-Level-Architektur.
- Kein Formular-first Decision Flow.
- Kein Replatforming auf Supabase.
