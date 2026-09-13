# Simulation V2 & Campaigns — Issue Queue

Epic design: `.qa/design/simulation-v2-and-campaigns.md`

| Issue | Priority | Feature slug | Depends on |
|---|---|---|---|
| #2 Parametrisiere freie ManagementActions und Review-UI | P0 | `parameterized-management-actions` | — |
| #5 Erweitere den versionierten World State V2 | P0 | `world-state-v2` | #2 |
| #3 Baue eine autoritative Feasibility- und Constraint-Engine | P0 | `feasibility-constraint-engine` | #2, #5 |
| #4 Simuliere echte Wirtschaftszeit und Soft Deadlines | P0 | `economic-time-soft-deadlines` | #3, #5 |
| #6 Ersetze Keyword-DQ durch semantische Decision-Quality-Bewertung | P1 | `decision-quality-v2` | #2, #4, #5 |
| #7 Simuliere langfristige Outcomes und Vergleichsverläufe | P1 | `long-term-outcomes` | #4, #5, #6 |
| #8 Baue den state-getriebenen Campaign Runtime | P1 | `campaign-runtime` | #3, #4, #5, #6 |
| #9 Erstelle die vollständige 36-Monats-Campaign für Nordkern Foods | P1 | `nordkern-36m-campaign` | #7, #8 |
| #10 Erstelle die vollständige 36-Monats-Campaign für Nexora | P1 | `nexora-36m-campaign` | #7, #8 |
| #11 Setze GLM-5.3-Flash als Default und kalibriere das Modellrouting | P1 | `glm-routing-eval` | #2, #6 |
| #12 Härte Accounts und Sessions für die Public Beta | P1 | `public-beta-auth` | — |
| #13 Mach den KVM2-Stack produktionsbereit neben n8n | P1 | `kvm2-production-ops` | #12 |

## Cross-cutting rules
- Mobile first: Portrait 320–480 CSS px ist primäre Designachse; Web, Android und iOS sind Runtime-Achsen.
- UI folgt `docs/UI_STYLEGUIDE.md`: Executive Decision Room, max. fünf Bottom-Nav-Ziele, Touch Targets >=44 CSS px / Android bevorzugt 48 px, Safe Areas, Dynamic Type, Reduced Motion.
- Jede interaktive UI braucht relevante Loading-, Empty-, Error-, Disabled-, Focus- und Offline-Zustände.
- TypeScript strict; keine Type-Escape-Hatches.
- Nur die pure Simulation Engine mutiert autoritativen World State.
- Default LLM: `glm-5.3-flash:cloud`; Eskalation `glm-5.3:cloud` nach definiertem Repair-/Komplexitätssignal.
- Self-hosted Deployment bleibt Hono + Postgres + Web auf Hostinger KVM2 neben n8n; kein Supabase-Replatforming in diesem Epic.
