# Proposal: related-links-layout

## Why

Board PqKassabon draws "Gerelateerd" in the side column as three plain links, one per line ("Dienst 7 okt, Balie 2",
"Retour RF-2026-0058, in afwachting", "Auditregel, ondertekend"). The related widget draws every relation with an icon,
a count and tabs, so a page that wants the board's card had to drop the widget and lose files and the other relations.

## What changes

- `layout: "links"` on the related widget: the host's sections (`extraSources`, `referenceSections`, `extraSections`)
  as plain links, label and meta joined by a comma, else the related objects. "Show all" opens the tabbed view with
  files, integrations and every relation.
- A `referenceSections` entry can name its record with `labelTemplate` ("Shift {floatAt|date}, {drawer}").

Schema 2.159.0 adds "links" to the related widget's layout values. Without the key nothing changes.
