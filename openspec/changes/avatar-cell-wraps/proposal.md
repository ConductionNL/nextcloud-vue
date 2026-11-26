---
kind: code
---

# Proposal: avatar-cell-wraps

## Summary

Board DqContacten draws each resident's address under their name in the Name column ("Oosthavenweg 12,
Zuiddrecht"). dossiq declares that column `cellClass: "cn-cell--wrap"`, but the avatar widget's name and secondary
line keep their own `white-space: nowrap` and ellipsis, so on a live instance (25 Nov 2026, 1440px) a longer
address reads "Oosthavenweg 12, Zuid…" while the cell itself wraps.

In a cell that opts into wrapping, the avatar widget's name and secondary line now wrap too. Every other avatar
cell keeps its one line.

## Scope

- `src/css/table.css`: one rule for `td.cn-cell--wrap .cn-cell-renderer__avatar-name` and `__avatar-secondary`.
- No schema or prop change.
