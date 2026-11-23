# SENTINEL_VOCABULARY

A frozen, human-readable catalog of the sentinel-token vocabulary: for each
context, its owning resolver, a description, and its member grammar. This is the
**documentation-facing** source (it feeds schema-generated docs); the
machine-checkable truth lives in the token pattern set the resolver enforces.

## Shape

```js
import { SENTINEL_VOCABULARY } from '@conduction/nextcloud-vue'

// Readonly<Record<string, { resolver: string, description: string, members: string[] }>>
SENTINEL_VOCABULARY.route // → { resolver: 'resolveRouteSentinels', description: …, members: ['@route.<param>'] }
```

Each key is a context (`filter`, `config`, `object`, `workspace`, `route`,
`declarative`); each value describes the resolver that owns it, what the context
is for, and the member token grammar. The object is `Object.freeze`d — treat it
as read-only.

## The filter context

`@me`, `@me.displayName`, `@me.email`, `@myGroups`, `@myTeam`, `@now`, `@today`,
`@today±Nd`, `@monthStart`, `@monthEnd`, `@nextMonthStart`, `@quarterStart` and
`@yearStart`.

The day count of `@today±Nd` may be an app setting: `@today-{@config.lead_stale_threshold_days}d`
fills the value from the app config first, and stays as written while the config
does not hold the key.

`@monthEnd` is the last day of the current month. Use it with `lte` on a date
field. On a date-time field `lte` stops at midnight of that day, so write
`lt: "@nextMonthStart"` there: "closes this month" is
`{ "expectedCloseDate": { "gte": "@monthStart", "lt": "@nextMonthStart" } }`.

`@myGroups` resolves to an array: the ids of the Nextcloud groups the current
user is in, so `{ "assignedGroup": "@myGroups" }` becomes an IN filter. Inside
an IN list (`["@myGroups", "archive"]`) the ids are spread in place. The groups
come from [`peekCurrentUserGroups`](./peek-current-user-groups.md): while they
load, and when the user is in no group, the token stays unresolved and the
caller waits instead of sending an empty list.

`@myTeam` resolves to one group id: the current user's primary team, as the app
answers it through `registerMyTeamSource(() => Promise<groupId|null>)`. While it
is read the token stays unresolved (the caller waits); for a user in no team, or
an app that registers no source, it becomes the optional `@myTeam?` and the
caller drops the key, so a "my team" view shows no team filter rather than all
of the user's groups. A saved view's filters are resolved when it is applied.

## See also

- [`SENTINEL_RESOLVERS`](./sentinel-resolvers.md) — the compact context → resolver map.
- [`classifyToken`](./classify-token.md) — classifies a token against this vocabulary.
- [`SENTINEL_DEPRECATIONS`](./sentinel-deprecations.md) — the companion deprecation map.
