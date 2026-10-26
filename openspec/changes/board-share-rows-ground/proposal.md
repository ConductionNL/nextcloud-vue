# Proposal: board-share-rows-ground

## Why

DqFilterDelen r30: the audience rows read radius 12 on #f0f1f3 (Nextcloud large radius, hover grey); the board draws radius 8 on the page ground #f5f6f8.

## What changes

In the board look a share row takes radius 8 and `--cn-board-sunken-ground`. Probed on :8080 with the CSS injected: 8px, rgb(245, 246, 248).
