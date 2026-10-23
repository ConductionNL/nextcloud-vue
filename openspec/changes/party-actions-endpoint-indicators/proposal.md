## Why

pipelinq drew a party's warnings (severity, period, source, "I have seen this", "Seen by ... on ...") and its tap-to-call, mail and directions links in two components of its own. The `party-actions` band could only read warnings as register objects and had no link filters.

## What changes

- `indicatorSource.url`: indicators from an app endpoint, with `toneLabels`, a `meta` line and an `ack` acknowledgement.
- Action targets `@object.<field>|tel`, `|mailto`, `|geo`, left out when the value makes no link; action labels with `{field}`.
- New internal util `contactHref`.

## Impact

No schema change. First consumer: pipelinq (PL-ABSTRACT lane PL1): PartyIndicatorPanel and ContactLinks.
