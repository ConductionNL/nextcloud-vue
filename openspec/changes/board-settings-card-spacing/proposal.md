---
kind: code
---

# Proposal: board-settings-card-spacing

## Summary

Under the board look an admin settings section (NcSettingsSection inside CnAdminSettingsShell) is drawn taller than the board draws its card. On portaliq's admin page, board PtBeheerinstellingen, the first card is 192px live and 136px on the board. The card's own column has a 14px gap, so the description sat 18px under the title (the gap plus its own 4px), while the boards draw title and description as one group 2px to 4px apart. A note card inside the card kept NcNoteCard's 16px margin above and below on top of the gap. The title was 19px, while the admin settings boards use 16px to 18px (17px on most). The padding was 22px 24px, while the admin settings boards use 20px 22px.

Under the board look an admin settings card now has 20px 22px padding and a 17px title, and its description pulls itself back to 4px under the title. A note card directly in the card adds no margin. The 14px gap still spaces the title group from the rest of the card.

## Scope

- `src/css/look-board.css`, scoped under `.cn-look-board` with the page guard, on the shell's cards (a section of the shell, also one inside a wrapping element). The title size and the description line height (1.5) apply to every board settings section. A CnSettingsPage card keeps its 22px 24px.
- No component or schema change.
