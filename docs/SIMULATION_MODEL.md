# Simulation Model — Business Type

## Core model

A run is defined by its scenario, version, seed, current day, visible company indicators, completed analyses, decisions, scheduled events and ledger entries.

## Reproducibility

The same scenario snapshot, seed and ordered player actions must lead to the same simulated result.

## Decision flow

Free-form input is converted into a structured proposal before it is accepted by the simulation. The proposal stores actions, assumptions, objectives, risks and evidence references.

## Effects

The engine distinguishes immediate effects from delayed effects. Delayed effects may depend on seeded probability and are resolved only when their simulated date is reached.

## Decision Quality

Decision Quality is calculated separately from the later company outcome. It contains Framing, Information, Alternatives, Objectives, Reasoning and Execution.

## Ledger

The timeline records Situation, Information, Decision, Immediate Effect, Delayed Effect and Review as distinct event types.
