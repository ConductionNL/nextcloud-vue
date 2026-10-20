# Proposal: board-setup-wizard

## Why

Board DqInstellen draws the setup wizard at step 4. A read-only walk never got there: the Organisation step posted its
fields on Next even when nothing was filled in, and its own copy says a field left empty keeps what is stored. At step 4
the choice also drew the step title a second time over the cards, and the step sat 8px under the stepper where the board
leaves 20px.

## What changes

A `config-fields` step writes only the fields the person filled in, and nothing when none were. In the board look the
stepper leaves 20px above the step, and a card choice's legend (the step title, already the dialog's heading) is kept for
assistive tech only.
