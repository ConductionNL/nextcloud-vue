# useOpenBuildEditAvailability

`useOpenBuildEditAvailability()` returns a reactive "may this user edit via
OpenBuild?" signal (ADR-041). Gating is deliberately simple: the OpenBuild edit
button shows whenever the OpenBuild app is enabled and reachable for the current
user. It derives that from `useAppStatus('openbuild').enabled`, which reads
`OC.appswebroots` — a map Nextcloud populates only with apps the current user may
access, so app group-restrictions are honoured for free. **No** per-user role or
permission HTTP request is made.

## Import

```js
import { useOpenBuildEditAvailability } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function useOpenBuildEditAvailability(): { available: Ref<boolean> }
```

## Example

```vue
<CnOpenBuildEditButton :available="available" :editor="editor" />
```

```js
const { available } = useOpenBuildEditAvailability()
// available.value === true when OC.appswebroots.openbuild is present
```

## Related

- [CnOpenBuildEditButton](../../components/cn-open-build-edit-button.md)
- `useAppStatus`
