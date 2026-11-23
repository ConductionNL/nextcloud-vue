# Proposal: dashboard-layout-when

## Why

pl4 on board PqWerkplekKlant: in a call the page hides its dashboard cards and the client cards close up in the
columns they had below the dashboard, so "Wie is het" lands at the bottom of the right column. The board draws its own
three-column arrangement for the call. A dashboard has one layout, so a page cannot arrange its cards per state.

## What changes

- A dashboard takes `config.layoutWhen`: `[{ when, layout }]`, `when` a workspace condition as in `titleWhen`. The
  first entry whose condition holds draws its own layout of the page's widgets; otherwise the page draws its layout
  (or the reader's own arrangement) as before.
- Editing the page shows the page's own layout. Hidden widgets still close up within the chosen layout.
