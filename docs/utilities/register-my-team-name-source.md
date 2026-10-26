# registerMyTeamNameSource

Registers where the reader's team **name** is read: a function that resolves to the team's display name, or `null`/`''` for a reader in no team. It sits beside [`registerMyTeamSource`](./register-my-team-source.md), which registers the team's id. Registering again, or passing `null`, clears the name already read.

## Import

```js
import { registerMyTeamNameSource } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function registerMyTeamNameSource(loader: (() => Promise<string | null>) | null): void
```

The board count line fills `{myTeam}` with this name (DqWerkbord). See [`loadMyTeamName`](./load-my-team-name.md), [`peekMyTeamName`](./peek-my-team-name.md) and [`fillMyTeamToken`](./fill-my-team-token.md).
