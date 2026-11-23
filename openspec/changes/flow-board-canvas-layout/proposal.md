# Proposal: flow-board-canvas-layout

## Why

Boards PqFlow and PqFlowRun (identity.conduction.nl/screens, pipelinq) draw the flow editor as a canvas page, not as
cards in a grid:

- PqFlow: the title on its own line and the actions on a row under it (the Gepauzeerd switch, Controleren and
  Uitvoeren with their icons, buildiq, Meer, Opslaan), then the last run pill and the path. The canvas fills the page on
  the page ground, with one floating toolbar over it: Stap toevoegen, arrange, undo, redo, the zoom, the "Flow is
  geldig" pill and a side panel toggle. The inspector is a floating panel at the right with a close button, drawn only
  while a step is selected.
- PqFlowRun: the run's status pills under the title, the run card over the canvas, and the "Deze stap" / "Logs van de
  hele uitvoering" tabs as the side panel. No edit toolbar and no read-only or version notices: a run is history.

Live (pl4) drew the canvas in a card beside an always-present inspector card, the validity as a sentence under the
canvas, the edit toolbar ("Een stap toevoegen", arrange, undo) and two notices ("Deze versie is alleen-lezen",
"Dit is versie 1 van de flow") over a run, and the run card in the side column. About 45 pl4 items.

## What changes

1. **A run is shown quietly** on every board-look flow page: CnFlowDetail takes `quietRun`; with it, an open run hides
   the toolbar's editing buttons (add a step, arrange, undo) and drops the lock, version, unsaved and setup notices
   from the canvas. Errors about the run itself (a failed request, a replay over another graph, skipped steps) stay.
   CnFlowBoard passes it.
2. **`layout: "canvas"`** (manifest `config.layout`, CnFlowEditorPage prop `layout`, default `"cards"`), for Pq:
   - the header actions stand on a row under the title; Check and Run carry their icons;
   - in a run, the header holds the run's status pill and, when steps warned, "{n} step(s) with a warning";
   - the canvas has no card frame and sits on the page ground;
   - the validity is a pill in the canvas toolbar, beside a side panel toggle;
   - the inspector is a floating panel over the canvas, shown while a step is selected, a test result is open, a run
     is open or the toggle opened it, with a close button;
   - in a run, the run card stands over the canvas and the side panel holds the log tabs.
   CnFlowDetail gets a `toolbar-end` slot for what a host adds to its toolbar.

`"cards"` (DqFlow and every page that sets nothing) keeps its layout. Dq wins on shared measures, so nothing a Dq board
draws moves.

## Not in this change

The header's Meer menu, the last run pill on the path line, the outcome legend as a titled card with the zoom, and the
board's inspector form (Versturen naar, Sjabloon, Doorgaan bij fout as a card) are separate items; the inspector fields
are data per step type, the rest is listed in tasks.md as open.
