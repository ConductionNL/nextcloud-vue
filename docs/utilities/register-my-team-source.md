# registerMyTeamSource

Names where the current user's primary team is read, for the `@myTeam` filter token. A team is the app's own notion: Nextcloud knows which groups a user is in, and only the app knows which of them is the user's team. The library reads the team once per page, through the loader the app registers here.

## Import

```js
import { registerMyTeamSource } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function registerMyTeamSource(loader: (() => Promise<string | null>) | null): void
```

| Name | Type | Description |
|------|------|-------------|
| `loader` | `function \| null` | Answers the team's Nextcloud group id, or `null` / `''` for a user in no team. `null` unregisters the source. |

Registering a source forgets a team read earlier, so the next [`loadMyTeam`](./load-my-team.md) reads again.

## Usage

```js
import { registerMyTeamSource } from '@conduction/nextcloud-vue'

registerMyTeamSource(async () => {
	const { data } = await axios.get(generateUrl('/apps/myapp/api/me/team'))
	return data.team || ''
})
```

A saved view filter can then name `@myTeam`, resolved at fetch time like `@me` and `@myGroups`.
