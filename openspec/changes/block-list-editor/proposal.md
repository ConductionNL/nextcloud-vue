# Proposal: block-list-editor

## Why

Board LqLesMaken draws "Blokken van de les": typed blocks in order, moved by dragging or with Move up and Move down, with a spoken position,
and an AI draft to keep or throw away. PqNieuwsbriefWizard and PqProduct draw the same list. learniq `LessonComposer` and pipelinq
`MailBlockEditor` each carry their own copy. `CnFormBuilder` edits field definitions in a config panel, with no slots and no drag, so it does
not fit.

## What changes

- New `CnBlockListEditor`: a palette, typed blocks, drag plus buttons, a spoken position, one editor slot per type, drafts, pinned blocks and a
  preview slot.
- The host owns the list and draws each type's editor. The component holds no rule about what a block means.

Item 2 of the fleet component gap list (decisions 281, 320).
