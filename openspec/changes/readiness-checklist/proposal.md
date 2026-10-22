# A readiness checklist

## Why

Apps show what an instance still needs (a first-run list read from a status
endpoint, a prerequisites list read at page load) as hand-written lists. Each
says the same three things per item: its state in words, why it matters, and
where to fix it.

## What changes

- New `CnReadinessChecklist`: items with a state (met, unmet, unknown) said in
  words, an explanation, a fix link, optional groups and a blocking note. Items
  from a prop or read from an app endpoint through a field map, re-read when the
  reader comes back.
