## Why

A contact's relationships point at contacts and at organisations. pipelinq drew them with its own component because an object list opens one route, resolves a reference in one schema, and creates through OpenRegister only (pipelinq also wrapped CnObjectListWidget to create contacts through its contacts-sync endpoint).

## What changes

- `rowRouteField` + `rowRouteMap` + `rowRouteIdField`: a row opens the page its field names, for the id another field holds.
- `createEndpoint`: create through an app endpoint.
- `fkResolve` cell `schemaFrom`: resolve in the schema the row names.

## Impact

No schema change. First consumer: pipelinq ContactRelationships and ContactAwareObjectListWidget.
