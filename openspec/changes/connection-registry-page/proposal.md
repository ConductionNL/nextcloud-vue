---
kind: code
---

# Proposal: connection-registry-page

## Summary

Every app has a page with the connections it declares, as integriq checked them (register `integriq`, schema `app_connection`). Pipelinq drew it as an index table; the board PqIntegrations draws it as status cards, and notes that the page comes from the library and looks the same in every app.

A new page type `connections` mounts `CnConnectionRegistry`:

- the heading, a line counting the connections, and a primary "Add integration" button when `config.addUrl` is set (plus a `#header-actions` slot);
- status chips with counts: All connections, Set up, Limited, Not set, Error; and a text filter;
- one card per connection: icon, title, "kind · checked <date>" (or "never checked"), a status chip, the description, the status message, and "Open settings" (or "Set up" when not set up) to its `settingsUrl`, or "No settings screen yet";
- an aside of three cards: Needs attention (limited and failing connections with their message), Checked by integriq (the last check and a link to integriq), Add a connection.

`config.app` filters the list to one app, so the route opened without the menu's `?app=` query no longer lists all 94 connections; without it the page reads `?app=`.

## Scope

- `src/components/CnConnectionRegistry/` (new), `src/components/CnPageRenderer/pageTypes.js`, the barrels, `src/types/manifest.d.ts`.
- Schema 2.113.0: page type `connections` and its config.
- `l10n/en.json`, `l10n/nl.json`.
