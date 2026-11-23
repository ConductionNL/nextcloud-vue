# Proposal: flow-page-pill-variant

## Why

DqFlow draws the pill beside the flow's name ("Flow van zaaktype") in the teal tone. The flow board drew the page's
pill neutral with no way to change it.

## What changes

CnFlowEditorPage and CnFlowBoard take `pillVariant` (manifest `config.pillVariant`), a CnStatusBadge variant for the
page's pill. It defaults to `default`. The Draft and Retired lifecycle pills stay neutral.

## Reach

Flow pages that set `config.pillVariant`. No schema change.
