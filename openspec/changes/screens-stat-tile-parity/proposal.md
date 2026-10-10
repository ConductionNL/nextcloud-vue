---
kind: code
---

# Proposal: screens-stat-tile-parity

## Summary

The DqDashboard board draws its KPI tiles as one link each: the label left
(14px, grey), the icon in a 32px tinted circle at the right of the label row,
the value at 28px coloured by the tile's state (red for "Te laat", green for
"Afgehandeld deze maand" and "Binnen termijn"), and the caption on its own
line under it.

Under the board look dossiq gets something else today: its tiles name no
`content.layout`, so they take the horizontal card, and the board look draws
the icon as an 18px glyph before an underlined label (the NL Design theme
underlines every link, and the opt-out exists only for the stacked layout).

This change, behind the board look only:

1. A tile without `content.layout` takes the stacked layout (every KPI tile
   on the screens is stacked). An explicit `layout` keeps what it says.
2. `content.iconPlacement: "end"` draws the icon in a 32px circle at the
   right of the label row, tinted by the tile's state.
3. A linked board tile is not underlined in any layout.
4. The value keeps its state colour (`variant`, `variantWhen`, overrides), the
   success tone included, as DqDashboard draws it. This amends the
   `screens-dashboard-parity` sentence "the value in the main text colour",
   which only held for a tile without a state.

Source: round6 dossiq library gap 8.

## Reference screens

- `dossiq/DqDashboard`: https://identity.conduction.nl/screens/board?id=dossiq/DqDashboard
- `opencatalogi/OcDashboard`, `keepiq/KqDashboard`: the glyph before the
  label, which stays the default placement.

## Affected consumers

Apps with `look: "board"` (dossiq, pipelinq, portaliq). A board app whose
tile sets no layout now gets the stacked tile, which is what every board
draws. Apps without the board look render exactly as today.

## Backward compatibility

Additive and opt-in. No manifest schema change: widget `content` is free-form.
