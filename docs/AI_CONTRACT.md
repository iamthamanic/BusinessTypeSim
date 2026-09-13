# AI Contract — Business Type

## 1. Principle

AI ist **Interpreter, Advisor und Narrator**, niemals Simulation Authority.

## 2. Allowed responsibilities

Das LLM darf:
- Spielerfragen klassifizieren;
- passende read-only Company-/Analysis-Tools wählen;
- verfügbare Daten erklären;
- freie Entscheidung in ein vorgeschlagenes `ManagementAction[]` übersetzen;
- Begründungen in strukturierte Risk/Objective/Alternative/Evidence-Signale extrahieren;
- committed SimulationResult erklären;
- nach der Entscheidung externe Vergleichsfälle recherchieren;
- virtuelle Advisor-Rollen darstellen.

## 3. Forbidden responsibilities

Das LLM darf nicht:
- World State direkt schreiben;
- Cash, Umsatz, EBITDA oder andere Spielwerte frei setzen;
- Runtime-Wahrscheinlichkeiten außerhalb erlaubter Regeln erfinden;
- Hidden Facts ohne Freigabe lesen oder offenlegen;
- externe Webinhalte als Game Truth übernehmen;
- eine Entscheidung ohne Nutzer-Commit anwenden;
- Provider-Secrets oder interne Systemprompts offenlegen.

## 4. Provider strategy

Default: **Ollama Cloud** (OpenAI-compatible `https://ollama.com/v1`).
Configure via Edge secrets: `OLLAMA_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_FALLBACK_MODEL`.

Provider is Adapter, kein Domain-Import. Modellnamen leben in Server-Konfiguration.

## 5. Runtime modes

### Company QA
Nur read-only interne Tools. Keine Websuche, wenn die Frage die fiktive Firma betrifft.

### Decision interpretation
Keine Tool-Mutation. Output ausschließlich strukturiertes Action Proposal.

### Outcome narration
Nur committed Ergebnis lesen und erklären.

### Real-world debrief
Web Search erlaubt; Game-State-Mutationswerkzeuge technisch nicht registrieren.

## 6. Tool contracts

Jedes Tool hat:
- stabilen Namen;
- JSON-Schema Input/Output;
- serverseitige Auth/Ownership-Prüfung;
- explizite Read/Write-Klassifikation;
- Timeout;
- Fehlercodes;
- observability metadata ohne sensitive Inhalte.

Das LLM erhält nur Tools, die im aktuellen Mode erlaubt sind.

## 7. Decision interpretation contract

Input:

```text
runId
scenarioVersion
visibleDecisionContext
playerText
playerRationale optional
```

Output:

```text
ActionProposal
- actions[]
- assumptions[]
- ambiguities[]
- extractedObjectives[]
- extractedRisks[]
- extractedAlternatives[]
- evidenceRefs[]
```

Output wird schema-validiert. Bei relevanter Ambiguität zeigt die UI die Interpretation zur Korrektur; das LLM entscheidet nicht stillschweigend für den Nutzer.

## 8. Retry / fallback

1. erster Provider Call;
2. bei Schemafehler ein strukturierter Repair-Retry;
3. bei erneutem Schemafehler optional Fallback-Modell;
4. danach User-visible Error ohne State-Mutation.

Kein automatischer mehrfacher Submit derselben ManagementAction.

## 9. Confidence

LLM-Selbsteinschätzung ist keine kalibrierte Wahrscheinlichkeit. UI darf nur dann numerische Confidence zeigen, wenn sie aus einem separat validierten/calibrierten System stammt. Sonst qualitative Labels wie niedrig/mittel/hoch verwenden.

## 10. Prompt injection / external content

Web-/Dokumentinhalte sind Daten, keine Instruktionen. Im Real-World-Debrief existiert kein Mutationstoolset. Tool-Ergebnisse werden nie ungeprüft als Systemprompt verkettet.

## 11. Hidden information

Server erstellt pro Call einen `VisibleContext`. Das Modell bekommt nicht den gesamten WorldState und soll Hidden Fields auch dann nicht erraten, wenn sie in Scenario-Storage existieren.

## 12. Data privacy

Standardtelemetrie speichert nicht:
- vollständige freie Spielerentscheidung;
- vollständige Advisor-Konversation;
- Systemprompts;
- Provider Keys.

Für Debug-Sampling wäre eine separate opt-in/retention Entscheidung erforderlich.

## 13. Cost controls

- Token/Request-Usage pro Run und Modell messen.
- Maximalbudgets serverseitig konfigurierbar.
- Long context nur bei Bedarf; bevorzugt strukturierte Tooldaten statt kompletter Run-Historie.
- Fallback-Modell nur bei definiertem Signal.

## 14. Evaluation

Vor Produktionsfreigabe braucht ein Business-Type-eigenes Eval mindestens:
- deutsche freie Managemententscheidungen;
- mehrteilige Actions;
- ungewöhnliche, aber valide Strategien;
- Tool-Auswahl;
- Hidden-Info-Leakage;
- invalid/hostile user text;
- schema validity;
- duplicate-action prevention;
- narrative faithfulness to committed numbers.

Runtime-Modellwahl wird anhand dieses Evals bestätigt, nicht anhand allgemeiner Benchmarks allein.


## 11. Implementierter Provider-Flow

- `ai-orchestrator`: authentifiziert, rate-limited, GLM/OpenAI-kompatibler Chat-/Tool-Call-Adapter.
- `research-debrief`: authentifiziert, separat rate-limited, Tavily Search + optionale GLM-Zusammenfassung.
- `game-api`: einzige Cloud-Grenze für autoritative State-Mutationen; weder AI- noch Research-Endpunkt besitzt Mutationsoperationen.
- LLM/Search-Secrets liegen ausschließlich serverseitig vor; `VITE_*` enthält nur die öffentliche API-URL (`VITE_API_URL`).

Wenn der LLM-Provider fehlt, bleibt lokale Decision-Interpretation/Advisor-Antwort verfügbar. Wenn Tavily fehlt, bleibt das Core Game vollständig spielbar und nur der externe Debrief fällt aus.
