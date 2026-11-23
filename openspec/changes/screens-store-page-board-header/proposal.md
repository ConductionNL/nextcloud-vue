---
kind: code
---

# Proposal: screens-store-page-board-header

## Summary

On board LpStore the title "Store" and its description sit flush with the content, 28px from the content's left
edge. Under the board look CnStorePage drew them about 56px further right (launchpad #861, measured on :8080). Two
reasons:

- The header keeps a 56px inset that clears Nextcloud's navigation toggle. Every other board page drops that inset
  while the navigation is open.
- The page keeps its own 16px padding instead of the board frame's 24px 28px.

## Scope

- `src/css/look-board.css`: the store page joins the board frame, and its header follows the inset rule of
  `CnPageHeader` (none with the navigation open, 56px with it closed).
- No component, manifest or schema change. The Nextcloud look is unchanged.
