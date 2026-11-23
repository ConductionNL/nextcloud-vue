## Why

A detail page hands an app's own widget `objectId`, `objectData` and `content`, and nothing else. An app whose component takes other props (`entityId`, `entityType`, `ticketId`) wrapped it in a factory that maps the page onto them. pipelinq's `sectionWidget.js` did that for fourteen widgets, so the mapping lived in code instead of in the manifest.

## What changes

A widget whose type is an app registry entry takes `props` from its definition: literals and `@objectId` / `@object.<field>` / `@config.<key>` / `@content.<path>` tokens. Only declared props pass; an unresolved token is left out; a widget asking for `@objectId` waits for one. The titled card stays the registry entry's `chrome: "card"`.

## Impact

No schema change (`props` was already allowed on a widget). First consumer: pipelinq, which drops `sectionWidget.js` once its lanes move their entries.
