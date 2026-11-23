# Proposal: board-save-view-ground

## Why

The boards draw Save view on the page's light primary (#eaf0f7 on DqZaken, DqContacten, DqFilterBeheren,
DqFilterInMenu, DqZakenSorteren). Live draws #dce6f2: the control is a tertiary NcButton, and thematiq points
`--color-primary-element-light` at the tertiary's pressed ground on the button itself, so the board rule that reads the
variable on the button gets the pressed colour. COMPDIFF r20: 5 items, `background rgb(234, 240, 247)>rgb(220, 230, 242)`.

## What changes

The board look reads the tint and its hover on the `.cn-saved-views__save` wrapper (`--cn-save-view-ground`,
`--cn-save-view-ground-hover`), where the page's value still holds, and the button draws from those.

## Scope

Board-only. The ink stays #234a78 (7.88:1 on #eaf0f7).
