# Proposal: board-move-block-reasons

## Why

dossiq retires its own WorkflowBoard for the library board (dossiq #3989). The status engine offers a case its
transitions, and a transition can be blocked by a guard with a sentence ("Er is nog geen besluit vastgelegd.").
The old board showed that sentence under the refused column during a drag, and the move dialog listed the blocked
status disabled with its reason. The library board only knew allowed or not, so the sentence would be lost.

## What changes

- A `moveTargetsHandler` (and the `allowedMoves` prop of CnBoardView) may answer entries `{ key, allowed, reason }`
  besides plain ids. `key` is the referenced id (the page maps it to its column) or, on CnBoardView, the column key.
- `allowed: false` blocks the target. The card menu shows it disabled, with the reason on its own line under the
  name. During a drag the refused column shows the reason under its header, at full contrast while the rest of the
  column fades. A drop there is refused with the reason as the sentence, and nothing is written.
- A blocked target without a reason reads "not allowed", and a target the handler does not name stays "not allowed",
  as before. Plain ids keep working, and both shapes can be mixed in one answer.

No manifest schema change: the handler's answer is not manifest data.
