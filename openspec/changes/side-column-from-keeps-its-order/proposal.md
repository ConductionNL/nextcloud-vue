# Proposal: side-column-from-keeps-its-order

## Why

r34 DqSociaalDomein: the board draws Historie above Status, and the Jeugdwet case type lists its side cards in that order (`sideCards: [..., side-social-history, case-banner-stack]`). Live drew Status first and Historie last (Status y -230, Historie y +330.8): in the board look the side column ranks a notice first and the History card last, and that ranking also reordered the list the record picked through `sideColumnFrom`, whose contract is "those cards, in that order".

## What changes

When the record picks its side column (`sideColumnFrom` yields a non-empty list), the board look keeps that order. A declared column (no list picked) is ranked as before. No schema change.
