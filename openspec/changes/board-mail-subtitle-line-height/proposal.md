# The mail card's description runs on the normal line height

## Why

With thematiq #1402 the board paragraph token yields, so the E-mail card's description is 14px as the board look sets it, but it takes the token's 1.5 line height (21px lines; probed on :8080 after REFRESH-4b). The board draws it on the normal line height (DqZaakEmail r29: E-mail gapBelowTitle 44.4 vs 49).

## What changes

- Board look: the mail card's description has `line-height: normal`.
