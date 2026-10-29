# Proposal: board-ruled-rows-marker

## Summary

An app's own list that rules above its first row can mark itself `cn-board-ruled-rows`, so the board dashboard card's title stands 6px above that rule, as over a record, task or decision list.

## Why

Measurement pl3 (28 October 2026), pipelinq board PqOperationeel: "Mijn werk" is a pipelinq widget whose rows rule above themselves. The card header kept its full bottom padding over it, so the first row stood 25px under the title where the board draws 17. The 6px rule only knew the library's own lists.

## What changes

- `look-board.css`: the 6px header rule also applies over a `.cn-board-ruled-rows` list in the card's content.
- `tests/css/lookBoardRuledRowsMarker.spec.js`.
