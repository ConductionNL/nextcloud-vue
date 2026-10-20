# Proposal: object-list-endpoint-source

## Why

dossiq's AI-toezicht tab lists hermiq's AI oversight records of one case. hermiq#1172 makes those records readable only
through the case: `/apps/hermiq/api/ai-oversight/subject?originApp=dossiq&subjectId=…`, no longer through the
OpenRegister list the tab used. An `object-list` could only read OpenRegister.

## What changes

`object-list` takes `content.endpointSource` (`{ url, method?, params?, responsePath? }`), the same block the
endpoint-bound widgets (stat, chart, object-table) take, read through the shared `fetchEndpointSource`: tokens in the url
and params resolve as in `filter` (`@objectId`), a required token not yet set waits, and a page refresh re-reads. The
payload at `responsePath` is the row list, or `{ results, total }`. With an endpoint the list does not ask OpenRegister.

## Scope

Additive. Without `endpointSource` the list reads OpenRegister as before.
