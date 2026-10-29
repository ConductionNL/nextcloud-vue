# Proposal: flow-board-canvas-chrome

## Why

`flow-board-canvas-layout` drew PqFlow and PqFlowRun as a canvas page and listed four items as open (its tasks.md,
task 3). Boards PqFlow and PqFlowRun (identity.conduction.nl/screens, pipelinq) also draw:

- PqFlow: a Meer menu in the header after buildiq; the last run as a grey pill at the start of the path line
  ("Laatste uitvoering vandaag 08:41 klaar"); the zoom controls at the canvas foot as outlined white buttons, the fit
  button named "Hele flow in beeld passen"; and an inspector with the step kind and type over the name
  ("Actie · E-mail versturen"), the close button beside the name, a "Naam van de stap" field, a help line under a
  setting, an on/off setting as a grey card with its description, the recent log lines open under a rule, and a footer
  with a red "Stap verwijderen" and a primary "Klaar".
- PqFlowRun: buildiq and Meer beside the title; the outcome legend as one titled card ("Uitkomst per stap") with the
  route entries ("Genomen route", "Niet genomen"), the zoom and the side panel toggle; the run card's buttons with
  their icons; and, in the "Deze stap" tab, the step's kind and type, name, outcome pill and timing over its log lines,
  a note when the step failed but the flow went on, and "Deze stap bewerken" / "Afspelen op het canvas".

Live (pl4) has none of these. About 30 pl4 items across both boards.

## What changes

All behind `layout: "canvas"`; `cards` (DqFlow) is untouched. Dq wins on shared measures, and no Dq board draws these.

1. A header **More** menu (NcActions, `flow-board-more`): in the editor "Show runs" and "Open the last run on the
   canvas"; in a run "Play on the canvas" and "Back to the flow". In a run the header keeps buildiq and More.
2. The **last run pill** on the path line: "Last run {date} {outcome}" from the newest run.
3. A new `metaParts` entry `saved`: "version {version}, saved {date}" (opt-in, so DqFlow's meta stays).
4. CnFlowDetail gets a `toolbar-start` slot. In a run the board puts the **titled legend** there, so the legend, the
   zoom and the side panel toggle are one card at the canvas foot.
5. CnGraphCanvas's corner controls carry icons; on a canvas page they are outlined white buttons. "Fit the whole flow
   in view" gets its Dutch string.
6. The **canvas inspector**: kind and type line, close beside the name, step name field, a field's `description` under
   it, a switch with a description as a card, the recent log lines open, a red delete and a primary Done.
7. The **run side panel**'s step tab: the step head, the note for a step that failed while the flow went on, and
   "Edit this step" / "Play on the canvas". No close button in a run (the toggle in the legend card closes it).
8. CnFlowRunSummary `iconActions`: the run card's buttons with icons and Back as a secondary button.

## Not in this change

The inspector's settings themselves (Versturen naar, Sjabloon, Onderwerp, Doorgaan bij fout) are each step type's
`configForm` in the catalogue: data, not this change. "Ticket openen" needs the run's subject href, which the board
does not get yet. The "Signaal" legend label is a Pq word for the error level; the legend keeps "Failed".
