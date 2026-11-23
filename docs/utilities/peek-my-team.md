# peekMyTeam

The current user's primary team, read synchronously and reactively: the group id, `''` for no team, or `null` while it is still being read. The first call starts the read through [`loadMyTeam`](./load-my-team.md).

## Import

```js
import { peekMyTeam } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function peekMyTeam(): string | null
```

## Usage

```js
import { peekMyTeam } from '@conduction/nextcloud-vue'

const team = peekMyTeam()
if (team === null) {
	// still loading; a computed that calls peekMyTeam() re-runs when it lands
}
```

The filter token resolver uses it to fill `@myTeam`.
