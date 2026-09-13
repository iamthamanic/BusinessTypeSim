# Project Setup Report — Business Type

## Mode
`init` + erster MVP-Vertical-Slice.

## Discovery summary

- Repository: `iamthamanic/BusinessTypeSim`
- App root: `.`
- Stack: Vite + React + TypeScript + Capacitor
- Backend: Postgres + Hono API (Hostinger Docker)
- Dev URL: `http://localhost:5173`
- Locale: `de`
- typedStrict: `typescript`

## Implementierter Stand

Der MVP enthält drei spielbare Szenarien, den vollständigen Decision Loop, pure seeded Simulation, Decision-Quality-Scoring, verzögerte Outcomes, lokalen Persistenzmodus, Cloud Runs über self-hosted API, Advisor/Decision AI Adapter und einen getrennten Real-World-Research-Debrief.

Capacitor ist von Beginn an Teil der Runtime-Architektur. `capacitor.config.ts` und `scripts/setup-native.mjs` sind vorhanden; Android/iOS-Verzeichnisse werden nach Dependency-Installation mit `npm run native:setup` erzeugt.

## QA

- Acceptance: `.qa/acceptance/mvp-core-loop.md`
- Design: `.qa/design/mvp-core-loop.md`
- Project config: `.qa/project.yaml`
- Domain self-check: ausführbar ohne externe Dependencies
- vollständige npm/Vite/Vitest/Capacitor-Gates benötigen installierte Dependencies

## Environment limitation

Der Build-Container konnte die npm Registry nicht erreichen; `npm install` lief in einen Netzwerk-Timeout. Daher sind noch kein `package-lock.json`, `node_modules`, `android/` oder `ios/` generiert. Das ist ein Umgebungsblocker für den nativen/buildseitigen Nachweis, kein offener Architekturpunkt.

## PRD status

`READY WITH ASSUMPTIONS`. Offene Public-Beta-Themen bleiben Datenschutz/Retention, finale OS-Minimum-Versionen, Lizenz und Scoring-Kalibrierung.
