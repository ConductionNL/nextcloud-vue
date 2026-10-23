# Proposal: record-list-endpoint-refusal

## Why

dossiq's "Andere zaken van dit huishouden" card (DqSociaalDomein) reads
`/api/cases/{id}/household-cases`. For a reader outside the social domain's
sensitive group the endpoint answers 403 with a sentence saying who may see a
household. The record list showed "This list could not be loaded" instead,
which reads as a broken page rather than as a refusal, and sends the reader to
report a bug.

## What changes

A record list that reads an `endpointSource` shows a refusal (401 or 403) in
the server's own words, run through the app's catalogue, instead of the
generic error line. A failure that is not a refusal keeps `errorText` or the
default line. The chart widget already does this.
