---
kind: code
---

# Proposal: board-folder-pane-all-icon

## Summary

r31 strict items on DqAfdelingen: the folder pane's "Alle" row lost its all-inclusive icon (the board draws "∞ Alle", the label 36px in), and the count pills read the hover grey with the main ink where the board draws the hairline grey with the secondary ink. In the board look "Alle" keeps its 18px icon 8px before the label; counts take the hairline ground and the secondary ink. Checked with the CSS injected on :8080: icon 18x18, label 36px in, count 228,230,234 on 61,63,67.

## Scope

- `src/css/look-board-index.css`, the folder pane css test.
