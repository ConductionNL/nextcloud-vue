# Proposal: tasks-state-variants

## Why

Board DqZaakTaken tones a task's status pill by its state: "In behandeling" purple, "Open" amber, "Klaar" grey.
CnTasksWidget draws every open task info (blue) and every finished one default. COMPDIFF r23 DqZaakTaken
"In behandeling": background and colour.

## What changes

`content.stateVariants` maps an engine state (`available`, `enabled`, `active`, `completed`, ...) to a badge variant.
A state it does not name, or a value that is no badge variant, keeps today's tone: info while open, default once
finished. The app names its tones; the library names none.

## Scope

CnTasksWidget.vue. No schema change (widget content is not validated per key).
