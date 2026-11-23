# Proposal: wizard-summary-skips-empty-fields

kind: fix

## Why

Ruben's pipelinq review, live check: the setup wizard's summary printed the organisation step as "Name: , KvK: , VAT: ," when nothing was filled in, which reads as broken.

## What changes

The summary of a `config-fields` step lists only the fields with a value, and says "Not set" when none have one.
