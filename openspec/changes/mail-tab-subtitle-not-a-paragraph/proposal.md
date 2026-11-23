# The mail tab description keeps its size under a paragraph theme

## Why

thematiq sizes every `<p>` with !important (paragraph token, 15px/22.5). CnMailTab's description and hint were paragraphs, so the board look's 14px description lost and ran over two 22.5px lines (DqZaakEmail r29: E-mail content 44.4 vs 49 under the title; read on :8080).

## What changes

- The description and the hint are `<div>`s; their own styles apply.
