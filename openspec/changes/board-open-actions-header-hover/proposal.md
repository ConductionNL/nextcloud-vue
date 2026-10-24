# Proposal: board-open-actions-header-hover

## Why

r25b on :8080, DqZaaktypen: "Acties" drawn open read the hover grey (240,241,243) under the pointer that opened it.
look-board.css already skips an open menu (board-open-actions-toggle-white), but the index and detail page header
hover rules (with !important) still applied.

## What changes

Both header hover rules skip `.action-item--open`.

## Reach

look-board-index.css and look-board-detail.css.
