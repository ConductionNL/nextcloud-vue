# Proposal: board-conversation-lines-as-drawn

## Why

DqZaakContact sets a message's subject line and its note at the normal line height, and draws the reply field as
two lines at the normal line height (58px). In the board look the subject and note took the thread's 1.5 (22.5 and
19.5 against 18 and 15.6), so the bubbles with a subject or note stood 4.5 to 9px taller and pushed the contact log
down; the reply field was 67px (COMPDIFF r35: message cards h 98 vs 93.5, 120.5 vs 116, 149 vs 140; field h 67 vs 58).

## What changes

- In the board look a message's subject and note sit at the normal line height. The message text keeps 1.5.
- The board reply field is 15px on the normal line with room for two lines (58px).
