# peekMyTeamName

A synchronous, reactive read of the reader's team name, for a computed property or a template. It starts the read through [`loadMyTeamName`](./load-my-team-name.md) on first use.

## Import

```js
import { peekMyTeamName } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function peekMyTeamName(): string | null
```

Returns the name, `''` for no team, or `null` while the name is being read.
