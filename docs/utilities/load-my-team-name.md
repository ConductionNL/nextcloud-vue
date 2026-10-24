# loadMyTeamName

Reads the reader's team name once, through the loader registered with [`registerMyTeamNameSource`](./register-my-team-name-source.md). Every caller shares the same read.

## Import

```js
import { loadMyTeamName } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function loadMyTeamName(): Promise<string>
```

Resolves to the name, or `''` without a team, without a registered loader, or when the read fails.
