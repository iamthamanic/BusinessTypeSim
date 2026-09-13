# Business Type — Cross-cutting Edge Cases

Diese Liste ergänzt feature-spezifische Acceptance-Artefakte.

## Simulation

- **SIM-01 Seed replay:** Gleicher Scenario-Snapshot + gleiche Actions + gleicher Seed erzeugen denselben autoritativen Verlauf.
- **SIM-02 Invalid action:** Eine ungültige oder unbekannte Action verändert keinen World State.
- **SIM-03 Partial action:** Mehrteilige Managemententscheidungen werden atomar validiert; Teilanwendung ist nicht erlaubt.
- **SIM-04 Delayed events:** Verzögerte Konsequenzen dürfen weder doppelt noch vor ihrer Fälligkeit angewandt werden.
- **SIM-05 Time collision:** Mehrere Events am selben Simulationszeitpunkt haben eine stabile, dokumentierte Reihenfolge.
- **SIM-06 Money precision:** Geld wird in Minor Units/Integern verarbeitet; kein Float-Rundungsfehler darf State mutieren.
- **SIM-07 Probability bounds:** Wahrscheinlichkeiten bleiben nach Modifikatoren zwischen 0 und 1.
- **SIM-08 Scenario version:** Ein laufender Run bleibt an seine Scenario-Version gebunden, auch wenn Content später geändert wird.

## AI / Tools

- **AI-01 Hallucinated tool:** Unbekannte Toolnamen oder Parameter werden abgelehnt.
- **AI-02 Invalid structured output:** Schemafehler führen zu Retry/Fallback oder sicherem Fehler, niemals zu State-Mutation.
- **AI-03 Tool timeout:** Nutzer erhält einen klaren Fehlerzustand; die Entscheidung bleibt ungesendet.
- **AI-04 Prompt injection:** Externe Suchinhalte dürfen keine autoritativen Game-State-Tools auslösen.
- **AI-05 Hidden information:** Das LLM erhält nicht automatisch researchable/hidden Felder, bevor das Spiel sie freigibt.
- **AI-06 Model fallback:** Ein Fallback darf semantisch keine bereits angewandte Action erneut ausführen.

## Mobile / Connectivity

- **MOB-01 Offline open:** Letzter sicher gecachter Stand darf angezeigt werden, aber keine autoritative Simulation offline starten.
- **MOB-02 Network loss on submit:** Client zeigt unklaren Commit-Status nicht als Erfolg; Server-Idempotency verhindert Doppelentscheidungen.
- **MOB-03 App resume:** Nach Hintergrund/Resume wird der Run-State gegen den Server reconciled.
- **MOB-04 Small screen:** Kernaktionen bleiben bei 320 CSS px Breite bedienbar und lesbar.
- **MOB-05 Safe area:** Top- und Bottom-Actions bleiben außerhalb von Notch/Home-Indicator-Zonen.

## Security

- **S-01:** Abgelaufene oder fehlende Session kann keine geschützten Run-Daten lesen oder verändern.
- **S-02:** Ein Nutzer kann niemals Runs anderer Nutzer über ID-Manipulation lesen oder verändern.
- **S-03:** LLM- und Search-Secrets erscheinen nie im Client-Bundle, Logs oder Analytics.
- **S-04:** RLS bleibt auch bei direkten REST-Anfragen wirksam.
- **S-05:** Freitext wird als untrusted input behandelt und nicht ungefiltert in HTML gerendert.
- **S-06:** Rate Limits schützen AI- und Analyse-Endpunkte vor Missbrauch und Kostenexplosion.
- **S-07:** Fehlerantworten enthalten keine Stacktraces, Provider-Secrets oder internen Prompt-Inhalt.
- **S-08:** Telemetrie enthält keine vollständigen Spieler-Chats oder freien Begründungen standardmäßig.
