# Proposal: tasks-table-board-options

## Why

DqZaakTaken draws the record's task table with the deadline as a date ("18 okt", amber when late), the status in the
app's words and tones ("In behandeling" purple, "Klaar"), and "Alle taken van deze zaak in Taken" under the table. The
table wrote "4 dagen over tijd", the library's state words in its own tones, and put the link in the card header,
where a tab panel also repeated it in the tab row.

## What changes

Table-only, opt-in content keys: `dueFormat: "date"`, `stateLabels`, `stateColors`, `viewAllPlacement: "footer"`.
An overdue deadline shown as a date keeps its weight and colour and says "Overdue" to a screen reader.
