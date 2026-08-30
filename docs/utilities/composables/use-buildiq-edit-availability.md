# useBuildiqEditAvailability

`useBuildiqEditAvailability()` returns a reactive "may this user edit via
Buildiq?" signal (ADR-041). Gating is deliberately simple: the Buildiq edit
button shows whenever the Buildiq app is enabled and reachable for the current
user. It derives that from `useAppStatus(...).enabled`, which reads
`OC.appswebroots`, a map Nextcloud populates only with apps the current user may
access, so app group-restrictions are honoured for free. **No** per-user role or
permission HTTP request is made.

:::warning The lookup checks two app ids
`OC.appswebroots` is keyed by the Nextcloud app id, and Buildiq's id moved from
`openbuild` to `buildiq`. The composable checks `buildiq` first and falls back to
`openbuild`, so the button works on installs that have taken the rename and on
those still serving the old id.

Get this key wrong and nothing tells you. The map simply has no such entry,
`available` stays false, and the button renders nothing: no error, no failed
request, no warning. That is how it disappeared from every host app at once
after the rename. If the button is missing on an install where Buildiq is
plainly enabled, check the app id in `appinfo/info.xml` against the key this
composable asks for before looking anywhere else.
:::

:::note Renamed in the 2026-08-21 fleet rename
The app formerly called OpenBuild is now **Buildiq**, so this composable was
renamed from `useOpenBuildEditAvailability`. The old name is still exported as a
**deprecated alias** of the same function, so existing imports keep working.
Migrate to `useBuildiqEditAvailability` at your convenience.
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
// available.value === true when OC.appswebroots.buildiq (or .openbuild) is present
```

## Related

- [CnBuildiqEditButton](../../components/cn-buildiq-edit-button.md)
- `useAppStatus`
