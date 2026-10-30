# Proposal: board-timeline-add-note-outlined

## Why

pl6 on :8080, PqOrganisatie and PqKlant "Activiteit": the timeline card's add-note button was a 34px primary button.
The Dq boards draw a note composer's add button as the outlined 40px control (DqZaakHistorie, which CnTimelineManage
already follows), and so does PqOrganisatie. PqKlant draws it primary; Dq wins, so that board follows.

## What changes

- In the board look, CnTimelineWidget's add-note button is `secondary` and 40px (`--cn-board-control-height`). The
  Nextcloud look keeps the primary 34px button.

## Reach

CnTimelineWidget only. Pages with a `composer` in the board look: pipelinq ClientDetail.
