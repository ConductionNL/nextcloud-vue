# Proposal: features-board-subtitle-under-theme

## Why

r25-style measurement on :8080 (DQ-L8, 23 Oct): DqFunctionaliteiten's meta line under the title is 15px in the main
ink; the board draws it 14px muted. thematiq sets every `<p>` through the paragraph tokens with `!important`, which
outranks the board's own rule.

## What changes

`.cn-features-board__subtitle` sets `--nldesign-component-paragraph-font-size: 14px` and
`--nldesign-component-paragraph-color` to the muted ink on itself, as the library's dialogs and board cards already do.

## Reach

The roadmap board's subtitle. No prop or schema change.
