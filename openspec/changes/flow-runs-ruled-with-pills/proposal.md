# Flow runs as a ruled list with status pills

## Why
The Dq case boards draw "Flows" as the runs alone, ruled. Each run has its name, its trigger in words, a status pill and the moment it started ("3 okt, 14:32"). Live added a "nothing running" line and an "Eerdere uitvoeringen" heading, showed the status and the raw trigger in the meta line ("Mislukt · object.updated"), a dot, and the age ("13d"). r31 counted 3 flags on each of DqZaak and DqZaakMeer.

## What changes
New `content` options for CnFlowRunsWidget, all off by default:
- `statusPill`: a pill per row in place of the dot, rows ruled on top, the status left out of the meta line.
- `statusLabels`: the words per status.
- `triggerLabels`: the meta line per trigger.
- `age: 'datetime'`: the start moment instead of the age.
- `historyTitle: false`: no "Earlier runs" heading.
- `quietLineWithHistory: false`: no "nothing running" line while finished runs are listed.
