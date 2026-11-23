# Proposal: timeline-label-reads-a-reference

## Why

Board PqEvenement's history ends in "Evenement aangemaakt in campagne Warmtenet Oost 2026". The event holds its campaign
as an id, so a label's `{object.campaign}` printed a uuid.

## What changes

- `content.resolve` on the timeline: `{ <field>: { register?, schema, labelField? } }`. Each named field's id is read as
  the label of the record it points at (the shared reference resolver, one batched read per schema) for a label's
  `{object.<field>}`. The id stays while the label is not known.

Without the key nothing changes. No schema change.
