# fillMyTeamToken

Fills `{myTeam}` in a line with the reader's team name. A part in square brackets that holds `{myTeam}` is left out while there is no name; other brackets are kept as written.

## Import

```js
import { fillMyTeamToken } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function fillMyTeamToken(text: string, name: string): string
```

## Example

```js
fillMyTeamToken('{shown} cases[ · {myTeam}]', 'Team Woo') // '{shown} cases · Team Woo'
fillMyTeamToken('{shown} cases[ · {myTeam}]', '')         // '{shown} cases'
```

The name comes from [`peekMyTeamName`](./peek-my-team-name.md).
