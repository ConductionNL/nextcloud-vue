---
kind: code
---

# Proposal: cell-labels-and-draft-indicator

## Summary

Three fixes found in the round-4 cloud check of pipelinq, all in shared
components, so every app gets them without a change of its own.

1. A column with `widget: "badge"` printed the stored enum code ("active")
   while the same column without a widget, and every detail page, printed the
   property's `x-enum-labels` label ("Active"). The built-in `badge` and `link`
   widgets and the `swatch` format now show an enum value by its label,
   translated, exactly as the plain enum cell does. The badge colour stays
   keyed on the stored code.
2. A boolean cell drew its check mark in `--color-success`. From Nextcloud 32
   that variable is a fill colour, and on a themed instance it was too pale to
   see. The check mark now uses the success text colour.
3. CnFormDialog showed its local draft indicator ("Saved just now") beside a
   failed save, which reads as if the save worked. While the dialog shows a
   failed save the indicator says "Draft kept on this device" when a local
   copy is stored, and nothing otherwise. CnFormPage had the same gap after a
   failed submit and gets the same rule.

## Motivation

Ruben's review of pipelinq: the services list showed "active" in its Status
column while the service page said "Active", a Yes/No column was nearly
invisible on cloud.conduction.nl, and a failed save on the service dialog
said "Saved just now". Pipelinq worked around the first two with its own
formatters (`enumLabel`, `yesNo`); those keep working unchanged, because a
column formatter still wins over the label.

## Scope

`@conduction/nextcloud-vue` only. A patch release. No manifest schema change,
no new props. One new UI string, "Draft kept on this device", in en and nl.

## Compatibility

- A column with a `formatter` renders exactly what the formatter returns.
- A badge colour map keyed on the stored code keeps its colours. A map keyed
  on a formatter's output keeps working: the raw code is used as the colour
  key only when the map has an entry for it.
- A custom cell widget registered through `cnCellWidgets` still receives the
  same `formatted` prop as before.
