# Proposal: stages-declared-list

## Why

Board PqOfferte's "Status" card lists a quote's stages as a column of choices: Concept (filled marker, bold, "je bent
hier"), Verzonden, Geaccepteerd, Afgewezen, Verlopen ("na 30 dagen"). The stages widget reads its stage list from an
endpoint or an OpenRegister query, and draws a dot strip or bars. A quote's stages are a fixed process: there is no
record to read them from, and an endpoint that only returns a constant list would be dead weight.

## What changes

- `content.stages`: `[{ id, label, hint?, final? }]`, a stage list declared in the manifest. It wins over
  `stagesEndpoint` and `stagesSource` and reads nothing.
- `variant: "list"`: one row per stage, a 14px round marker (filled with a light ring on the current stage), the current
  label bold with "you are here" beside it, a stage's hint beside the others. Moving works as in the other variants.

Without the keys nothing changes. No schema change (the widget content is open).
