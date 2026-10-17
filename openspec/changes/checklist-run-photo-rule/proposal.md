# Proposal: checklist-run-photo-rule

## Why

Board DqInspectie asks for a photo with an answer ("Foto bij vraag 7"): dossiq's checklist template says per question
whether a photo is never, always or only on "nee" required, and an inspection that lets a "nee" pass without its
evidence goes against the template. The board's run is also shown on a dashboard of device frames, where no page hands
the widget a record, so the widget has to pick the inspector's running run itself. Follow-up to checklist-run-widget
(#1764).

## What changes

- `fields.photoRequired` with `photoRequiredValues` maps a question's stored rule onto never, always or "when the answer
  is <value>"; such questions get their own photo control and Next holds the page until the photo is attached.
- `record: { register, schema, filter, sort }` picks the open record by filter (first match) under the reader's rights,
  with `emptyText` when nothing matches and no read while a token is unresolved.
- No manifest schema change.
