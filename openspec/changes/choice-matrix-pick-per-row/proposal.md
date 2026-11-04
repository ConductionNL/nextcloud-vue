# Proposal: choice-matrix-pick-per-row

## Why

Board LqInleveringNakijken draws "Rubric: Betoog 3HV": criteria with a weight, each level a text with points, one level picked per criterion, and "Score: 8 van 10". LqLlInleveren lets a learner fill the same rubric. `CnChoiceMatrix` draws one select per cell, and learniq `MarkSubmissionView` carries the rubric as local code.

## What changes

- `pickPerRow`: a row holds one pick, drawn as a radio group, with options from `columns` or the row's own `options`, each with `description` and `points`.
- `scoreLabel`, `scoreMax`, `scoreMode`, and the event `score-change`.
- `row.weight` with `weightTemplate`, and `rowErrors`.
- Without `pickPerRow` the grid stays as it was, apart from `rowErrors`.

What a score means, such as a late penalty or a grade, stays in the app. Item 5 of the fleet component gap list (decisions 281, 320). Built on `choice-matrix`.
