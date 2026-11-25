# JPH Housekeeping — Design System (Master)

Derived from the **UI UX Pro Max** skill data (github.com/nextlevelbuilder/ui-ux-pro-max-skill):

- Product match: `products.csv` #55 "Home Services / inspection" → *Flat Design + Accessible*, secondary *Minimalism & Swiss*.
- Palette: `colors.csv` #51 "Construction/Architecture" (industrial grey + safety orange) and #102 "Inventory" (stock green), adapted to a **light-only** theme as required by the brief.
- Typography: `typography.csv` #5 "Minimal Swiss" — **Inter** only, weight variation for hierarchy.
- Rules: `references/quick-reference.md` §1–§6 and `references/pro-rules.md` pre-delivery checklist.

## Theme
Light only. No dark surfaces anywhere (user requirement). The `color-scheme: light` meta is set so phones in dark mode still render the light theme.

## Colour tokens
| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--bg` | `#F8FAFC` | page background | — |
| `--surface` | `#FFFFFF` | cards, sheets | — |
| `--muted` | `#F1F5F9` | chips, inputs at rest | — |
| `--border` | `#E2E8F0` | dividers, card borders | — |
| `--text` | `#1E293B` | body text | 14.6:1 on white |
| `--text-2` | `#475569` | secondary text | 7.6:1 on white |
| `--primary` | `#047857` | primary buttons, active states (OCP green) | 5.5:1 with white text |
| `--primary-soft` | `#ECFDF5` | selected chips, success banners | — |
| `--accent` | `#C2410C` | safety orange: warnings, "high" | 5.2:1 with white |
| `--danger` | `#B91C1C` | critical, destructive | 6.5:1 with white |
| `--info` | `#1D4ED8` | links, info | 6.7:1 with white |

Severity is never colour-only: every pin/badge also shows a letter (L / M / H / C) and the label.

| Severity | Fill | Text |
|---|---|---|
| Low | `#E2E8F0` | `#334155` |
| Medium | `#FEF3C7` | `#92400E` |
| High | `#FFEDD5` | `#9A3412` |
| Critical | `#FEE2E2` | `#991B1B` |

## Type scale (Inter)
12 / 14 / 16 (body) / 18 / 22 / 28 px. Line height 1.5 body, 1.25 headings. Body never below 16px on inputs (avoids iOS zoom).

## Spacing & shape
4/8 rhythm: 4, 8, 12, 16, 24, 32, 48. Radius 10px (controls), 14px (cards), 20px (sheets). One shadow level: `0 1px 2px rgba(15,23,42,.06), 0 4px 12px rgba(15,23,42,.06)`.

## Interaction
- Touch targets ≥ 48×48px, ≥ 8px apart.
- Pressed feedback ≤ 120ms via background change (no layout shift).
- `touch-action: manipulation`; one primary action per screen.
- Buttons show a spinner and are disabled during async work.
- Errors shown next to the field; toasts announced via `role="status"`.
- `prefers-reduced-motion` disables transitions.
- Visible 3px focus ring (`--primary`, offset 2px).

## Icons
Lucide (inline SVG, 24px, stroke 2). Decorative icons next to text get `aria-hidden="true"`; icon-only buttons get `aria-label`.

## Layout
Mobile-first. Top app bar + full-height map + bottom sheet list + one floating "New observation" button. Safe-area insets respected. Desktop: content max-width 1100px; admin uses a two-column layout ≥ 900px.
