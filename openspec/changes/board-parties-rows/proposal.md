# The parties widget's rows in the board look

## Why
DqZaakBetrokkenen "Rollen" (r26c) draws one ruled row per party. Each row has a 32px initials tile, the name over one muted meta line that names the role ("Primaire partij · verzoeker", "Gemachtigde namens ... · Awb 2:1"), and the pills at the end. Live drew role headings with unruled rows, and each detail sat in its own span.

## What changes
In the board look, CnObjectPartiesWidget draws that row. The meta line joins the primary mark, the role, the kind, whom the party represents, its extra lines, e-mail and documents. The not-accepted pill, the indicators and the remove button sit at the end. The role headings stay for assistive tech but are visually hidden. The Nextcloud look is unchanged. No schema change.
