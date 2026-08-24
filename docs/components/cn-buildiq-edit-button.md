# CnBuildiqEditButton

The universal in-app **edit entry point** (ADR-041). A Conduction-orange icon
button bearing the Buildiq glyph, designed to sit immediately to the right of a
page's refresh control. It renders **nothing** unless `available` is true, and is
deliberately Buildiq-agnostic — it never imports Buildiq app code and never
calls `useAppStatus`; availability is passed in (wire it from
[`useBuildiqEditAvailability`](../utilities/composables/use-buildiq-edit-availability.md)).

Its action menu drives a shared [`useManifestEditor`](../utilities/composables/use-manifest-editor.md)
instance: **Edit page ⇄ Save page**, **Add widget…** (disabled unless editing),
**Edit menu…**, **Edit sidebar…**. Save emits `@save(delta)` with the minimal
manifest delta (via `diffManifest`).

:::note Renamed in the 2026-08-21 fleet rename
The app formerly called OpenBuild is now **Buildiq**, so this component was
renamed from `CnOpenBuildEditButton`. The old name is still exported as a
**deprecated alias** of the same implementation, so existing imports keep
working — migrate to `CnBuildiqEditButton` at your convenience.

The `openbuildEditable` manifest key and the `cnOpenBuildAvailable` provide/inject
key are **unchanged**: they are data and runtime contracts that shipped manifests
and consuming apps already carry.
:::

## Import

```js
import { CnBuildiqEditButton } from '@conduction/nextcloud-vue'
```

## Usage

```vue
<CnBuildiqEditButton
  :available="available"
  :editor="editor"
  :page-id="currentPageId"
  @save="onSaveDelta" />
```

```js
import { useBuildiqEditAvailability, useManifestEditor } from '@conduction/nextcloud-vue'
const { available } = useBuildiqEditAvailability()
const editor = useManifestEditor(manifestRef, { persist: persistDelta })
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `available` | `Boolean` | `false` | Whether Buildiq is available to this user. When falsey the component renders nothing. Wire from `useBuildiqEditAvailability()`. |
| `editor` | `Object` | `null` | The shared `useManifestEditor` instance (`{ editing, working, dirty, enter, cancel, save }`). Falls back to the injected `cnManifestEditor`. |
| `pageId` | `String` | `''` | The active page's id, forwarded to `CnEditSidebarModal` so it edits the right page's sidebar config. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `save` | `delta: object` | Emitted after a successful save with the minimal delta. |
| `edit` | — | Emitted when edit mode is entered. |
| `cancel` | — | Emitted when edits are discarded. |
| `add-widget` | — | Emitted when "Add widget…" is activated in edit mode (wired to `CnAddWidgetModal` by the `cn-widget-library` change). |
| `edit-menu` | — | Emitted when the menu editor opens. |
| `edit-sidebar` | — | Emitted when the sidebar editor opens. |
| `edit-flows` | — | Emitted when the flow editor ("Edit flows…") opens. Opens [`CnFlowEditModal`](./cn-flow-edit-modal.md) on OpenRegister's flow store. |

## Related

- [`useManifestEditor`](../utilities/composables/use-manifest-editor.md)
- [`useBuildiqEditAvailability`](../utilities/composables/use-buildiq-edit-availability.md)
- [CnEditMenuModal](./cn-edit-menu-modal.md) · [CnEditSidebarModal](./cn-edit-sidebar-modal.md)
