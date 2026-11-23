# Proposal: board-control-border

## Why

The board look drew a control's edge (header buttons, the Actions trigger, filter chips, the search field, row actions,
the follow pill, the activity kinds) in `--color-border-dark`. Under plain Nextcloud that is a hairline, #dbdbdb, 1.4:1
against white, so a board button had no visible boundary in the sense of WCAG 1.4.11. The boards' button border
(design-system #306) is 3:1 against white, the page ground, the table head, the bulk band and the switch ground.

## What changes

The board look declares `--cn-board-control-border: var(--color-border-maxcontrast)` beside the control height and
radius, and every control edge reads it. Nextcloud's max-contrast border is about 4:1 against white; a theme that sets
both border steps (thematiq's nldesign system sets them to one value, #828A95 under Zuiddrecht) draws the same colour as
before. Tab outlines, the next-step marker and dividers are not control edges and keep `--color-border-dark`.
