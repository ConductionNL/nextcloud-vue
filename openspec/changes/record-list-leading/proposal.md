# Proposal: record-list-leading

## Why

Board PtDashboard draws "Recente inzendingen" with the time of day in a column of its own before each row's title
("09.15"), then the title and its meta, then the pill. A `rows` record list could lead with an avatar or a dot, but
not with a short text, so the time stood at the end of the row (COMPDIFF pq3: title 93 vs 25 from the card's edge).

## What changes

A `rows` record list takes `leading`, a template drawn in a 52px column before the title (14px, weight 600, muted).
A row whose template does not fill draws none. portaliq sets `"leading": "{submittedAt|time}"` on the dashboard's
submissions list.
