# record-notes-recorded-event

DqDagAfsluiten records a note and its hours with one button ("De knop legt de ingevulde notities en hun uren vast").
The hours are humaniq's row leaf, which cannot see the host's button. After a note is recorded on a list with a
`rowLeaf`, CnRecordNoteRows sends the document event `cn-record-notes:recorded` with the row's leaf props and the
note, so the leaf records what it holds for that object at the same moment.
