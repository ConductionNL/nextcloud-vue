# Proposal: linked-leaf-noun-from-host

## Why

Board DqZaak "Gekoppeld" (r41) closes with "Leges en betalingen, contract en projecten: niets gekoppeld". Live read "Financiële documenten, contract en projecten: niets gekoppeld": the card takes each leaf's own noun, and shillinq's finance leaf, placed on records of every app, calls itself "financial documents". That is the right word in shillinq and in a sales app, not on a municipal case. The card had no way for the host to name a leaf in its own words.

## What changes

A `linked` card leaf may be written `{ id, noun }`: the registered integration leaf of that id, named by the host. The card uses the host's noun, through the host translate, in the "...: nothing linked" line and in the count row, instead of the noun the leaf reports. A bare id keeps the leaf's own noun.
