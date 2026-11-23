# A plan reads as the board's ruled rows

## Why
r31's strict verdict on DqZaak and DqZaakMeer "Zaakplan" counted:
- rows on a grey ground at weight 600, where the board has white rows at weight 500 with a line under the name;
- pills at weight 400 and 23.5px high, where the board has weight 600 and 21px;
- the "Wacht" pill in the body ink, not the board's soft ink.

## What changes
- A plan row shows its item's `description` as a muted line under the name.
- The board look rules each row, sets the name at 15px/500 and the state as a 13px/600 pill on the normal line: success for completed, primary for active, soft ink otherwise.
