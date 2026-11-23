# Proposal: board-split-list-gives-way

## Why

pl5 on board PqKassaAudit: clicking an audit row opens `/cash-register-audit/split/<id>` and the detail loads, but the
split pane is 13px wide at the right edge, so nothing of the record shows. In the board look a table list card is
`flex: 1 1 auto` and its fixed table is 100% wide, so the card's flex basis is the whole body. The pane, declared at
42%, is the item that shrinks, and its `min-width: 0` lets it shrink to almost nothing.

## What changes

- Beside the list, the split pane does not shrink: it keeps its declared `splitView.paneWidth`.
- In the board look, a split list card starts from a zero basis and takes the width the pane leaves. The rule comes
  after the table, list and map card rules so it outranks their `1 1 auto`.
- The full-width detail layout (below the breakpoint) is unchanged.
