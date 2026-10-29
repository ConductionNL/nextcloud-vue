# Proposal: board-queue-inks

## Why

Board DqTeamwachtrij draws a queue row's deadline in the tag inks: late "nog 4 dagen" #a30000 at 700, soon "nog 6
dagen" #7a4f00 at 600. Live drew Nextcloud's warning orange at 600 for both. The "Werkvoorraad per zaaktype" table head
showed a grey band: the theme gives every table head its table-header background, and the board draws none.

## What changes

- Board look: a date cell's error and warning tones in a list row's trailing cells take the status badge ink chain,
  error at 700, warning at 600.
- Board look: a record list table head has a transparent ground.
