# A change label can say from what to what, by name, with a note

## Why
pipelinq's ticket History tab says "Passed to {to} by {actor}" for a handover. The audit vocabulary had
`{changed.<key>.old}` and `{changed.<key>.new}`, which read a user id as an id, and no place for the note a colleague
gives with the handover (pipelinq `ticket-handover-history` task 1.1).

## What changes
- `{from}` and `{to}` in a change label: the old and new value of the matched rule's `field`, in `valueLabels` words.
- `values: "user" | "group"` on a change rule: `{from}` and `{to}` read as the display name of the recorded id.
- `note` on a change rule: the new value recorded under that key shows under the entry in the History card.
- The timeline widget fills `{from}` and `{to}` the same way. No manifest schema change: widget content is not
  schema-validated.
