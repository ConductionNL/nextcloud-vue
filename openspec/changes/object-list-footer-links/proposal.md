# Proposal: object-list-footer-links

## Why

DqZaakGerelateerd ends its objects table with a row of links: "Alle zaken op dit object" and "Objecttypen beheren"
with the muted note "(alleen voor beheerders)". CnObjectListWidget can end with "View all (N)" or a footnote, not with
links of the app's choosing.

## What changes

`content.footerLinks` (`[{ label, route?, query?, href?, note?, group? }]`) draws a row of links under the list: 14px,
600, 16px apart, each followed by its note in the muted ink at 13px. A `route` link resolves `query` tokens and follows
the router; an `href` link is a plain link. Labels and notes go through the host translate. A link with `group` shows
only to that group's members.

## Scope

nextcloud-vue only; dossiq configures the links (R22-RECORD). The group check hides the link only; the target page
keeps its own access check.
