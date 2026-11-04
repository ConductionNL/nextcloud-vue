# Proposal: tree-view-reorder

## Why

Board LqCursus draws "Opbouw van de cursus": chapters with lessons as a tree, dragged or moved with Omhoog and Omlaag, saved at once and read out. Decision 300 puts keyboard reordering in the build queue, because the
boards show WCAG 2.1.1 as solved. `CnMenuTreeNode` is bound to the manifest menu, and learniq `CourseBuilder` carries this as local code.

## What changes

- `CnTreeView` gains `reorderable`, `reorderLabels`, `moveStatus`, and the events `move` and `update:nodes`.
- A row moves among its siblings. Moving between parents is not offered, as `CourseBuilder` and the board do not.
- Without `reorderable` the tree draws the same markup as before.

Item 9 of the fleet component gap list (decisions 281, 300, 320).
