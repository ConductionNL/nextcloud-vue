# Proposal: sections-card-grid

## Why

DqDoorlooptijd draws "Naleving" as one card holding four small cards three to a row (compliance per case type, the
distribution, the monthly SLA trend and the throughput) with a footnote under them. The library had no way to group
dashboard widgets like that, so dossiq placed the four charts as separate grid tiles, two to a row at 551px (COMPDIFF
r20: four cards at width 348.7 > 551 and 1118, header weight 700 > 600, and no "Naleving" card).

## What changes

The `sections` widget gains `columns` (2 to 4): with `cards: true` the section cards sit side by side, at most that many
to a row and each at least 240px, 14px apart. It also gains `footnote`, a muted line under the sections. In the board
look a sections grid on a dashboard card keeps the card's inset and each section is the board's small card: a hairline
edge, a 10px corner, 14px 16px of padding, the heading at 15px 700. Without `columns` nothing changes.
