# The notification matrix draws the board's grid in the board look

## Why

The boards are the UI canon (Ruben, 9 Oct). DqPersoonlijkeInstellingen draws
"Meldingen" as a plain grid: a "Melding" column of events, one column per
channel ("In Nextcloud", "Per e-mail") with a centred 20px checkbox, muted
13px/600 headers and hairline row rules. In the board look,
CnNotificationMatrix drew its channel headers packed with the bundling
(digest) select, a time field, an explanatory note and a test-send button, and
put a source line under every checkbox. The grid the board draws did not show
through.

## What changes

- In the board look, the matrix draws the board's grid:
  - headers carry only the event column title and the channel names
  - each cell is a centred checkbox
  - group rows are plain headings
- Nothing is taken away from the user:
  - **Bundling and test send:** the per-channel bundling, its time and the
    test send move below the grid, into a "Bundling and test message"
    disclosure that has the same controls per channel. A channel that cannot
    be used says why there.
  - **Why a cell is set:** each cell keeps its source line. It is visually
    hidden and tied to the checkbox, so a screen reader still hears why the
    cell is set. A locked cell keeps its reason visible.
  - **Scopes:** the scope rows and the "add a scope" select stay as they are.
- The Nextcloud look is unchanged.

## Out of scope

The "Meldingsdomein" select above the board's grid is the host app's (dossiq's
settings section), not the matrix's.
