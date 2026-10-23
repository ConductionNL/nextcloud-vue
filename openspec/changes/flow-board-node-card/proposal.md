# Proposal: flow-board-node-card

## Why

Board DqFlow draws each step as a 200px card: the step's own name ("Volledigheid toetsen"), then a pill naming the app
that does it and, where the name does not say it, what kind of step it is ("dossiq · persoon vragen",
"OpenRegister · beslistabel", "Integriq · bericht"), in the tone of that app; the start step reads "Start". Lines are
plain grey. The canvas drew the catalogue type in bold over a config summary ("Persoon vragen" / "question: Open de
beraa…"), a role accent on the left edge, four arrowed ports on every node and arrowheads on every line.

## What changes

- CnFlowDetail takes `nodeBadge` (a function, node → `{ label, variant }`). With it each step renders as a card: name,
  then the pill. Ports show on the card that is hovered, focused or selected (a port that breaks the flow stays
  visible), and while editing the lines are plain grey without arrowheads and the role accent gives way to a light
  shadow. A run keeps its outcome colours.
- CnFlowBoard and CnFlowEditorPage take `nodeLook` (manifest `config.nodeLook`): `card` hands the canvas the board's
  pill rule: the palette group's `pill` (else its label, else the app's display name), plus the step's `short`, in the
  group's `tone`; the owning app in the primary tone; "Start" on a start step.

## Reach

Flow pages that set `config.nodeLook: card`. Stacked on flow-board-palette-groups (`pill`, `tone`, `short`). No schema
change.
