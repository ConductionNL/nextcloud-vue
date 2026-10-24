# Proposal: saved-view-alert-threshold-label-above

## Why

DqZoekresultaten draws the alert threshold as a field with a bold "Grens" label above it. The widget used NcTextField's
floating label inside the box, so the label sat on the field's border.

## What changes

The threshold field carries a visible label above it, tied to the field by `for`/`id`; the field's own label moves outside.
