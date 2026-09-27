---
kind: code
depends_on: []
---

# Proposal: dashboard-notepad-widget

## Why

People keep a scratch list on their start page: a phone number, three
things to do before noon, the case number a colleague just gave them.
The dashboards the library renders can show a text widget, but its text
is part of the dashboard's configuration, edited in edit mode like the
position of a chart. Nobody opens edit mode to jot down a phone number,
so nobody uses it for that.

## Row

| matrix | row | name | own rating | built |
|---|---|---|---|---|
| launchpad | `d-notes` | Keep personal notes on the start page. | partial | built |

Note on the row: "A text widget on your own dashboard can hold notes
(widget-types.json:37, rendered by nextcloud-vue), but it is edited in
dashboard edit mode, not a quick notepad you type into in place." The
text widget is the half that is built. Typing in place, kept per person,
is the missing half.

Demand: feature request, https://github.com/Lissy93/dashy/issues/636

## Competitor evidence, quoted from the launchpad matrix

- Homarr, yes: "packages/widgets/src/notebook/index.ts:6-24 notebook
  widget with rich text content edited in place on the board
  (packages/widgets/src/notebook/notebook.tsx:92, :220-221 saves the
  content); on a user's own board it holds personal notes",
  https://github.com/homarr-labs/homarr (v1.77.2)
- Dashy and the Nextcloud dashboard, no. Workspace 365 and Microsoft
  Viva, unknown.

A feature request plus one competitor rated yes.

## What changes

- A `notepad` dashboard widget type. The reader types in the card, in
  view mode, and it is saved as they type.
- The text belongs to the person, not to the dashboard. On a shared
  dashboard each reader has their own notes in the same card.
- Markdown, rendered when the card is not focused: a list stays a list.
- A user may add it to their own dashboard (`userAddable: true`).

## Affected projects

- `nextcloud-vue`: a `CnNotepadWidget` registered in the dashboard widget
  registry, and its small form (title and height).
- Consumers: launchpad start pages, and every app dashboard that allows
  user widgets.

## Backward compatibility

A new widget type. The `text` widget is unchanged.

## Out of scope

- Sharing a note. A shared note is a document; Nextcloud Text or
  Collectives is where that lives.
- Several pages of notes in one card. One card, one note; add a second
  card for a second note.
