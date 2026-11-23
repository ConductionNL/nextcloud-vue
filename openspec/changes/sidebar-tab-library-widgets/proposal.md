## Why

A declared sidebar tab could hold the four built-ins and an app's own components only. An app that wanted the knowledge base (the `xwiki` integration's tab) or a library widget such as `kb-search` in a tab had to wrap it in a component of its own. pipelinq carried a 223-line xWiki sidebar tab with its own store and proxy for that reason.

## What changes

- A declared tab's widget `{ "type": "integration", "integrationId": "xwiki" }` renders that integration's tab for the object, or nothing when the integration is not registered.
- A widget whose `type` is a library widget type (`kb-search`, `facts`, ...) renders that widget with its `content`, the object id and the object. Built-ins, the app registry and custom components still win.

## Impact

No schema change. First consumer: pipelinq (PL-ABSTRACT lane PL1, xWiki on OpenRegister's integration).
