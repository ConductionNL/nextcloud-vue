# board-attention-row

## Why

The boards tint the rows that wait for someone (the open access requests and invitations) a warm cream. An app could
already add a class to a row through `config.rowClass`, but no class drew that tint.

## What changes

- In the board look a row with the class `cn-row--attention` has its cells tinted with 4% of the warning colour over
  the main background.
