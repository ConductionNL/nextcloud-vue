# Proposal: record-list-sections-and-grant-rows

## Why

Board DqZaakBetrokkenen (https://identity.conduction.nl/screens/board?id=dossiq/DqZaakBetrokkenen)
draws one Toegang card with two kinds of rows: the case's access links, and the
users and groups that can open the case ("Team Woo en informatie · via het
zaaktype", "Juridische zaken · gedeeld door Pieter Jansen"). The links come from
dossiq's `/api/access-links/case/{id}`, the grants from OpenRegister's
`/api/objects/{r}/{s}/{id}/grants` (openregister change
`an-object-lists-its-grants-with-their-origin`). The record list reads one
`endpointSource`, so the card could only draw the links.

dossiq's change `case-access-card-lists-team-and-group-grants` (design D-5)
names this library as the place to build it.

## What changes

- `content.sections`: a list of record list configs drawn in order in one card,
  each reading its own source with its own empty and error text. A section takes
  the card's other keys unless it sets its own; the card's `footnote`,
  `footnoteVariant`, `footerLink` and `footerAction` go under the last section.
- `meta.cases` (`[{ when, text }]`, else `text`): a meta line by condition, with
  the condition vocabulary `pill.cases` uses (`contains` for a list field).
- `avatar.icon` (`{ field, map }`): an icon in the avatar circle for the rows it
  maps (a group), initials for the rest (a user).
- `hideWhen`: leaves out endpoint or object rows a condition holds for (the
  service account among a case's grants).
- `refusalText`: a refused (401/403) endpoint read in the app's words.

## Not in this change

- The manifest schema keeps record list content free-form for these keys.
