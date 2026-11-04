# A board stat tile can carry its icon in a circle above the label

## Why

The learniq Today boards (LqTlVandaag, LqHrVandaag, LqZoVandaag, LqHrPersonen,
LqCfPrivacygovernance) draw a stat tile's icon in a 42px tinted circle above
the label, a 22px glyph, 10px over the label. The board look draws an 18px
glyph before the label, or with `iconPlacement: "end"` a 32px circle at the
right of the label row (DqDashboard, DqMijnTeam). No dossiq board draws the
circle above the label, so the new placement is opt-in.

## What changes

- `content.iconPlacement: "top"` under the board look draws the icon in a 42px
  circle above the label (`cn-kpi-card__badge--top`), tinted by the tile's
  state like the end circle, with no glyph before the label.
- A tile without `iconPlacement`, or with `"end"`, renders as before.
- Without the board look the key has no effect.
- No strings, no schema change.
