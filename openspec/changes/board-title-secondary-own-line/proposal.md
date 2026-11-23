# Proposal: board-title-secondary-own-line

## Why

In the board look the title column's secondary line (`col.secondary`) was an inline block on a line of its own, so the
title's underline would not reach it. When an app draws the title through its own `#column-title` slot (pipelinq's
report tables), the title is inline, and in the nowrap cell the inline block stayed on the title's line: "Leads per
bron Pieter de Vries" instead of the owner under the title.

## What changes

The secondary line in the board look's title column floats, full width and clearing, so it sits under the title for a
slotted title and a rendered one alike, and the underline still does not reach it.
