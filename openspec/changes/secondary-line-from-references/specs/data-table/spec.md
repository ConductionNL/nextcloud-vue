## ADDED Requirements

### Requirement: A table column's secondary line can read the records its row points at

A column MAY declare `secondaryRefs`, aliases for records the row references. The table SHALL read each referenced record once per id and fill the secondary line from the row with those records under their aliases. A reference MAY declare `counts`, count aggregates over the records pointing at the referenced record. `secondary` MAY list templates; the first whose fields all hold a value SHALL be drawn, and no line SHALL be drawn when none fills.

#### Scenario: newsletters to a segment and to a list
- GIVEN a newsletter sent to segment "Verenigingen in Zuiddrecht" (estimated 412) and one sent to mailing list "Afvalnieuws" with 2180 active subscriptions
- WHEN the newsletter list renders with templates "Segment: {segment.name|lowerfirst} · {segment.estimatedSize|number} contacten" and "Mailinglijst: {list.name} · {list.subscribers|number} abonnees"
- THEN the first row reads "Segment: verenigingen in Zuiddrecht · 412 contacten"
- AND the second row reads "Mailinglijst: Afvalnieuws · 2.180 abonnees" in Dutch
- AND the segment is read once for every row that points at it

#### Scenario: a reference that cannot be read
- GIVEN a referenced record the server refuses
- WHEN the list renders
- THEN that row draws no secondary line
