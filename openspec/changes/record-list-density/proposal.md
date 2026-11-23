# Proposal: record-list-density

## Why

DqProcesanalyse draws "Waar zaken blijven hangen" as a dense list: each row 10px above and below, 56px tall, the title
at 500 with a 13px muted line under it. A dashboard record list draws 14px rows with the title at 600, so the card grew
and the titles read heavier than the board.

## What changes

CnRecordListWidget takes `content.density: "compact"`, which marks the list `cn-record-list--compact`. A compact list
draws its rows 10px above and below with a 56px minimum height and the title at 500, in the default look and on a board
dashboard. Without the key nothing changes.

## Scope

nextcloud-vue; dossiq sets it on the Procesanalyse card (R22-DASH). Manifest widget content is open, so no schema change.
