## ADDED Requirements

### Requirement: The history can show who read the record

A manage timeline with `readsToggle` SHALL draw a footer switch, off by
default. While it is off the count SHALL say the list holds changes only and
no audit trail SHALL be read. Switched on, the timeline SHALL read the
object's audit trail for `read` events and show each as an entry with its
reader and moment, newest first among the others, without entry actions. A
trail read that fails SHALL leave the reads out and SHALL NOT show the history
as failed.

#### Scenario: Ook wie de zaak las
- GIVEN the case history with `readsToggle` and Fatma Kaya's read on 6 Oct
- WHEN the reader switches "Ook wie de zaak las" on
- THEN the list shows "Ingezien · Fatma Kaya · 6 okt, Heeft het geopend" among the changes
