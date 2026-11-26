# Proposal: stats-block-entry-endpoint

## Why

A `stat` tile can read an app endpoint (`content.endpointSource`), but a
`stats-block` entry could only count OpenRegister objects: `statsBlockEntry` is
closed and has no endpoint. buildiq documents this as a gap
(`openbuild-connector-widget-runtime` 3.2 to 3.4) and asked for parity with a
per-entry mapping of one response, so a summary endpoint can feed several KPIs
in one card.

## What changes

A stats-block entry takes `endpointSource` and `valueField`. Its value is read
from the response (at the source's `responsePath`, then `valueField`); entries
naming the same endpoint share one request through the endpoint cache. An entry
needs either `register` and `schema`, or `endpointSource`. Schema 2.194.0.
