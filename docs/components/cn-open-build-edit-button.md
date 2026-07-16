# CnOpenBuildEditButton

The universal in-app **edit entry point** (ADR-041). A Conduction-orange icon
button bearing the OpenBuild glyph, designed to sit immediately to the right of a
page's refresh control. It renders **nothing** unless `available` is true, and is
deliberately OpenBuild-agnostic — it never imports OpenBuild app code and never
calls `useAppStatus`; availability is passed in (wire it from
[`useOpenBuildEditAvailability`](../utilities/composables/use-open-build-edit-availability.md)).

Its action menu drives a shared [`useManifestEditor`](../utilities/composables/use-manifest-editor.md)
instance: **Edit page ⇄ Save page**, **Add widget…** (disabled unless editing),
**Edit menu…**, **Edit sidebar…**. Save emits `@save(delta)` with the minimal
manifest delta (via `diffManifest`).

## Import

```js
import { CnOpenBuildEditButton } from '@conduction/nextcloud-vue'
```

## Usage

```vue
<CnOpenBuildEditButton
  :available="available"
  :editor="editor"
  :page-id="currentPageId"
  @save="onSaveDelta" />
```

```js
import { useOpenBuildEditAvailability, useManifestEditor } from '@conduction/nextcloud-vue'
const { available } = useOpenBuildEditAvailability()
const editor = useManifestEditor(manifestRef, { persist: persistDelta })
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `available` | `Boolean` | `false` | Whether OpenBuild is available to this user. When falsey the component renders nothing. Wire from `useOpenBuildEditAvailability()`. |
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
| `edit-flows` | — | Emitted when the flows editor ("Edit flows…") opens. Edits a schema's `x-openregister-flows` via `CnEditFlowsModal`. |

## Related

- [`useManifestEditor`](../utilities/composables/use-manifest-editor.md)
- [`useOpenBuildEditAvailability`](../utilities/composables/use-open-build-edit-availability.md)
- [CnEditMenuModal](./cn-edit-menu-modal.md) · [CnEditSidebarModal](./cn-edit-sidebar-modal.md)
