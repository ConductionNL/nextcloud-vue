# Proposal: board-settings-textarea-leading

## Why

COMPDIFF r32 DqBeheerGeavanceerd "Sentiment-triggerwoorden": the boards set a text area's lines at 1.5 (56 board
textareas; design-system #638 aligns the settings shell), NcTextArea took the browser's leading (~1.13).

## What changes

- In the board look a settings card's text area is 15px at line-height 1.5, padded 8px 12px.
