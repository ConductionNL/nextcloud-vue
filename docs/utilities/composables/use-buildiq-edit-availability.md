# useBuildiqEditAvailability

`useBuildiqEditAvailability()` returns a reactive "may this user edit via
Buildiq?" signal (ADR-041). Gating is deliberately simple: the Buildiq edit
button shows whenever the Buildiq app is enabled and reachable for the current
user. It derives that from `useAppStatus('openbuild').enabled`, which reads
`OC.appswebroots` — a map Nextcloud populates only with apps the current user may
access, so app group-restrictions are honoured for free. **No** per-user role or
permission HTTP request is made.

:::note Renamed in the 2026-08-21 fleet rename
The app formerly called OpenBuild is now **Buildiq**, so this composable was
renamed from `useOpenBuildEditAvailability`. The old name is still exported as a
**deprecated alias** of the same function, so existing imports keep working —
migrate to `useBuildiqEditAvailability` at your convenience. The `openbuild`
**app id** the lookup uses is unchanged.
:::

## Import

```js
import { useBuildiqEditAvailability } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function useBuildiqEditAvailability(): { available: Ref<boolean> }
```

## Example

```vue
<CnBuildiqEditButton :available="available" :editor="editor" />
```

```js
const { available } = useBuildiqEditAvailability()
// available.value === true when OC.appswebroots.openbuild is present
```

## Related

- [CnBuildiqEditButton](../../components/cn-buildiq-edit-button.md)
- `useAppStatus`
