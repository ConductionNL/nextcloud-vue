---
kind: code
---

# Proposal: notification-matrix-row-height

## Summary

The board matrix rows were 44.6px against the board's 42: the inline checkbox sat on the text baseline and the line box grew. The checkbox is now a centred block, 1px low as the board draws it.

## Scope

- `CnNotificationMatrix.vue` style, a css test.
