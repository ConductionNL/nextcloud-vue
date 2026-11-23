## Why

Apps hand a record to another app in the same three steps: ask an endpoint whether the record can go, send it, and show the reference that came back. pipelinq alone carried four copies (convert a ticket to a case, convert a question to a Woo request, send a contract to invoicing, send a client's hours to billing), each a component of 180 to 340 lines that differed only in its urls, paths and texts.

## What changes

- New `CnHandoffAction`, registered as the `handoff` widget type. Its content declares the availability endpoint, the path(s) that offer the action, the action endpoint, the fields asked before sending, the done state, the reference and link paths, a fallback link, and the texts for outcomes and refusals.
- `handoff` is a content-only type: on a card surface it takes the titled wrapper.
- A detail page body section may name a library widget `type` with `content` instead of a host `component`, so a library widget keeps the placements body sections have.

## Impact

- New export `CnHandoffAction`; no schema change.
- First consumer: pipelinq (PL-ABSTRACT lane PL1).
