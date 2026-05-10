# buildCountQuery

Builds the `{ <schemaSlug>(filter: …) { totalCount } }` GraphQL query used by `useDataSource`'s shorthand. See [`useDataSource`](./composables/use-data-source.md#helpers).

```js
import { buildCountQuery } from '@conduction/nextcloud-vue'

buildCountQuery('meeting', { lifecycle: 'review' })
// '{ meeting(filter: {lifecycle: "review"}) { totalCount } }'
```
