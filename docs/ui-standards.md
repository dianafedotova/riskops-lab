# UI Standards

## Non-negotiables

- Do not edit or move the logo in `components/brand-mark.tsx`.
- Do not redesign layouts or shift the geometry of existing screens.
- Only small cosmetic polish is allowed during standardization.

## Control contract

Shared branded primitives define the default behavior and style for:

- dropdowns and selects
- date pickers
- modal shells
- field labels and helpers
- validation and inline feedback states

## Styling expectations

- Keep trigger icon placement consistent.
- Keep selected, hover, focus, disabled, empty, and loading states consistent.
- Use the shared branded surfaces for menus and modal shells.
- Preserve spacing contracts already established by host screens.

## Implementation notes

- `shared/ui/control-styles.ts` is the current source of truth for form-control class contracts.
- Existing components should reuse shared control contracts before introducing new ad hoc styles.
- If a control needs a new variant, add it centrally and document why it differs.
