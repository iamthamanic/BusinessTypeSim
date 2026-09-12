# AI Contract — Business Type

## Role

The AI layer is an interface and interpretation layer. It may:

- understand free-form player input;
- turn a decision into structured proposed actions;
- answer advisor questions from visible run context;
- explain simulation results;
- summarize external comparison material.

## Boundaries

The AI layer must not directly change the authoritative simulation state, invent hidden scenario facts, bypass visibility rules or silently reinterpret an already committed action.

## Structured output

Machine-consumed AI output must be validated against a runtime schema before it is used by the application.

## Provider boundary

Model/provider details remain behind a server adapter. The application must not depend on provider-specific response structures.

## Fallback

If an AI provider is unavailable or returns invalid structured output, the core simulation remains usable and the client exposes a clear degraded state.
