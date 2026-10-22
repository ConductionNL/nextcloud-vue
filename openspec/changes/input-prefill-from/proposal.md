# Proposal: input-prefill-from

## Why

dossiq's Opschorten form asks a pause reason and then the days the applicant is given. Each reason can carry a default
number of days (dossiq suspend-picks-a-pause-reason 4.1), and the handler should not have to type it.

## What changes

A transition input takes `prefillFrom: { input, key }`: picking a row in that other input sets this input to the row's
`key`, as text. A row without the key, and Other, leave what was typed. Additive.
