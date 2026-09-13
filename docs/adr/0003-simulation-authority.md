# ADR-0003 — Simulation Core ist autoritativ

Status: Accepted

## Context
LLM-Antworten sind probabilistisch und können bei identischem Prompt variieren.

## Decision
Nur die pure Simulation Engine verändert autoritative Unternehmenswerte. AI interpretiert Nutzerabsicht und erklärt Ergebnisse; Action Proposal wird vor Commit validiert.

## Consequences
Runs sind reproduzierbar und testbar. Neue Regeln benötigen Domain-Tests statt Prompt-Tuning allein.
