# Proposal: board-pill-tones

## Why

COMPDIFF r19 (dossiq, 71 boards): the boards draw a neutral tag ("Normaal", "Uit", "Geen") as #3d4047 on the chip ground
#f0f1f3, and a count ("7", "14") as a 16px bubble in the same soft ink. Live, the neutral tag took the main text
(#1b1c1d) and every count stood 18.8px on a 1.4 line (17 counts on 15 boards). `--cn-board-text-soft`, the token
for that ink, resolved to the main text. The filter button's count drew dark ink on the primary fill under a theme
that forces the body ink onto every span (3.2:1, below AA).

## What changes

- `--cn-board-text-soft` mixes the main text with the muted text (45/55), the boards' #3d4047 on Nextcloud's pair.
- In the board look a default CnStatusBadge is that soft ink on `--color-background-hover`.
- The quick-filter and saved-view counts and the board view's column count are 16px tall (a 14px line on a 1px pad);
  the column count is weight 700 in the soft ink.
- The filter count hands its light ink to `--nldesign-color-on-surface`.

## Scope

Board look only. The default Nextcloud look keeps its badges and counts. The soft ink also reaches the other board
rules that already read the token (view toggle, row menu, store card description, tab and activity counts), which
the boards draw in the same #3d4047.
