# Proposal: roadmap-compare-board-inset

## Why

pl6 on :8080, PqRoadmap: the "How this app compares" line above the features page stood 16px in and 12px down at the
body's 15px line, where the board draws it at its page padding (28px in, 24px down) at 14px on the normal line, 20px
above the title. The title stood 2.5px high and the cards under it drifted.

## What changes

- Board look: the compare line is padded 24px 28px 0, at 14px on the normal line, 4px pulled in below so the title
  stands 20px under it as drawn. The Nextcloud look is unchanged.

## Reach

CnFeaturesAndRoadmapPage, board look, only when `compareUrl` is set. pipelinq moves its own copy of the line onto
this one (pipelinq bpq5/roadmap-compare-link-as-drawn).
