# Proposal: board-card-title-gap

## Why

COMPDIFF r19 measured the gap from a card's title to the first line of its body 4.1px larger than the boards draw it,
on 53 cards across 38 boards (11 against 13.5 on a side card, 12 against 15.1 on a body card). The boards set every
line at the font's normal line height (1.2 for Fira Sans) and measure 12px (10px on a side card) from glyph to glyph.
The board look set the title at line height 1.3 and Nextcloud sets body text at 1.5, so each card added the half-leading
under its title and above its first line on top of the board's gap.

On the data card ("Zaakgegevens", "Prioriteit") the first label sat 8px lower again: the look's grid gap and cell
padding had the same specificity as the component's scoped rules, which load later and won.

## What changes

In the board look a card title (detail body and side cards, `CnDetailCard`, dashboard cards) has line height `normal`,
and the space under it is the board's gap minus `--cn-board-first-line-leading` (0.15em, the half-leading of a 1.5 line).
The data card's grid and cell rules outrank the component's scoped rules. The Nextcloud look is unchanged.
