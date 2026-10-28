# The linked mail list reads as the board's mail rows

## Why

DqZaakEmail draws each linked mail as a row under a hairline: a 32px grey initials tile, the subject at 15px/600 in the main ink over the sender in 13px muted, and a 34px bordered "Meer acties voor deze mail" button at the end. Live (r34) showed a 40px tinted avatar with 16px initials, the subject as an underlined primary link (thematiq's `a` rule), rows 45px for the board's 60-75, and no per-mail menu, so a handler could not unlink a mail from the case.

## What changes

- CnEmailTab: every linked mail gets a "more actions" menu beside its link: Open in Mail (when the mail has Mail ids) and Unlink mail (`DELETE /objects/{register}/{schema}/{id}/emails/{linkId}`, then the list reloads).
- Board look: the rows, the tile, the text and the menu button as the board draws them.
