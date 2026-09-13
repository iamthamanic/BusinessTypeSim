# Simulation Model — Business Type

## 1. Authority

Die Simulation Engine ist die einzige Autorität für World-State-Änderungen. LLM, UI und externe Recherche liefern keine autoritativen Zahlen.

## 2. State contract

Ein `WorldState` ist versioniert und enthält mindestens:

```text
metadata
clock
company
financials
organization
workforce
customers
products
operations
locations
suppliers
competitors
market
ownership
contracts
projects
risks
knowledge
scheduledEvents
```

Nicht jede Branche nutzt jede Dimension gleich stark; ungenutzte Module müssen explizit leer/disabled sein, nicht halluziniert.

## 3. Value representations

- Money: integer minor units, z. B. Cent.
- Percentages: basis points oder klar definierte Integer-Skala.
- Probabilities: intern normalisiert und nach jedem Modifikator auf `[0, 1]` begrenzt.
- Dates: ISO-8601; Simulation Clock besitzt eine definierte Zeitzone/kalenderneutrale Domain-Semantik.
- IDs: stabile opaque IDs, keine UI-Namen als Schlüssel.

## 4. ManagementAction

Basistyp:

```text
id
kind
actor
parameters
rationaleRefs
createdAtSimTime
schemaVersion
idempotencyKey
```

MVP-Kinds können umfassen:

```text
allocate_capital
change_hiring_policy
change_headcount_plan
set_pricing_policy
renegotiate_customer
accept_contract
reject_contract
prioritize_product
start_project
cancel_project
request_analysis
```

Neue Action-Kinds erfordern Domain-Schema, Regeltests und Migrations-/Kompatibilitätsentscheidung.

## 5. Rule classes

### Deterministic rules
Beispiele:
- CAPEX reduziert Cash um einen bekannten committed Betrag.
- eingestellte Mitarbeiter erhöhen Payroll ab definiertem Datum.
- Vertragskündigung entfernt zukünftige committed Revenue nach Vertragslogik.

### Probabilistic rules
Beispiele:
- Kunde akzeptiert Preisverhandlung;
- Projekt verzögert sich;
- Mitarbeiterfluktuation;
- Wettbewerber reagiert.

### Delayed rules
Effekt wird als `ScheduledEvent` mit Fälligkeit und Ursache persistiert.

## 6. Probability model

Eine Wahrscheinlichkeit entsteht aus:

```text
base probability
+/- state modifiers
+/- action modifiers
+/- relationship/market modifiers
= bounded probability
```

Jeder Modifier muss:
- einen fachlichen Namen haben;
- testbar sein;
- in Debug/Audit erklärbar sein;
- eine Ober-/Untergrenze besitzen.

Keine LLM-generierten Laufzeitwahrscheinlichkeiten ohne vorab erlaubten, schema-validierten Bereich.

## 7. RNG and seed

Jeder Run besitzt einen Root Seed. Jede Random-Ziehung verwendet stabile Substreams/Keys, damit das Hinzufügen einer unabhängigen neuen Random-Ziehung nicht zwangsläufig alle späteren Outcomes verschiebt.

Beispiel-Key:

```text
runSeed + eventType + entityId + occurrenceIndex
```

## 8. Simulation step

```text
Preconditions validate
-> apply deterministic effects
-> evaluate probability rules
-> schedule delayed effects
-> advance clock if action consumes time
-> resolve due events in stable order
-> validate invariants
-> produce immutable result
```

Fehler vor Commit bedeuten: kein partieller State.

## 9. Event model

```text
RunEvent
- eventId
- runId
- type
- simTime
- causeEventId / decisionId
- payload
- visibility
- schemaVersion
- rngEvidence? (keine Secrets)
```

Visibility:
- player_visible
- hidden
- researchable
- system_only

## 10. Knowledge model

Die Engine unterscheidet Unternehmensrealität von Spielerwissen.

```text
truthState
playerKnowledge
advisorKnowledge
```

Ein CFO kann z. B. eine Forecast-Schätzung kennen, ohne dass sie „Wahrheit“ ist. Research kann Knowledge verändern, nicht rückwirkend Truth.

