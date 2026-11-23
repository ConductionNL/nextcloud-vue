# loadMyTeam

Reads the current user's primary team once, through the source the app registered with [`registerMyTeamSource`](./register-my-team-source.md). Every caller shares the same read.

## Import

```js
import { loadMyTeam } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function loadMyTeam(): Promise<string>
```

Resolves to the team's group id, or `''` when the user has no team, when no source is registered, or when the read fails.

## Usage

```js
import { loadMyTeam } from '@conduction/nextcloud-vue'

const team = await loadMyTeam()
```
