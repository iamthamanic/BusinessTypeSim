# ADR-0001 — Capacitor ab Projektstart

Status: Accepted

## Context
Business Type ist Mobile-first, soll aber eine gemeinsame Web-Codebasis für Android und iOS behalten.

## Decision
Vite/React wird von Anfang an mit Capacitor betrieben. Native Plattformen werden aus dem gebauten Web-Bundle synchronisiert; native APIs bleiben hinter Adaptern.

## Consequences
Eine Codebasis für Web/Android/iOS; Safe Areas und native Lebenszyklen müssen von Beginn an getestet werden. Native Projekte benötigen Android Studio bzw. Xcode.
