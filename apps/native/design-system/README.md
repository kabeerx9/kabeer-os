# Native Design System

This folder is the reusable visual foundation for new apps built from this template.
Use these tokens and primitives as the first layer before product-specific screens are added.

## Import Surface

Use the package barrel for product screens:

```ts
import { AppText, BrandWordmark, Button, Pill, Screen, Surface, colors, spacing } from "@/design-system";
```

## Rules

- Do not hardcode brand colors in feature screens. Add missing values to `tokens.ts` first.
- Use `Screen` for page roots, `Surface` for cards/sheets/panels, `AppText` for text, and `Button`/`IconButton` for actions.
- Keep product-specific copy and visual decisions in feature screens, not in shared primitives.
- Prefer extending tokens over introducing one-off style constants.

## Mapping Design References to Native

When a project has HTML, Figma, or image screen references, map the reference to native directly.

- The mock device background maps to the screen background.
- Add `Surface` only when the mock visibly shows a card, sheet, panel, toast, modal, or raised block.
- If mock content sits directly on the device background, place native content directly on the screen.
- Preserve the mock's hierarchy first: background, safe area, header, body, actions, bottom nav or overlay.
- Use design-system primitives to reproduce the reference, not to reinterpret it.
- Keep existing app behavior wired underneath the visual structure, such as auth and navigation.

## Core Primitives

- `AppText`: type scale and tone control.
- `BrandWordmark`: reusable `starter.app` mark with mint GPS dot.
- `Button`: pill/circle actions for primary, purple, dark, ghost, and destructive actions.
- `IconButton`: fixed-size icon action wrapper with hit slop and press states.
- `Pill`: category, status, score, and filter chips.
- `Screen`: safe-area page root with product background and default padding.
- `Surface`: cards, sheets, and raised panels.

## Token Groups

- `colors`: brand, discovery, status, transport, surface, text, border.
- `spacing`: page padding, card padding, section gaps, tab height, status bar height.
- `radius`: cards, sheets, pills, and small controls.
- `typography`: font names, sizes, line heights, and weights.
- `shadows`: soft, card, purple, and mint elevations.
- `layout`: icon sizes, tab bar height, hit slop.
