# Proposal: notice-link

## Why

On a task page dossiq says "A case is waiting on this task" with a link to the case, in a component of its own,
because CnNoticeWidget has no link.

## What changes

CnNoticeWidget takes `content.link`: `{ route, params?, label, fallbackLabel? }` or `{ href, label }`, with
`@objectId` and `@object.<field>` read from the page's record. A link whose params do not resolve is left out.

## Scope

Additive: without the new keys every component behaves as before.
