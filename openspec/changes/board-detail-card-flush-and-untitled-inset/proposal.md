# Proposal: board-detail-card-flush-and-untitled-inset

## Why

LQ-CARDS framed 20 learniq custom pages in CnDetailCard and found two board look gaps. A card with `flush` still got
the board card's content padding, because the board rule outranks CnDetailCard's own flush rule. A card without a
title started its body about 10px from the top border instead of the board's 20px, because the board rule sets the
12px gap that belongs under a title. learniq carried a workaround in its app.css for both.

## What changes

In the board look a flush CnDetailCard's body has no padding, and a CnDetailCard without a header (and not
chromeless) takes `--cn-board-card-padding` on its body. Titled cards, chromeless cards and the Nextcloud look are
unchanged.
