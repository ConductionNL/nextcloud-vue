---
kind: code
depends_on: []
---

# Proposal: index-copy-with-relations

## Why

Copying an entry in a Conduction app copies its own fields and nothing
else. A stackiq user who starts a new application from an existing one
gets the attributes, but not the links that make the entry useful: which
organisations use it, which connections it has, which documents belong
to it. They rebuild those by hand, one relation at a time.

The copy is the library's. `CnCopyDialog` and `CnMassCopyDialog` render on
every index page (`showMassCopy` defaults to true), and the clone is made
in the browser by `cloneObjectForCopy`, which strips the id and keeps the
rest. Links that live on other objects, or as relation rows, are never
looked at.

## Row

| matrix | row | name | own rating | built |
|---|---|---|---|---|
| stackiq | `land-copy-entry` | Start a new application entry by copying an existing one with its links. | partial | built |

The row's built evidence: "library CnIndexPage mass copy on stackiq index
pages ... whether relations are copied along was not traced". Traced for
this change: they are not (see design). The copy is the half that is
built; the links are the missing half.

Demand: changelog, https://github.com/glpi-project/glpi/releases/tag/11.0.0
("Mined from glpi (changelog) on 2026-09-26"). The row is in the
`landscape` area, stackiq's core area.

## Competitor evidence, quoted from the stackiq matrix

- SAP LeanIX, yes: "Cloning a Fact Sheet ... A cloned fact sheet includes
  the following data from the original fact sheet: All attributes All
  relations, except one-to-one relations' and attachments",
  https://help.sap.com/docs/leanix/ea/creating-fact-sheets
- GLPI, yes: "11.0.0 added cloning of templates and creating a template
  from an existing item; appliances are clonable (src/Appliance.php:49 use
  Clonable) together with their items, contracts, documents and financial
  record (src/Appliance.php:62 getCloneRelations)",
  https://github.com/glpi-project/glpi (tag 11.0.9)
- GEMMA Softwarecatalogus, partial: a new version as a copy of a previous
  version, "ook koppelingen worden overgenomen",
  https://www.softwarecatalogus.nl/node/16564
- BlueDolphin and TOPdesk, partial: a copy with a new name; whether links
  follow is not stated.

## What changes

- The copy dialog lists what the source is linked to, grouped by kind:
  relation rows, objects that point at the source, and attached files.
  The user ticks what the copy takes along. Nothing is ticked that the
  page did not allow.
- The copy is one request to OpenRegister, which creates the new object
  and its links together, so a failure leaves no half-linked copy.
- A page declares which link kinds a copy may take along with
  `config.copy.include`. Without it the dialog behaves as today.

## Affected projects

- `nextcloud-vue`: `CnCopyDialog`, `CnMassCopyDialog`, `CnIndexPage`
  (`handleSingleCopy`, `handleMassCopy` in `selfModeActions.js`), the
  manifest v2 schema.
- `openregister`: a copy endpoint (see cross-project dependencies).
- Consumers: stackiq (applications, modules), opencatalogi, dossiq case
  types, any list whose entries are started from a template.

## Backward compatibility

A page without `config.copy.include` copies exactly as today, in the
browser, fields only. Every new prop has a default.

## Cross-project dependencies

- OpenRegister has no copy operation. It moves an object and keeps its
  uuid (`objects#move`, `appinfo/routes.php:1238-1243` at `555af72`), and
  its comment there says why a copy is a different act. The OpenRegister
  half is `POST /api/objects/{register}/{schema}/{id}/copy` taking the
  overrides and the link kinds to take along, answering the new object and
  a per-link outcome. Listed for the openregister lane.
- Until it exists, a page with `config.copy.include` shows the link list
  read-only with a note that links are not copied yet, and copies fields
  only.

## Out of scope

- Copying linked objects themselves (a deep copy of every module an
  application uses). The copy links to the same objects the source links
  to; it does not duplicate them.
- One-to-one links. LeanIX leaves them out for the same reason: two
  objects cannot both hold the one slot.
