# Proposal: checklist-run-save-each-answer

## Why

A run that is a test or a long inspection saves a page only when the user moves on. A closed tab, a dead battery or a
lost connection on a long page loses every answer of that page. A learner taking a test expects each answer to stay once
given.

## What changes

- CnChecklistRunWidget takes `content.saveEachAnswer`: `true` saves each answer 800 ms after it is given, a number
  waits that many milliseconds.
- Changes within the wait save together. Saves run one at a time, so moving on during a save never creates an answer
  twice. A pending answer saves when the widget goes away.
- Without the option the page saves when the user moves on, as before.

No schema change: widget content is open.
