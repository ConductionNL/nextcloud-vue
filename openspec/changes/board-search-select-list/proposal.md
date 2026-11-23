# Proposal: board-search-select-list

## Why

r34 measured the open search lists against the boards. DqNieuweZaak "Aanvrager" and DqOverdragen "Nieuw team" draw
the list as a card 4px under the field: a 1px hairline all round, radius 8, a soft shadow. Live hung NcSelect's 2px
frame from the field with no top edge and square corners. The rows were 20px in where the boards draw 10 (people) and
12 (teams), the highlighted row was hover grey instead of the light primary, and a person's chip was 32px light primary
on every row where the board draws 28px, white on the highlighted row and grey on the others. The open field had a 1px
edge where the boards draw 2px in the primary colour.

## What changes

In the board look, a CnSearchSelect's open list (teleported to the body, so keyed on the body like the board menus)
becomes the drawn card, its highlighted row takes the light primary ground, its leads the drawn grounds, a person row
8px 10px in with a 28px chip and 14px / 12px text, a row with an icon 10px 12px in with 12px before the text. The open
search field takes a 2px primary edge. Other selects and the Nextcloud look are unchanged.
