# UI Styleguide — Business Type

## Design thesis

Business Type fühlt sich wie ein ruhiger, hochwertiger **Executive Decision Room** an: analytisch, glaubwürdig und mobile-first. Keine Casual-Tycoon-Ästhetik, keine Coins, kein Dashboard-Spam.

## Principles

1. Decision first — pro Screen eine primäre Aufgabe.
2. Information before decoration — Daten und Unsicherheit sind Teil der Gestaltung.
3. Calm density — komplexe Informationen werden gestuft offengelegt.
4. Consequences are legible — positive, negative und unsichere Effekte sind unterscheidbar.
5. Chat is one tool, not the product — Company View und Timeline bleiben eigenständige Kernflächen.

## Tokens

| Token | Dark | Light |
|---|---:|---:|
| `--bg-canvas` | `#09131D` | `#F4F7F9` |
| `--bg-surface` | `#101E2B` | `#FFFFFF` |
| `--bg-elevated` | `#172838` | `#EAF0F4` |
| `--text-primary` | `#F2F7FA` | `#10202D` |
| `--text-secondary` | `#9DB0BE` | `#536875` |
| `--accent-decision` | `#9BC8F2` | `#1769AA` |
| `--positive` | `#62D59A` | `#137A4A` |
| `--warning` | `#E8B45D` | `#8A5C00` |
| `--negative` | `#F07979` | `#B52E35` |
| `--border-subtle` | `#25394A` | `#D7E0E6` |

## Typography and spacing

System UI fallback; Zielrichtung IBM Plex Sans. Body 16 px, Screen Title 26 px, Display 34 px. Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40. Touch targets mindestens 44×44 CSS px.

## Navigation

Bottom Navigation mit maximal fünf Zielen: Home, Unternehmen, Entscheidung, Team, Verlauf.

## Core screens

- Scenario Selection: Branche, Stage und Hauptkomplexität klar zeigen.
- Company Overview: wenige dominante Kennzahlen statt Widget-Wand.
- Decision Room: Deadline, Situation, Kerninformationen, Analyse/Team/Entscheidung.
- Advisors: Rollen- und Datenkontext sichtbar machen.
- Decision Composer: Freitext, Begründung und strukturierte Interpretation vor Commit.
- Decision Review: Decision Quality getrennt vom späteren Outcome.
- Decision Ledger: Situation → Information → Decision → Effect → Review.

## Accessibility

Ziel WCAG 2.2 AA. Sichtbarer Fokus, keine Information nur über Farbe, semantische Labels, Reduced Motion und Safe Areas beachten.

## Do / Don't

**Do:** ruhige Flächen, starke Hierarchie, strukturierte Evidence, kurze CTAs.

**Don't:** Glassmorphism, Neon-AI-Look, Coins/XP, winzige Texte, generische ChatGPT-Kopie.
