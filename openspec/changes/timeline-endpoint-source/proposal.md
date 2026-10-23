## Why

pipelinq's activity timeline reads `/api/timeline`, which merges contact moments, tasks, mail and calendar per record, with type filter buttons and Load more. CnTimelineWidget merged only OpenRegister sources.

## What changes

`endpointSource` reads an app endpoint a page at a time (label, detail, type and author per item); `typeChips` filter it on the server.

## Impact

No schema change. First consumer: pipelinq ActivityTimeline (PL-ABSTRACT lane PL1).
