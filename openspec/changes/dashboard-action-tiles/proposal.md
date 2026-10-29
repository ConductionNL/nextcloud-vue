# Proposal: dashboard-action-tiles

## Why

Board PqWerkplekKlant draws a row of six tiles above the in-call cards: Nieuw verzoek, Terugbellen, Afspraak boeken,
Naar backoffice, Klacht registreren and Ander kanaal. Each tile is an icon and a label, and a click opens the form for
that step with the client in the call filled in. The library has link tiles (quicklinks, tile) and action buttons, but
no tile row whose tiles run a declared action with the page's context.

## What changes

- A new dashboard widget type `action-tiles` (CnActionTilesWidget): `content.tiles` is a list of
  `{ id?, label, icon?, action }`. The tiles draw side by side in one row, each its own card with the icon above the
  label.
- `action` has the `headerActions` shape (`open-form`, `open-modal`, `navigate`, `api-call`, ...). A click resolves its
  tokens (`@workspace.<key>`, `@objectId`, `@object.<field>`) and dispatches it through the page's dispatcher, else the
  action dispatcher with the router.
- A tile whose action names a required token the page cannot fill yet (no client in focus) is drawn disabled, so the
  row keeps its place. An optional token (`@workspace.<key>?`) is dropped instead.
- A tile may carry `visibleWhen`, a workspace condition, to hide it.

## Not in this change

- No widget form for the "Add widget" dialog. The tiles are declared in the manifest.
