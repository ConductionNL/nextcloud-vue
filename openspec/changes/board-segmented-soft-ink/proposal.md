# Proposal: board-segmented-soft-ink

## Why

The boards draw a segmented control's options that are not chosen in the soft ink (#3d4047 on the boards) and the
chosen one in the main text. Only the dashboard's view switch did so in the board look; every other segmented control
(a dashboard's period presets, a page filter such as "Gemiddeld / Mediaan") drew every option in the main text.
COMPDIFF r19b: 8 segments on 4 boards (DqDoorlooptijd, DqFunctionaliteiten, DqProcesanalyse, DqTermijnen).

## What changes

In the board look every CnSegmentedControl option that is not chosen draws in `--cn-board-text-soft`; the chosen one
keeps the main text. A page in the Nextcloud look inside a board app is left alone.

## Scope

Board-only: the Nextcloud look keeps the component's full-contrast labels. WCAG: the soft ink on the control's track is
well above 4.5:1 (it mixes 45% of the main text into the max-contrast text).