## 11. Analyses

`AnalysisRequest` definiert:
- type;
- requested information;
- simulated duration;
- direct cost optional;
- output visibility;
- confidence/calibration type;
- prerequisites.

Nach Ablauf erzeugt die Engine/Content-Regel ein AnalysisResult aus bereits definierten oder ableitbaren Scenario-Daten. LLM formuliert, aber erfindet keine zugrunde liegenden Fakten.

## 12. Decision Quality inputs

Die Engine speichert zum Commit-Zeitpunkt ein `DecisionContextSnapshot`:
- verfügbarer Knowledge State;
- angefragte Analysen;
- erkannte Risiken/Ziele/Alternativen aus validierter AI-Extraktion;
- finale Actions;
- Deadline/Constraints.

Damit wird spätere Bewertung nicht durch nachträglich bekannt gewordene Informationen verfälscht.

## 13. Scoring

Sechs Subscores 0–100. Semantische Extraktion liefert schema-validierte Evidence (lokal regelbasiert oder LLM-assistiert); Score-Regeln sind deterministisch/konfiguriert und vergeben keine LLM-Noten. Keyword-Stuffing ohne strukturelle Signale wird abgestraft.

Gesamt:

```text
geometric_mean(framing, information, alternatives, objectives, reasoning, execution)
```

Score-Definitionen müssen scenario-spezifische Rubrics erlauben, aber gemeinsame Skalen verwenden. `DecisionContextSnapshot` friert den Wissensstand beim Commit ein.

## 14. Snapshots and replay

- append-only Events sind Auditbasis;
- Snapshot nach Decision Commit oder konfigurierbaren Intervallen;
- Replay von ScenarioVersion + Events + Seed muss denselben State rekonstruieren;
- alte Runs werden nie still auf neue Scenario-Regeln migriert.

## 15. Scenario versioning

Scenario-Version enthält:
- world schema version;
- initial world state;
- rule configuration;
- event pool;
- analysis catalog;
- scoring rubrics;
- advisor roles;
- content strings/refs.

Published Version ist immutable. Änderungen erzeugen neue Version.

## 16. Invariants

Mindestens:
- Cash/Balance-Werte folgen definierter Finance-Logik;
- keine nicht-finite Zahl;
- Probability bounds;
- Entity references zeigen auf existierende Entities oder explizit tombstoned IDs;
- Event causal refs sind gültig;
- SimTime bewegt sich nicht rückwärts;
- Decision ID wird höchstens einmal committed;
- Hidden Information wird nicht durch Player Read Model geleakt.

## 17. MVP simplifications

- keine globale Agentenpopulation;
- keine Simulation jedes einzelnen Mitarbeiters;
- keine makroökonomische Welt als eigener Prozess;
- keine sekündliche Echtzeit;
- kein Multiplayer-State;
- keine verteilte Event-Bus-Architektur.

Aggregierte Module sind ausreichend, solange der Spieler plausible CEO-Trade-offs erlebt.


## 18. MVP implementation subset

Der Core startete mit einem kleineren `RunState` (Scenario-Version, Seed, Simulations-Tag, aggregierte CompanyMetrics, Analysen, DecisionRecord, ScheduledEvents, Ledger).

**World State V2** (`schemaVersion: 2`) erweitert denselben JSONB-Snapshot um typisierte Module (`customers`, `products`, `departments`, `projects`, `keyPeople`, `locations`, `contracts`, `competitors`) plus getrennte `playerKnowledge` / `advisorKnowledge`. Player-/Advisor-Read-Models filtern `hidden` / `researchable` / `system_only`. Veröffentlichte Scenario-Versionen bleiben immutable; Runs binden `scenarioVersion`. V1-Snapshots werden deterministisch normalisiert (leere Module, wenn die gebundene Scenario-Version kein `initialWorld` hat).

Cloud-Runs werden als JSONB-State plus relationaler Run-Metadaten persistiert. Eine serverseitige `revision` schützt parallele Mutationen per optimistischer Versionskontrolle. Der lokale Demo-Modus nutzt denselben Core ohne Serverautorität und ist nicht für Competitive/Leaderboard-Wertung vorgesehen.
