# Proposal: flow-board-cards-header

## Why

Board DqFlow (identity.conduction.nl/screens, dossiq) draws the head of the flow page as one block: the flow's name
as the page heading with the actions on its row, the path 6px under it, then the notice and the cards 20px apart.
The switch beside the actions is named Actief whether the flow runs or not; the switch itself shows the state.

Live (r44) drew the name as a second-level heading, so the page had no heading of its own, spaced the head, path,
notice and cards 12px apart with the notice's own 15px margins (the cards 9.5px low), and named the switch
Gepauzeerd while the flow was off.

## What changes

1. The flow's name is the page's `h1` on every board flow page.
2. `toggleLabel` (CnFlowBoard and CnFlowEditorPage prop, manifest `config.toggleLabel`): `state` (default) names the
   switch Active or Paused after the flow (PqFlow); `fixed` always names it Active (DqFlow).
3. The cards layout in the board look spaces its head as the board: head, notice and cards 20px apart, the title row
   4px under the head's top, the path 6px under the title row with 8px of head below it, and the notice without its
   own margins. The canvas layout (PqFlow) keeps its own spacing.

## Not changing

The Nextcloud look draws CnFlowDetail, not CnFlowBoard, and is untouched. The canvas layout's spacing is untouched.
