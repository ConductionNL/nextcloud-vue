## Decisions

### D-1 The scoped list only when it has entries

An empty list under "Sessions about X" reads as "I have no sessions". The scoped list replaces the recent list in the menu only when the backend returned at least one session about the page; otherwise the menu is unchanged.

### D-2 The page's entity

A file by its numeric `fileId` (the companion already passes it on editor and Files pages), else a record by `objectUuid`. This is the same precedence the backend uses when it records a link.

### D-3 Refreshed when the menu opens

A link is recorded when a turn is sent, so the scoped list is fetched on mount, when the page's entity changes, and each time the sessions menu opens.
