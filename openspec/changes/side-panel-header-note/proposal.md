# side-panel-header-note

## Why

Board DqTeamwachtrij heads the "Team vandaag" card with "4 van 5 aanwezig". A record list reports its `headerNote`
through the `header` event, which the dashboard shows but the index page's side panel ignored.

## What changes

- CnIndexPageWidgets listens to `header` and draws the reported note in the card header, as the dashboard does.
