# openDuplicateWarning

Open [CnDuplicateWarning](../components/cn-duplicate-warning.md) from code, such as a create override, and wait for the user's answer. It mounts the warning on the page and removes it again once the user decides.

## Import

```js
import { openDuplicateWarning } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function openDuplicateWarning(props: object): Promise<{ reason: string, over: string[] } | null>
```

`props` are CnDuplicateWarning's props (`matches`, `records`, `policy`, `mayOverride`, `recordUrl`, ...). It resolves with `{ reason, over }` when the user files anyway, and `null` when they cancel.

```js
const decision = await openDuplicateWarning({ matches, records, policy, mayOverride, recordUrl: '/apps/dossiq/cases/{uuid}' })
if (decision === null) {
    throw new Error('cancelled')
}
payload.duplicateOverrideReason = decision.reason
payload.duplicateOverrideOf = decision.over
```

Mounted as its own app, it has no host translate: texts given as props show as given.
