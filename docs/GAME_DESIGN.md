# Game Design — Business Type

## 1. Core promise

Business Type trainiert Management-Urteilsfähigkeit unter Unsicherheit. Es gibt keine versteckte „richtige Antwort“. Eine gute Entscheidung kann schlecht ausgehen; ein gutes Ergebnis kann aus einer schwachen Entscheidung entstehen.

## 2. Core loop

```text
Situation
-> vorhandene Informationen verstehen
-> Team befragen / Analysen anfordern
-> Unsicherheit einschätzen
-> freie Entscheidung + Begründung
-> Interpretation prüfen
-> Entscheidung committen
-> Simulation und Zeitfortschritt
-> Decision Quality Review
-> verzögerte Folgen erleben
-> nächste Situation
```

## 3. MVP scenarios

Drei bewusst unterschiedliche Ausgangswelten:

1. **SaaS Scale-up** — ca. 5–15 Mio. ARR; Product, Churn, Enterprise Sales, Finanzierung, Hiring.
2. **Mittelständischer Produzent** — ca. 100–200 Mio. Umsatz; CAPEX, Auslastung, Handel, Lieferkette, Personal.
3. **Kleines Dienstleistungsunternehmen** — ca. 1–5 Mio. Umsatz; Cashflow, Key-Person-Risiko, Pricing, erste Führungsebene.

Die konkreten Zahlen gehören in versionierte Scenario-Daten und werden nicht aus diesen Bandbreiten zur Laufzeit erfunden.

## 4. Company complexity

Stage wird nicht nur durch Umsatz bestimmt. Relevante Dimensionen:
- Revenue/ARR;
- Headcount;
- Management layers;
- Capital intensity;
- Regulation;
- Geographic footprint;
- Customer/supplier concentration;
- Ownership/funding;
- Product complexity;
- Operational complexity.

## 5. Information model

Jede Information ist eine von drei Klassen:

- **known:** sofort verfügbar und kostenlos;
- **researchable:** durch Analyse/Teamarbeit erschließbar, kostet Simulationszeit und ggf. Budget;
- **uncertain:** prinzipiell nicht sicher wissbar, nur als Schätzung/Wahrscheinlichkeit ausdrückbar.

Neugier wird nicht bestraft: Known-Daten sind kostenlos. Analyse kostet nur dann Zeit, wenn realistisch zusätzliche Arbeit nötig wäre.

## 6. Time

Ereignisgetriebene Simulation. Ein Entscheidungsfall hat eine Deadline; Analysen und Maßnahmen können Zeit verbrauchen. Konsequenzen können sofort oder verzögert eintreten.

Ein normaler vollständiger Run zielt im späteren Produkt auf etwa drei simulierte Jahre. Für den MVP-Vertical-Slice reicht ein kürzerer Ausschnitt, solange verzögerte Konsequenzen bereits beweisbar sind.

## 7. Decisions

Keine verpflichtenden A/B/C-Antworten. Spieler formulieren Aktionen frei. Die App zeigt vor dem Commit eine strukturierte Interpretation zur Korrektur.

Eine Entscheidung kann mehrere ManagementActions enthalten, z. B.:

```text
- Investment freigeben
- Headcount-Regel ändern
- Kundenvertrag neu verhandeln
- Produktpriorität verschieben
- Analyse beauftragen
```

## 8. Decision Quality

Sechs Dimensionen, jeweils 0–100:

1. Framing
2. Information
3. Alternatives
4. Objectives
5. Reasoning
6. Execution

Der Gesamtscore wird im MVP als geometrisches Mittel gebildet, damit ein extrem schwaches Glied nicht durch starke andere Werte vollständig überdeckt wird. Kalibrierung erfolgt über ein kuratiertes Eval-Set.

Scoring bewertet den Prozess auf Basis des Informationsstands zum Entscheidungszeitpunkt, nicht das spätere Glück.

## 9. Outcome

Outcome ist separat und verändert echte Unternehmenskennzahlen wie:
- Umsatz/ARR;
- Profit/EBITDA;
- Cash/Liquidität;
- Enterprise Value Proxy;
- Marktposition;
- Kundenabhängigkeit;
- Organisation/Morale/Turnover;
- Resilienz;
- operative Kapazität.

Es gibt keinen einzelnen „Company Health“-Wert, der alle Trade-offs versteckt. Zusammenfassungen dürfen existieren, aber Detailkennzahlen bleiben sichtbar.

## 10. Luck / counterfactual view

Später kann dieselbe committed Entscheidung mit mehreren Seeds offline/serverseitig erneut simuliert werden, um Expected Outcome vs. Actual Outcome zu zeigen. Das ist kein MVP-Blocker, aber das Datenmodell muss Replay ermöglichen.

## 11. Advisors

Virtuelle Führungskräfte sind Rollen mit begrenzter Datenzugriffssicht. Ein CFO kennt Finance/Forecasts besser als HR; niemand kennt Hidden Facts automatisch.

Advisor-Antworten dürfen:
- widersprechen;
- unvollständig sein;
- Unsicherheit benennen;
- unterschiedliche Ziele vertreten.

Sie dürfen nicht absichtlich falsche Fakten erfinden, außer ein Szenario modelliert explizit einen fehlbaren Stakeholder und die Aussage basiert auf dessen gespeicherter Wahrnehmung.

## 12. People decisions

Personal ist vollwertiger Simulationsbereich. Entscheidungen können gleichzeitig Revenue, Morale, Turnover, Management Capacity, Skill Mix und Employer Reputation beeinflussen.

## 13. Failure and loss

Ein Run kann wirtschaftlich scheitern (z. B. Insolvenz/Liquiditätskrise) oder strategisch in eine Sackgasse geraten. Das Spiel soll nicht jeden Run künstlich retten.

## 14. Debrief

Nach committed Entscheidungen kann ein externer Real-World-Debrief ähnliche historische Fälle recherchieren. Er ist Lernmaterial, niemals Teil des bereits berechneten Outcome.

## 15. Progression

MVP: Szenarien freischalten/abschließen und Decision-Quality-Profil aufbauen. Kein XP-Grind.

Später möglich:
- Branchen-/Stage-Pfade;
- Daily seeded challenge;
- Skill profile über mehrere Runs;
- Vergleich mit anonymisierten Verteilungen.

## 16. Anti-patterns

Nicht bauen:
- versteckte `correctAnswer`;
- willkürliche +10/-10-Punkte ohne Kausalmodell;
- random events ohne plausible Triggerbasis;
- künstliche Coin-/Energy-Ökonomie;
- 50 Branchen vor validiertem Core Loop;
- vollständige globale Makroökonomie im MVP.
