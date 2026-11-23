# Proposal: facts-row-first-of

## Why

Board PqContactmoment's Onderwerp is the call's own subject ("Afvalpas", `disposition_subject`, written by the call
wrap-up). A contact moment logged by hand has none, and then the request's category is the best subject there is. A
lead's title and subtitle can already take the first spec that gives text (`firstOf`); a row could not.

## What changes

- A facts entry may carry `firstOf: [spec, ...]` in place of `path`, with the same specs as a lead's `firstOf` (a path,
  or `{ path, map?, format? }`). It shows the first that gives text; with none, the entry is empty and `hideEmpty` drops it.
