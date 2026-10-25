# Proposal: saved-view-alert-facts-core-dt

## Why

On DqZoekresultaten the "Saved search" card put "Name" and "Now" in a 130px end-aligned column with 12px padding round
every label and value, so the facts sat 80px in from the card edge and each row was 40px tall. That is Nextcloud core's
global `dt`/`dd` rule (core/css/apps.scss); the widget's own style did not reset it.

## What changes

The widget's `dt` and `dd` reset display, width, padding, margin and alignment; the value reads semibold as on the board.
