---
kind: code
---

# Proposal: board-buildiq-orange

## Why

The buildiq square carries a white icon on orange. The brand orange #f36c21
gives that icon 3.01:1, and the boards' #e2611a 3.52:1; neither reaches the
4.5:1 Ruben asked for on 26 Oct ("fix the contrast properly": a WCAG-AA
primary, white at 4.5:1 or more, or dark text on the orange, whichever keeps
the brand closest). The boards were also split: the Dq boards drew #f36c21,
every other board #e2611a.

## Choice

#c64e0b: the brand orange (hue 21.4 degrees) darkened in lightness
(hue 21.5), and already the Conduction design system's accent, so the
square and the accent are one orange.

| fill | white icon | edge on page ground #f5f6f8 | dark ink #1b1c1d |
|---|---|---|---|
| #f36c21 (brand) | 3.01:1 | 2.78:1 | 5.67:1 |
| #e2611a (old boards) | 3.52:1 | 3.26:1 | 4.84:1 |
| #c64e0b (chosen) | 4.67:1 | 4.32:1 | 3.65:1 |

Dark ink on the brand orange (5.67:1) keeps the fill but turns the white
mark dark, and its edge on the page ground stays 2.78:1, under the 3:1 a
control's boundary needs; the darker orange keeps the white mark, the hue,
and both ratios.

## What changes

In the board look the buildiq square sets `--cn-buildiq-color: #c64e0b`.
The Nextcloud look keeps the brand orange. The boards draw the same value
(design-system).

## Rollback

Revert the commit.

## Superseded (26 Oct 2026)

Ruben decided on 22 Oct that the boards follow the app: design-system 4db25d04 moved the 65 Dq boards to #f36c21. The board-look override to #e2611a is removed; the square is #f36c21 in both looks (r31: buildiq background flagged on every Dq board).
