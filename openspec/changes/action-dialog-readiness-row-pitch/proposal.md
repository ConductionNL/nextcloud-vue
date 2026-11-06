# Proposal: action-dialog-readiness-row-pitch

## Why

DqArchiveren draws the "Klaar om te archiveren" rows 43px apart, the hairline of one touching the next. The `checks` field reused the class of those rows for its fieldset and added `gap: 4px`, so every readiness row moved 4px and the dialog grew 16px.

## What changes

- The `checks` fieldset has a class of its own, `cn-action-dialog__check-field`. The readiness list keeps `cn-action-dialog__checks`, without a gap.
- A met row draws a 14px tick in a 22px light success circle, as DqArchiveren does.
- `labels[id].hideWhenMet` drops a met row (it still counts for `required`), and `labels[id].detailWhen` applies `detail` only while that path of the item is filled.
